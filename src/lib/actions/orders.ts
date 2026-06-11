"use server";

import { z } from "zod";
import { randomBytes } from "crypto";
import { db, schema } from "@/lib/db";
import { eq, sql, inArray, and } from "drizzle-orm";
import { sendEmail } from "@/lib/email/brevo";
import { orderPlacedEmail, type OrderEmailLine } from "@/lib/email/templates";
import { sendSms } from "@/lib/sms/ssl-wireless";
import { trackEvent } from "@/lib/events";
import { validateCoupon, recordCouponRedemption } from "./coupons";
import { formatBdt } from "@/lib/utils";
import { logOrderEvent } from "@/lib/order-events";

import { SITE_URL } from "@/lib/site-url";

const FREE_THRESHOLD = 3000;
const FLAT_SHIPPING_DHAKA = 80;
const FLAT_SHIPPING_OUTSIDE = 150;
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
    phone: z.string().min(10).max(20),
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
});

export type CreateOrderInput = z.infer<typeof inputSchema>;

function generateOrderNumber(): string {
  const t = Date.now().toString(36).slice(-5).toUpperCase();
  const r = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `SSG-${t}${r}`;
}

function shippingCost(city: string, subtotal: number): number {
  if (subtotal >= FREE_THRESHOLD) return 0;
  return city.toLowerCase().includes("dhaka") ? FLAT_SHIPPING_DHAKA : FLAT_SHIPPING_OUTSIDE;
}

export async function createCodOrder(input: CreateOrderInput) {
  // 1. Validate input shape
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Invalid input", details: parsed.error.flatten() };
  }
  const data = parsed.data;

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
    if (p.stock < item.qty) return { ok: false as const, error: `${p.name} — only ${p.stock} in stock` };
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

  const baseShipping = shippingCost(data.shipping.city, subtotal);
  const shipping = freeShipping ? 0 : baseShipping;
  const total = Math.max(0, subtotal - couponDiscount) + shipping + COD_FEE;
  const number = generateOrderNumber();

  // 4. Insert order + lines + decrement stock in a single transaction.
  // If a concurrent order took the last unit between read and write, the
  // atomic guard inside this transaction throws `OUT_OF_STOCK:<name>` which
  // we surface as a friendly user-facing error.
  const trackingToken = randomBytes(16).toString("hex");
  let order: typeof schema.orders.$inferSelect;
  try {
    const result = await db.transaction(async (tx) => {
    const [o] = await tx.insert(schema.orders).values({
      number,
      guestEmail: data.customer.email,
      guestPhone: data.customer.phone,
      status: "cod_pending",
      paymentMethod: "cod",
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
      // Atomic stock decrement with WHERE guard — if `stock >= qty` is no longer
      // true (because a concurrent order beat us to the last unit), the UPDATE
      // affects 0 rows and we throw to abort the whole transaction.
      const updated = await tx.update(schema.products)
        .set({ stock: sql`${schema.products.stock} - ${l.qty}` })
        .where(and(eq(schema.products.id, l.productId), sql`${schema.products.stock} >= ${l.qty}`))
        .returning({ id: schema.products.id });
      if (updated.length === 0) {
        throw new Error(`OUT_OF_STOCK:${l.nameSnapshot}`);
      }
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
    payload: { number, total: total, payment: "cod", channel: "storefront" },
    actor: null,                        // customer-placed; no admin actor
  });

  // 5. Send email + SMS confirmations (best effort, never throw)
  const emailLines: OrderEmailLine[] = lines.map((l) => ({
    name: l.nameSnapshot,
    qty: l.qty,
    lineTotalBdt: l.lineTotalBdt,
    color: l.color,
    size: l.size,
  }));
  const emailData = {
    number,
    customerName: data.customer.fullName,
    customerEmail: data.customer.email,
    customerPhone: data.customer.phone,
    shippingAddress: {
      line1: data.shipping.line1,
      area: data.shipping.area || undefined,
      city: data.shipping.city,
      postcode: data.shipping.postcode || undefined,
    },
    lines: emailLines,
    subtotalBdt: subtotal,
    shippingBdt: shipping,
    codFeeBdt: COD_FEE,
    totalBdt: total,
    paymentMethod: "cod" as const,
    trackingUrl: `${SITE_URL}/en/order/${number}/track?t=${trackingToken}`,
  };
  const { subject, html } = orderPlacedEmail(emailData);
  sendEmail({ to: data.customer.email, toName: data.customer.fullName, subject, html })
    .then((r) => logOrderEvent({
      orderId: order.id,
      type: "email_sent",
      payload: { subject, to: data.customer.email, ok: r.ok, error: r.error ?? null },
      actor: null,
    }))
    .catch((e) => console.error("[order email]", e));
  sendSms(
    data.customer.phone,
    `Maison Saanguine: order ${number} confirmed (COD ${formatBdt(total)}). Have cash ready for our courier.`,
  )
    .then((r) => logOrderEvent({
      orderId: order.id,
      type: "sms_sent",
      payload: { to: data.customer.phone, ok: r.ok, error: r.error ?? null },
      actor: null,
    }))
    .catch((e) => console.error("[order sms]", e));

  // 6. Coupon redemption is now atomic with the order (above, inside the tx).

  // 7. Behavior analytics
  trackEvent({
    type: "order_placed",
    payload: { number, totalBdt: total, lines: lines.length, paymentMethod: "cod", couponCode },
    path: "/checkout",
  }).catch(() => {});

  return { ok: true as const, number, totalBdt: total };
}
