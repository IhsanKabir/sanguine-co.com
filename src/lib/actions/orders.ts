"use server";

import { z } from "zod";
import { randomBytes } from "crypto";
import { db, schema } from "@/lib/db";
import { sql, inArray, and } from "drizzle-orm";
import { trackEvent } from "@/lib/events";
import { validateCoupon, recordCouponRedemption } from "./coupons";
import { logOrderEvent } from "@/lib/order-events";
import { checkOptionStock, takeStock } from "@/lib/variant-stock";
import { getCurrentUser } from "@/lib/auth-utils";

import { SITE_URL } from "@/lib/site-url";
import { headers } from "next/headers";

import { shippingFor } from "@/lib/pricing";
import { getCommerceSettings, shippingRulesOf } from "@/lib/commerce";
import { notifyOrderPlaced } from "@/lib/order-notify";
import { initPayment, isOnlinePaymentEnabled } from "@/lib/payments/sslcommerz";
import { expireStaleUnpaidOrders, releaseUnpaidOrder } from "@/lib/payments/online-orders";
import { checkPhoneCode, phoneCheckRequired, sendPhoneCode } from "@/lib/phone-code";

const COD_FEE = 0;          // we eat the COD fee at launch — courier charges merchant ~1%

const itemSchema = z.object({
  productId: z.string(),
  qty: z.number().int().min(1).max(20),
  color: z.string().nullable().optional(),
  size: z.string().nullable().optional(),
});

const inputSchema = z.object({
  customer: z.object({
    fullName: z.string().min(2).max(120),
    email: z.string().email(),
    // Deliveries are BD-only (courier network): normalize and require a real
    // Bangladeshi mobile — same rule the SMS gateway applies at send time.
    phone: z.string().min(10).max(20).refine((raw) => {
      const digits = raw.replace(/\D/g, "");
      return /^(?:88)?01[3-9]\d{8}$/.test(digits);
    }, "Enter a valid Bangladeshi mobile number (01XXXXXXXXX)"),
  }),
  shipping: z.object({
    line1: z.string().min(2).max(200),
    line2: z.string().max(200).optional().nullable(),
    area: z.string().max(80).optional().nullable(),
    city: z.string().min(2).max(80),
    district: z.string().max(80).optional().nullable(),
    division: z.string().max(80).optional().nullable(),
    postcode: z.string().max(20).optional().nullable(),
  }),
  items: z.array(itemSchema).min(1).max(50),
  couponCode: z.string().max(40).optional().nullable(),
  notes: z.string().max(400).optional().nullable(),
  // SMS code for cash-on-delivery (lib/phone-code.ts); only read for COD.
  phoneCode: z.object({
    id: z.string().uuid(),
    code: z.string().max(10).optional().nullable(),
  }).optional().nullable(),
});

export type CreateOrderInput = z.infer<typeof inputSchema>;

function generateOrderNumber(): string {
  const t = Date.now().toString(36).slice(-5).toUpperCase();
  const r = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `SSG-${t}${r}`;
}

/**
 * Shared order placement. "cod" confirms immediately (status cod_pending,
 * notifications sent). "online" reserves stock and the coupon under status
 * pending_payment and sends nothing: the SSLCommerz callback confirms it
 * (lib/payments/online-orders.ts) or releases it.
 */
