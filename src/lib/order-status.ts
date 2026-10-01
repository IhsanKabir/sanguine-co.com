import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { parseShippingAddress } from "@/lib/schema";
import { SITE_URL } from "@/lib/site-url";
import { sendEmail } from "@/lib/email/brevo";
import { reviewRequestEmail } from "@/lib/email/templates";
import { logOrderEvent } from "@/lib/order-events";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * The one place an order changes status, with its side effects:
 *  - into `cancelled`: stock goes back (storefront orders only);
 *  - into `delivered`: the review-request email goes out, and the event
 *    logged here is what starts the return window (returns.ts reads it).
 *
 * Called by the admin status dropdown, the bulk action and the courier sync,
 * so an order marked delivered by the courier behaves exactly like one marked
 * by hand. Not a server action: auth is the caller's job.
 */

export const ORDER_STATUSES = [
  "pending", "pending_payment", "cod_pending", "paid", "processing", "shipped",
  "delivered", "cancelled", "refunded", "return_requested", "returned",
] as const;
export type OrderStatus = typeof ORDER_STATUSES[number];

export type StatusChange =
  | { changed: true; from: string }
  | { changed: false; reason: "not_found" | "same_status" | "moved_on" };

export async function applyOrderStatus(
  orderId: string,
  status: OrderStatus,
  opts: {
    /** Only change the order if it is still in this status (the courier sync passes "shipped"). */
    onlyFrom?: string;
    /** Extra fields for the status_changed event, e.g. { source: "courier" }. */
    eventPayload?: Record<string, unknown>;
    /** null for system changes (cron); omitted = the signed-in admin. */
    actor?: { id: string; email?: string | null } | null;
    bulk?: boolean;
  } = {},
): Promise<StatusChange> {
  const [before] = await db.select({ status: schema.orders.status, number: schema.orders.number })
    .from(schema.orders).where(eq(schema.orders.id, orderId));
  if (!before) return { changed: false, reason: "not_found" };
  if (before.status === status) return { changed: false, reason: "same_status" };
  if (opts.onlyFrom && before.status !== opts.onlyFrom) return { changed: false, reason: "moved_on" };

  // Conditional on the status we just read, so two writers (an admin and the
  // courier sync) can't both apply side effects for the same transition.
  const updated = await db.update(schema.orders).set({ status })
    .where(and(eq(schema.orders.id, orderId), eq(schema.orders.status, before.status)))
    .returning({ id: schema.orders.id });
  if (updated.length === 0) return { changed: false, reason: "moved_on" };

  await logOrderEvent({
    orderId,
    type: "status_changed",
    payload: { from: before.status, to: status, ...(opts.bulk ? { bulk: true } : {}), ...opts.eventPayload },
    ...(opts.actor !== undefined ? { actor: opts.actor } : {}),
  });

  // Cancelled storefront orders give their stock back (COD cancellations are
  // routine in Bangladesh — without this every cancellation silently shrank
  // inventory). Guards: only on the FIRST transition into cancelled, and only
  // for orders that decremented stock at creation — converted preorders
  // (SSG-PO-) and manual orders (SSG-MX-) never did, so restoring for them
  // would inflate inventory.
  const decrementedAtCreation =
    !before.number.startsWith("SSG-PO-") && !before.number.startsWith("SSG-MX-");
  if (
    status === "cancelled" &&
    !["cancelled", "refunded", "returned"].includes(before.status) &&
    decrementedAtCreation
  ) {
    const lines = await db.select({ productId: schema.orderLines.productId, qty: schema.orderLines.qty })
      .from(schema.orderLines).where(eq(schema.orderLines.orderId, orderId));
    for (const l of lines) {
      if (!l.productId) continue;
      await db.update(schema.products)
        .set({ stock: sql`${schema.products.stock} + ${l.qty}` })
        .where(eq(schema.products.id, l.productId));
      await db.insert(schema.inventoryLog).values({
        productId: l.productId,
        delta: l.qty,
        reason: "restock",
        referenceId: `cancel:${before.number}`,
      });
    }
    // Stock badges on product pages and grids reflect the restore.
    for (const locale of ["en", "bn"]) revalidatePath(`/${locale}`, "layout");
  }

  if (status === "delivered") {
    fireReviewRequest(orderId).catch(() => {});
  }

  return { changed: true, from: before.status };
}

/** Recipient for any order — guests have guestEmail, signed-in customers need a Supabase lookup. */
async function resolveOrderEmail(orderId: string): Promise<{ email: string; firstName: string; number: string; trackingToken: string } | null> {
  const [order] = await db
    .select({
      guestEmail: schema.orders.guestEmail,
      customerId: schema.orders.customerId,
      shippingAddress: schema.orders.shippingAddress,
      number: schema.orders.number,
      trackingToken: schema.orders.trackingToken,
    })
    .from(schema.orders)
    .where(eq(schema.orders.id, orderId))
    .limit(1);

  if (!order) return null;

  const addr = parseShippingAddress(order.shippingAddress);
  const firstName = (addr.fullName ?? "").split(" ")[0] || "friend";

  if (order.guestEmail) {
    return { email: order.guestEmail, firstName, number: order.number, trackingToken: order.trackingToken };
  }

  if (order.customerId) {
    try {
      const { data } = await createSupabaseServiceClient().auth.admin.getUserById(order.customerId);
      if (data?.user?.email) {
        return { email: data.user.email, firstName, number: order.number, trackingToken: order.trackingToken };
      }
    } catch {}
  }

  return null;
}

/** Review request for a delivered order. Best-effort; never throws. */
async function fireReviewRequest(orderId: string): Promise<void> {
  const recipient = await resolveOrderEmail(orderId);
  if (!recipient) return;

  const trackingUrl = `${SITE_URL}/en/order/${recipient.number}/track?t=${recipient.trackingToken}`;
  const { subject, html } = reviewRequestEmail(recipient.firstName, recipient.number, trackingUrl);

  const result = await sendEmail({ to: recipient.email, subject, html });
  await logOrderEvent({
    orderId,
    type: "email_sent",
    payload: { subject, to: recipient.email, ok: result.ok, error: result.error ?? null },
    actor: null,
  });
}
