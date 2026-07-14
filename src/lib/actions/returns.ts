"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { eq, and, or, inArray, desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/auth-utils";
import { getCommerceSettings } from "@/lib/commerce";
import { logOrderEvent } from "@/lib/order-events";

const returnSchema = z.object({
  orderId: z.string().uuid(),
  reason: z.string().min(1).max(500),
});

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The order's effective return window: the most generous per-product override
 * among its lines, falling back to the global commerce default (7 days).
 * Anchored to the DELIVERED event, not order creation — a slow courier must
 * not eat the customer's window.
 */
async function orderReturnWindow(orderId: string): Promise<number> {
  const commerce = await getCommerceSettings();
  const lines = await db
    .select({ productId: schema.orderLines.productId })
    .from(schema.orderLines)
    .where(eq(schema.orderLines.orderId, orderId))
    .catch(() => []);
  const productIds = lines.map((l) => l.productId).filter((id): id is string => !!id);
  if (productIds.length === 0) return commerce.returnWindowDays;
  const prods = await db
    .select({ returnWindowDays: schema.products.returnWindowDays })
    .from(schema.products)
    .where(inArray(schema.products.id, productIds))
    .catch(() => []);
  if (prods.length === 0) return commerce.returnWindowDays;
  // Each line's effective window is its own override ?? global; the order
  // takes the most generous line. Seeding the max with the global default
  // made short overrides (returnWindowDays = 0 → final sale) unenforceable —
  // the PDP advertised "0-day returns" while the server accepted 7.
  const windows = prods.map((p) => p.returnWindowDays ?? commerce.returnWindowDays);
  return Math.max(...windows);
}

/** Timestamp the order became `delivered`, from the order-events timeline. */
async function deliveredAt(orderId: string): Promise<Date | null> {
  const events = await db
    .select()
    .from(schema.orderEvents)
    .where(and(eq(schema.orderEvents.orderId, orderId), eq(schema.orderEvents.type, "status_changed")))
    .orderBy(desc(schema.orderEvents.createdAt))
    .catch(() => []);
  const hit = events.find((e) => (e.payload as { to?: string } | null)?.to === "delivered");
  return hit?.createdAt ?? null;
}

export async function requestReturn(input: z.infer<typeof returnSchema>) {
  const user = await requireUser();
  const data = returnSchema.parse(input);

  const [order] = await db
    .select()
    .from(schema.orders)
    .where(
      and(
        eq(schema.orders.id, data.orderId),
        or(
          eq(schema.orders.guestEmail, user.email ?? ""),
          eq(schema.orders.customerId, user.id as unknown as string),
        ),
      ),
    );

  if (!order) return { ok: false as const, error: "Order not found." };
  if (order.status !== "delivered")
    return { ok: false as const, error: "Only delivered orders can be returned." };

  const windowDays = await orderReturnWindow(order.id);
  const anchor = (await deliveredAt(order.id)) ?? order.updatedAt ?? order.createdAt;
  const ageMs = Date.now() - (anchor?.getTime() ?? 0);
  if (ageMs > windowDays * DAY_MS)
    return { ok: false as const, error: `The ${windowDays}-day return window has closed for this order.` };

  // The reason goes on the order-events timeline — it must NOT overwrite
  // orders.notes, which holds the customer's delivery instructions.
  await db
    .update(schema.orders)
    .set({ status: "return_requested", updatedAt: new Date() })
    .where(eq(schema.orders.id, data.orderId));
  await logOrderEvent({
    orderId: order.id,
    type: "status_changed",
    payload: { to: "return_requested", reason: data.reason, by: "customer" },
    actor: null,
  }).catch(() => {});

  revalidatePath("/[locale]/account", "page");
  return { ok: true as const };
}