async function placeOrder(input: CreateOrderInput, mode: "cod" | "online") {
  // 1. Validate input shape
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Invalid input", details: parsed.error.flatten() };
  }
  const data = parsed.data;

  // 1b. Burst guard — createCodOrder is a public unauthenticated action.
  // Three orders per email/phone per 10 minutes stops accidental double-fires
  // and naive scripted abuse without inconveniencing a real customer
  // (legitimate repeat buyers can always write to the concierge).
  const RATE_WINDOW_MIN = 10;
  const RATE_MAX_ORDERS = 3;
  const windowStart = new Date(Date.now() - RATE_WINDOW_MIN * 60 * 1000);
  const [recent] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.orders)
    .where(and(
      sql`${schema.orders.createdAt} > ${windowStart.toISOString()}::timestamptz`,
      sql`(${schema.orders.guestEmail} = ${data.customer.email} or ${schema.orders.guestPhone} = ${data.customer.phone})`,
    ));
  if (Number(recent?.n ?? 0) >= RATE_MAX_ORDERS) {
    return {
      ok: false as const,
      error: "We have received several orders from you in the last few minutes. Please wait a little, or write to concierge@sanguine-co.com and we will take care of it personally.",
    };
  }

  // 2. Re-fetch product prices from DB (anti-tampering — never trust client price)
  const productIds = data.items.map((i) => i.productId);
  const products = await db.select().from(schema.products).where(inArray(schema.products.id, productIds));
  const byId = new Map(products.map((p) => [p.id, p]));

  type OrderLine = {
    productId: string;
    nameSnapshot: string;
    skuSnapshot: string;
    color: string | null;
    size: string | null;
    qty: number;
    unitPriceBdt: number;
    lineTotalBdt: number;
  };
  const lines: OrderLine[] = [];
  let subtotal = 0;
  for (const item of data.items) {
    const p = byId.get(item.productId);
    if (!p) return { ok: false as const, error: `Product ${item.productId} not found` };
    if (p.status !== "live") return { ok: false as const, error: `${p.name} is no longer available` };
    // Quotation model: preorder-only pieces have no cash-on-delivery price —
    // they are bought via the preorder → quote → deposit pipeline. Without
    // this guard the QuickView/stale-cart path sells them at priceBdt, which
    // is a ৳0 placeholder for range-priced pieces.
    if (p.preorderOnly) {
      return { ok: false as const, error: `${p.name} is available by preorder only — please use the preorder form` };
    }
    // A non-positive price is corrupt catalogue data, never a legitimate sale.
    if (p.priceBdt <= 0) {
      return { ok: false as const, error: `${p.name} cannot be ordered right now — please contact the concierge` };
    }
    const lineTotal = p.priceBdt * item.qty;
    subtotal += lineTotal;
    lines.push({
      productId: p.id,
      nameSnapshot: p.name,
      skuSnapshot: p.sku,
      color: item.color || null,
      size: item.size || null,
      qty: item.qty,
      unitPriceBdt: p.priceBdt,
      lineTotalBdt: lineTotal,
    });
  }

  // Stock per option (size/colour) where the product is tracked that way,
  // otherwise the product's single stock number.
  const stockError = await checkOptionStock(lines.map((l) => ({
    productId: l.productId, color: l.color, size: l.size, qty: l.qty,
    name: l.nameSnapshot, productStock: byId.get(l.productId)!.stock,
  })));
  if (stockError) return { ok: false as const, error: stockError };

  // 3. Validate coupon (server-side; never trust client)
  let couponDiscount = 0;
  let freeShipping = false;
  let couponCode: string | null = null;
  if (data.couponCode) {
    const v = await validateCoupon(data.couponCode, subtotal);
    if (!v.ok) return { ok: false as const, error: v.error };
    couponDiscount = v.discountBdt;
    freeShipping = v.freeShipping;
    couponCode = v.code;
  }

  // Same rules (Admin → Settings) and same function the cart and checkout
  // used to quote this total.
  const commerce = await getCommerceSettings();
  const rules = shippingRulesOf(commerce);
  const baseShipping = shippingFor(rules, data.shipping.city, subtotal);
  const shipping = freeShipping ? 0 : baseShipping;
  const total = Math.max(0, subtotal - couponDiscount) + shipping + COD_FEE;
  const number = generateOrderNumber();

  // 3b. Cash on delivery: the phone must answer a one-time SMS code first
  // (Admin → Settings decides from what total). Checked before anything is
  // reserved; a correct code stays valid if this attempt fails later on.
  let phoneCheck: { verified: boolean; reason?: string } | null = null;
  if (mode === "cod" && phoneCheckRequired(commerce, total)) {
    if (!data.phoneCode) {
      return { ok: false as const, needsPhoneCode: true as const, error: "Please confirm your phone number with the code we send." };
    }
    const r = await checkPhoneCode(data.phoneCode.id, data.phoneCode.code, data.customer.phone);
    if (!r.ok) return { ok: false as const, codeError: true as const, newCodeNeeded: !r.retry, error: r.error };
    phoneCheck = { verified: r.verified, reason: r.reason };
  }

  // 4. Insert order + lines + decrement stock in a single transaction.
  // If a concurrent order took the last unit between read and write, the
  // atomic guard inside this transaction throws `OUT_OF_STOCK:<name>` which
  // we surface as a friendly user-facing error.
  const trackingToken = randomBytes(16).toString("hex");
  // Attach the signed-in customer when there is one — review eligibility,
  // account ownership and the track-page gate all key off customerId.
  const currentUser = await getCurrentUser().catch(() => null);
  let order: typeof schema.orders.$inferSelect;
  try {
    const result = await db.transaction(async (tx) => {
    const [o] = await tx.insert(schema.orders).values({
      number,
      customerId: currentUser?.id ?? null,
      guestEmail: data.customer.email,
      guestPhone: data.customer.phone,
      status: mode === "cod" ? "cod_pending" : "pending_payment",
      paymentMethod: mode === "cod" ? "cod" : "sslcommerz",
      subtotalBdt: subtotal,
      shippingBdt: shipping,
      codFeeBdt: COD_FEE,
      couponCode,
      couponDiscountBdt: couponDiscount,
      totalBdt: total,
      shippingAddress: {
        fullName: data.customer.fullName,
        phone: data.customer.phone,
        ...data.shipping,
      },
      trackingToken,
      notes: data.notes || null,
    }).returning();

    await tx.insert(schema.orderLines).values(
      lines.map((l) => ({ ...l, orderId: o.id })),
    );

    for (const l of lines) {
      // Guarded decrement of the option and the product total — if a
      // concurrent order beat us to the last unit it throws OUT_OF_STOCK
      // and the whole transaction rolls back.
      await takeStock(tx, { ...l, name: l.nameSnapshot });
      await tx.insert(schema.inventoryLog).values({
        productId: l.productId,
        delta: -l.qty,
        reason: "order",
        referenceId: o.id,
      });
    }

    // Coupon redemption inside the same transaction so race-losers roll back
    // the entire order atomically (rather than leaving an order on the books
    // with a coupon that exceeded its usage cap).
    if (couponCode) {
      const ok = await recordCouponRedemption({
        code: couponCode,
        orderId: o.id,
        discountBdt: couponDiscount + (freeShipping ? baseShipping : 0),
        customerEmail: data.customer.email,
        tx,
      });
      if (!ok) throw new Error("COUPON_EXHAUSTED");
    }

    return o;
  });
    order = result;
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("OUT_OF_STOCK:")) {
      const name = e.message.slice("OUT_OF_STOCK:".length);
      return { ok: false as const, error: `${name} sold out while we were preparing the order. Please refresh and try again.` };
    }
    if (e instanceof Error && e.message === "COUPON_EXHAUSTED") {
      return { ok: false as const, error: "That coupon has just reached its usage limit. Please remove it or try another." };
    }
    throw e;
  }

  // Log the creation event before any side-effects so the timeline starts cleanly.
  await logOrderEvent({
    orderId: order.id,
    type: "created",
    payload: { number, total: total, payment: mode === "cod" ? "cod" : "sslcommerz", channel: "storefront" },
    actor: null,                        // customer-placed; no admin actor
  });

  if (phoneCheck) {
    await logOrderEvent({
      orderId: order.id,
      type: "phone_check",
      payload: { verified: phoneCheck.verified, ...(phoneCheck.reason ? { reason: phoneCheck.reason } : {}) },
      actor: null,
    });
  }

  // 5. Email + SMS confirmation (best effort, never throws). Online orders
  //    are confirmed only after the gateway payment is validated.
  if (mode === "cod") await notifyOrderPlaced(order.id);

  // 6. Coupon redemption is now atomic with the order (above, inside the tx).

  // 7. Behavior analytics
  trackEvent({
    type: "order_placed",
    payload: { number, totalBdt: total, lines: lines.length, paymentMethod: mode === "cod" ? "cod" : "sslcommerz", couponCode },
    path: "/checkout",
  }).catch(() => {});

  // trackingToken lets the confirmation redirect carry ?t= so the (now
  // ownership-gated) confirmation page opens for guests too.
  return {
    ok: true as const,
    number,
    totalBdt: total,
    trackingToken,
    orderId: order.id,
    itemCount: lines.reduce((n, l) => n + l.qty, 0),
    firstItemName: lines[0]?.nameSnapshot ?? "Sanguine order",
  };
}

