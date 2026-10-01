import { and, asc, desc, eq, isNotNull } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { applyOrderStatus } from "@/lib/order-status";
import { logOrderEvent } from "@/lib/order-events";
import { captureError } from "@/lib/monitoring";
import { getSteadfastStatus } from "./steadfast";
import { getPathaoOrderStatus } from "./pathao";

/**
 * Courier status sync. Asks Steadfast / Pathao about every `shipped` order.
 *
 *  - delivered → the order moves to `delivered` through applyOrderStatus, so
 *    the return window starts and the review request goes out, exactly as if
 *    an admin had set it.
 *  - returned / failed / cancelled / on hold / partial → the order is NOT
 *    changed. Cancelling restocks, and the parcel is not back on the shelf
 *    yet; an admin confirms once it is. These are listed for attention.
 *  - anything else is still on its way.
 *
 * Every new courier status is written to the order's timeline once.
 */

export type CourierOutcome = "delivered" | "attention" | "in_transit";

// Statuses are compared lowercased with spaces/dashes as underscores, so
// "Delivery Failed", "Delivery_Failed" and "delivery-failed" all match.
const norm = (s: string) => s.trim().toLowerCase().replace(/[\s-]+/g, "_");

const DELIVERED = new Set(["delivered"]);
const ATTENTION = new Set([
  // Steadfast
  "cancelled", "hold", "partial_delivered", "unknown",
  // Pathao
  "return", "returned", "paid_return", "delivery_failed", "pickup_failed",
  "pickup_cancelled", "on_hold", "partial_delivery", "exchange",
]);

/**
 * Steadfast's "*_approval_pending" statuses mean the rider has reported an
 * outcome the courier has not confirmed; they count as still in transit until
 * confirmed, so a disputed delivery never starts the return window.
 */
export function classifyCourierStatus(raw: string): CourierOutcome {
  const s = norm(raw);
  if (DELIVERED.has(s)) return "delivered";
  if (ATTENTION.has(s)) return "attention";
  return "in_transit";
}

export type SyncSummary = {
  checked: number;
  delivered: string[];                                         // order numbers moved to delivered
  attention: { number: string; courier: string; status: string }[];
  errors: { number: string; error: string }[];
  notConfigured: string[];                                     // couriers with no credentials
};

// One shop's shipped orders at a time; the cap keeps a run inside the
// function's time limit, and the oldest go first so none are starved.
const MAX_PER_RUN = 150;
const CONCURRENCY = 5;

async function readStatus(courier: string, tracking: string): Promise<string> {
  if (courier === "steadfast") return getSteadfastStatus(tracking);
  if (courier === "pathao") return getPathaoOrderStatus(tracking);
  throw new Error(`Unknown courier "${courier}"`);
}

/** Last courier status already written to this order's timeline. */
async function lastLoggedStatus(orderId: string): Promise<string | null> {
  const events = await db.select({ payload: schema.orderEvents.payload })
    .from(schema.orderEvents)
    .where(and(eq(schema.orderEvents.orderId, orderId), eq(schema.orderEvents.type, "courier_status")))
    .orderBy(desc(schema.orderEvents.createdAt))
    .limit(1);
  return (events[0]?.payload as { status?: string } | undefined)?.status ?? null;
}

export async function syncCourierStatuses(): Promise<SyncSummary> {
  const orders = await db.select({
    id: schema.orders.id,
    number: schema.orders.number,
    courier: schema.orders.shippingCourier,
    tracking: schema.orders.shippingTracking,
  })
    .from(schema.orders)
    .where(and(
      eq(schema.orders.status, "shipped"),
      isNotNull(schema.orders.shippingCourier),
      isNotNull(schema.orders.shippingTracking),
    ))
    .orderBy(asc(schema.orders.createdAt))
    .limit(MAX_PER_RUN);

  const summary: SyncSummary = { checked: 0, delivered: [], attention: [], errors: [], notConfigured: [] };
  const unconfigured = new Set<string>();

  const work = async (o: typeof orders[number]) => {
    const courier = o.courier ?? "";
    const tracking = (o.tracking ?? "").trim();
    if (!tracking || unconfigured.has(courier)) return;

    let raw: string;
    try {
      raw = await readStatus(courier, tracking);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/not configured/i.test(msg)) {
        unconfigured.add(courier);
        return;
      }
      summary.errors.push({ number: o.number, error: msg.slice(0, 200) });
      captureError(e, { where: "courier-sync", order: o.number, courier });
      return;
    }
    summary.checked++;

    const outcome = classifyCourierStatus(raw);
    if (norm(raw) !== norm((await lastLoggedStatus(o.id)) ?? "")) {
      await logOrderEvent({
        orderId: o.id,
        type: "courier_status",
        payload: { courier, status: raw, outcome },
        actor: null,
      });
    }

    if (outcome === "delivered") {
      const r = await applyOrderStatus(o.id, "delivered", {
        onlyFrom: "shipped",
        eventPayload: { source: "courier", courier, courierStatus: raw },
        actor: null,
      });
      if (r.changed) summary.delivered.push(o.number);
    } else if (outcome === "attention") {
      summary.attention.push({ number: o.number, courier, status: raw });
    }
  };

  // Small fixed pool: a few requests in flight, never one per order at once.
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, orders.length) }, async () => {
      while (next < orders.length) await work(orders[next++]);
    }),
  );

  summary.notConfigured = [...unconfigured];
  return summary;
}
