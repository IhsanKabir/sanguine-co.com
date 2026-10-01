import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { parseShippingAddress } from "@/lib/schema";
import { sendEmail } from "@/lib/email/brevo";
import { orderPlacedEmail, type OrderEmailLine } from "@/lib/email/templates";
import { sendSms } from "@/lib/sms/ssl-wireless";
import { logOrderEvent } from "@/lib/order-events";
import { formatBdt } from "@/lib/utils";
import { SITE_URL } from "@/lib/site-url";

/**
 * Order confirmation email + SMS, built from the stored order so cash-on-
 * delivery orders (sent at placement) and online orders (sent only once the
 * gateway payment is validated) produce the same message. Best effort:
 * never throws, every send is logged on the order timeline.
 */
export async function notifyOrderPlaced(orderId: string): Promise<void> {
  try {
    const [order] = await db.select().from(schema.orders).where(eq(schema.orders.id, orderId)).limit(1);
    if (!order) return;
    const lines = await db.select().from(schema.orderLines).where(eq(schema.orderLines.orderId, orderId));
    const addr = parseShippingAddress(order.shippingAddress);
    const email = order.guestEmail;
    const phone = order.guestPhone ?? addr.phone ?? "";
    const name = addr.fullName ?? "";
    const online = order.paymentMethod !== "cod";

    const emailLines: OrderEmailLine[] = lines.map((l) => ({
      name: l.nameSnapshot,
      qty: l.qty,
      lineTotalBdt: l.lineTotalBdt,
      color: l.color,
      size: l.size,
    }));

    if (email) {
      const { subject, html } = orderPlacedEmail({
        number: order.number,
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        shippingAddress: {
          line1: addr.line1 ?? "",
          area: addr.area || undefined,
          city: addr.city ?? "",
          postcode: addr.postcode || undefined,
        },
        lines: emailLines,
        subtotalBdt: order.subtotalBdt,
        shippingBdt: order.shippingBdt,
        codFeeBdt: order.codFeeBdt,
        totalBdt: order.totalBdt,
        paymentMethod: online ? "online" : "cod",
        trackingUrl: `${SITE_URL}/en/order/${order.number}/track?t=${order.trackingToken}`,
      });
      sendEmail({ to: email, toName: name, subject, html })
        .then((r) => logOrderEvent({
          orderId,
          type: "email_sent",
          payload: { subject, to: email, ok: r.ok, error: r.error ?? null },
          actor: null,
        }))
        .catch((e) => console.error("[order email]", e));
    }

    if (phone) {
      const text = online
        ? `Sanguine: order ${order.number} confirmed — ${formatBdt(order.totalBdt)} paid online. Nothing is due on delivery.`
        : `Sanguine: order ${order.number} confirmed (COD ${formatBdt(order.totalBdt)}). Have cash ready for our courier.`;
      sendSms(phone, text)
        .then((r) => logOrderEvent({
          orderId,
          type: "sms_sent",
          payload: { to: phone, ok: r.ok, error: r.error ?? null },
          actor: null,
        }))
        .catch((e) => console.error("[order sms]", e));
    }
  } catch (e) {
    console.error("[notifyOrderPlaced]", e);
  }
}
