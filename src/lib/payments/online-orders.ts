import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { logOrderEvent } from "@/lib/order-events";
import { notifyOrderPlaced } from "@/lib/order-notify";
import { isValidStatus, queryTransaction, validatePayment } from "./sslcommerz";

/**
 * Lifecycle of an online (SSLCommerz) order:
 *
 *   pending_payment ──validated──▶ paid       (notifications sent here)
 *         │
 *         └──fail / cancel / timeout──▶ cancelled (stock + coupon given back)
 *
 * Every transition is a conditional UPDATE on status = 'pending_payment', so
 * the browser callback and the IPN racing each other — or a callback replayed
 * — can move the order at most once and send at most one confirmation.
 */

export const UNPAID_ORDER_TTL_MIN = 60;

type Order = typeof schema.orders.$inferSelect;

/** Give the stock and the coupon use back, and cancel. No-op unless still pending_payment. */
export async function releaseUnpaidOrder(orderId: string, reason: string): Promise<boolean> {
  const released = await db.transaction(async (tx) => {
    const [o] = await tx.update(schema.orders)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(and(eq(schema.orders.id, orderId), eq(schema.orders.status, "pending_payment")))
      .returning();
    if (!o) return null;

    const lines = await tx.select().from(schema.orderLines).where(eq(schema.orderLines.orderId, orderId));
    for (const l of lines) {
      if (!l.productId) continue;
      await tx.update(schema.products)
        .set({ stock: sql`${schema.products.stock} + ${l.qty}` })
        .where(eq(schema.products.id, l.productId));
      await tx.insert(schema.inventoryLog).values({
        productId: l.productId,
        delta: l.qty,
        reason: "payment_not_completed",
        referenceId: orderId,
      });
    }

    if (o.couponCode) {
      const removed = await tx.delete(schema.couponRedemptions)
        .where(eq(schema.couponRedemptions.orderId, orderId))
        .returning({ couponId: schema.couponRedemptions.couponId });
      for (const r of removed) {
        await tx.update(schema.coupons)
          .set({ usedCount: sql`greatest(${schema.coupons.usedCount} - 1, 0)` })
          .where(eq(schema.coupons.id, r.couponId));
      }
    }
    return o;
  });
  if (!released) return false;
  await logOrderEvent({
    orderId,
    type: "status_changed",
    payload: { from: "pending_payment", to: "cancelled", reason },
    actor: null,
  });
  return true;
}

/**
 * Release an unpaid order only after SSLCommerz confirms it holds no valid
 * payment for it; if it does, settle it instead. When the gateway cannot be
 * asked, nothing is released (the next attempt or the timeout retries).
 */
export async function releaseIfUnpaid(order: Pick<Order, "id" | "number">, reason: string): Promise<"released" | "paid" | "kept"> {
  const q = await queryTransaction(order.number);
  if (!q) return "kept";
  if (q.validValId) {
    const r = await settleOnlinePayment(q.validValId, order.number);
    return r.outcome === "paid" || r.outcome === "already_paid" ? "paid" : "kept";
  }
  return (await releaseUnpaidOrder(order.id, reason)) ? "released" : "kept";
}

/** Cancel online orders whose payment page was abandoned. */
export async function expireStaleUnpaidOrders(): Promise<number> {
  const cutoff = new Date(Date.now() - UNPAID_ORDER_TTL_MIN * 60 * 1000);
  const stale = await db.select({ id: schema.orders.id, number: schema.orders.number }).from(schema.orders)
    .where(and(
      eq(schema.orders.status, "pending_payment"),
      sql`${schema.orders.createdAt} < ${cutoff.toISOString()}::timestamptz`,
    ))
    .limit(50);
  let n = 0;
  for (const s of stale) if ((await releaseIfUnpaid(s, "payment_timeout")) === "released") n++;
  return n;
}

export type SettleResult =
  | { outcome: "paid" | "already_paid"; order: Order }
  | { outcome: "rejected"; order: Order | null; reason: string }
  | { outcome: "unverified"; order: Order | null };

/**
 * Confirm a payment from a callback or IPN. Only the val_id is taken from the
 * request; amount, currency and transaction id come from SSLCommerz's
 * Validation API and must match the stored order.
 */
export async function settleOnlinePayment(valId: string, tranIdFromCallback: string): Promise<SettleResult> {
  const v = await validatePayment(valId);
  const tranId = v?.tranId || tranIdFromCallback;
  const [order] = tranId
    ? await db.select().from(schema.orders).where(eq(schema.orders.number, tranId)).limit(1)
    : [];
  if (!v) return { outcome: "unverified", order: order ?? null };
  if (!order) return { outcome: "rejected", order: null, reason: "unknown_transaction" };
  if (order.paymentMethod !== "sslcommerz") return { outcome: "rejected", order, reason: "not_an_online_order" };
  if (!isValidStatus(v.status)) return { outcome: "rejected", order, reason: `gateway_status_${v.status || "unknown"}` };
  if (v.currency !== "BDT" || !(Math.abs(v.amount - order.totalBdt) < 0.01)) {
    await logOrderEvent({
      orderId: order.id,
      type: "note_added",
      payload: { note: "SSLCommerz amount/currency did not match the order — not marked paid", amount: v.amount, currency: v.currency, valId: v.valId },
      actor: null,
    });
    return { outcome: "rejected", order, reason: "amount_mismatch" };
  }

  const ref = [v.valId, v.bankTranId].filter(Boolean).join(" / ");
  const [paid] = await db.update(schema.orders)
    .set({ status: "paid", paymentRef: ref, updatedAt: new Date() })
    .where(and(eq(schema.orders.id, order.id), eq(schema.orders.status, "pending_payment")))
    .returning();

  if (!paid) {
    // Already settled by the other path (callback vs IPN) — or the order was
    // cancelled (timeout) before the money arrived. The latter needs a person.
    if (order.status === "paid") return { outcome: "already_paid", order };
    await logOrderEvent({
      orderId: order.id,
      type: "payment_received",
      payload: { gateway: "sslcommerz", ref, amount: v.amount, note: `Payment validated while order was '${order.status}' — refund or fulfil manually` },
      actor: null,
    });
    return { outcome: "rejected", order, reason: `order_${order.status}` };
  }

  await logOrderEvent({
    orderId: order.id,
    type: "payment_received",
    payload: { gateway: "sslcommerz", ref, amount: v.amount, cardType: v.cardType, riskLevel: v.riskLevel, riskTitle: v.riskTitle },
    actor: null,
  });
  if (v.riskLevel === "1") {
    // SSLCommerz marks some card payments as risky and advises holding them.
    await logOrderEvent({
      orderId: order.id,
      type: "note_added",
      payload: { note: `SSLCommerz flagged this payment as risky (${v.riskTitle ?? "no reason given"}). Verify with the customer before shipping.` },
      actor: null,
    });
  }
  await notifyOrderPlaced(order.id);
  return { outcome: "paid", order: paid };
}
