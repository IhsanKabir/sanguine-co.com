import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { isOnlinePaymentEnabled } from "@/lib/payments/sslcommerz";
import { releaseIfUnpaid, settleOnlinePayment } from "@/lib/payments/online-orders";

/**
 * SSLCommerz callbacks. The gateway POSTs a form to:
 *   success / fail / cancel — the shopper's browser, then redirected onward
 *   ipn                     — SSLCommerz's server (Instant Payment Notification)
 *
 * Nothing in the POST body is trusted: a payment counts only once the
 * Validation API confirms it (settleOnlinePayment), and an order is released
 * only once the transaction lookup shows it unpaid (releaseIfUnpaid).
 */

export const dynamic = "force-dynamic";

const EVENTS = new Set(["success", "fail", "cancel", "ipn"]);

function field(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export async function POST(req: Request, { params }: { params: Promise<{ event: string }> }) {
  const { event } = await params;
  // 303 turns the gateway's POST into a GET on our page; resolved against the
  // request URL so a preview deployment returns to itself.
  const go = (path: string) => NextResponse.redirect(new URL(path, req.url), 303);
  if (!EVENTS.has(event) || !isOnlinePaymentEnabled()) {
    return new NextResponse("Not found", { status: 404 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return new NextResponse("Bad request", { status: 400 });
  }
  const tranId = field(form, "tran_id");
  const valId = field(form, "val_id");
  const locale = field(form, "value_a") === "bn" ? "bn" : "en";

  if (event === "ipn") {
    if (!valId) return new NextResponse("missing val_id", { status: 400 });
    const r = await settleOnlinePayment(valId, tranId);
    // 200 tells SSLCommerz we received it; it retries on other statuses.
    return new NextResponse(r.outcome, { status: r.outcome === "unverified" ? 503 : 200 });
  }

  if (event === "success" && valId) {
    const r = await settleOnlinePayment(valId, tranId);
    if (r.order && (r.outcome === "paid" || r.outcome === "already_paid" || r.outcome === "unverified")) {
      // "unverified": the gateway's validation API was unreachable. Send the
      // shopper to their order (it shows "confirming payment"); the IPN will
      // settle it, and the order stays reserved meanwhile.
      return go(`/${locale}/order/${r.order.number}?t=${r.order.trackingToken}`);
    }
    return go(`/${locale}/checkout?payment=failed`);
  }

  // fail / cancel (or a success callback without a val_id)
  if (tranId) {
    const [order] = await db.select({ id: schema.orders.id, number: schema.orders.number, paymentMethod: schema.orders.paymentMethod })
      .from(schema.orders).where(eq(schema.orders.number, tranId)).limit(1);
    if (order && order.paymentMethod === "sslcommerz") {
      const outcome = await releaseIfUnpaid(order, `gateway_${event}`);
      if (outcome === "paid") {
        const [o] = await db.select({ number: schema.orders.number, trackingToken: schema.orders.trackingToken })
          .from(schema.orders).where(eq(schema.orders.id, order.id)).limit(1);
        if (o) return go(`/${locale}/order/${o.number}?t=${o.trackingToken}`);
      }
    }
  }
  return go(`/${locale}/checkout?payment=${event === "cancel" ? "cancelled" : "failed"}`);
}