export async function createCodOrder(input: CreateOrderInput) {
  const res = await placeOrder(input, "cod");
  if (!res.ok) return res;
  return { ok: true as const, number: res.number, totalBdt: res.totalBdt, trackingToken: res.trackingToken };
}

/**
 * Send the cash-on-delivery SMS code to the checkout's phone number.
 * Rate-limited per phone and per IP inside sendPhoneCode.
 */
export async function requestPhoneCode(phone: string, locale: string) {
  if (typeof phone !== "string" || phone.length > 20) return { ok: false as const, error: "Enter a valid Bangladeshi mobile number (01XXXXXXXXX)." };
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || null;
  return sendPhoneCode(phone, locale === "bn" ? "bn" : "en", ip);
}

/**
 * The origin this request was served from, so a preview deployment's payment
 * returns to that preview (SITE_URL always names production). Falls back to
 * SITE_URL when the headers are missing.
 */
async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return SITE_URL;
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Online payment (SSLCommerz): place the order as pending_payment, open a
 * gateway session and hand back the hosted payment page URL. If the gateway
 * refuses, the reservation is released immediately.
 */
export async function startOnlinePayment(input: CreateOrderInput, locale: string) {
  if (!isOnlinePaymentEnabled()) {
    return { ok: false as const, error: "Online payment is not available right now. Please choose Cash on Delivery." };
  }
  // Abandoned payment sessions hold stock; free any that have timed out first.
  await expireStaleUnpaidOrders().catch(() => {});

  const placed = await placeOrder(input, "online");
  if (!placed.ok) return placed;

  const safeLocale = locale === "bn" ? "bn" : "en";
  const init = await initPayment({
    tranId: placed.number,
    totalBdt: placed.totalBdt,
    numItems: placed.itemCount,
    productName: placed.itemCount > 1 ? `${placed.firstItemName} and more` : placed.firstItemName,
    customer: { name: input.customer.fullName, email: input.customer.email, phone: input.customer.phone },
    shipping: { line1: input.shipping.line1, city: input.shipping.city, postcode: input.shipping.postcode },
    callbackBase: `${await requestOrigin()}/api/payments/sslcommerz`,
    locale: safeLocale,
  });
  if (!init.ok) {
    await releaseUnpaidOrder(placed.orderId, `gateway_init_failed: ${init.error}`);
    return { ok: false as const, error: "We could not open the payment page. Please try again, or choose Cash on Delivery." };
  }
  await logOrderEvent({
    orderId: placed.orderId,
    type: "status_changed",
    payload: { to: "pending_payment", gateway: "sslcommerz", sessionKey: init.sessionKey },
    actor: null,
  });
  return { ok: true as const, gatewayUrl: init.gatewayUrl };
}
