"use server";

import { z } from "zod";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { eq, desc, and, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireUser, getCurrentUser } from "@/lib/auth-utils";
import { requirePermission } from "@/lib/auth-utils";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/brevo";
import { runAfterResponse } from "@/lib/background";
import { sendOwnerAlert, preorderAlertSms } from "@/lib/owner-alert";
import { isFormRateLimited } from "@/lib/request-guard";
import { isDhakaOnlySegment, isDhakaCity } from "@/lib/delivery-scope";
import {
  preorderReceivedEmail,
  preorderQuoteEmail,
  preorderConfirmedEmail,
  preorderAdminNotifyEmail,
} from "@/lib/email/templates";
import { SITE_URL } from "@/lib/site-url";
import { normalizeBdWhatsApp } from "@/lib/utils";
import { priceDisplay, effectiveDepositPct, depositForQuote } from "@/lib/pricing";
import { getCommerceSettings } from "@/lib/commerce";
import { isValidDeliveryDate, GIFT_MESSAGE_MAX, dhakaToday } from "@/lib/delivery";
import { expressCheck, EXPRESS_ORDER_NOTE, PREORDER_ORDER_PREFIX } from "@/lib/express";
import { preorderMoney, REFERRAL_BDT } from "@/lib/referral";
import { checkReferralCode, codeForEmail, referralDiscountForQuote, settleReferralAtConversion } from "@/lib/referral-server";
import { confirmWhatsAppUrl, type ConfirmMessageInput } from "@/lib/quote-message";

const attachmentSchema = z.object({
  url: z.string().url(),
  path: z.string().min(1).max(500),
  type: z.enum(["image", "video"]),
  sizeBytes: z.number().int().min(0).max(10_485_760),
  // Whitelist matches the bucket policy in 0005_preorder_requests.sql.
  // Anything outside the whitelist would have been rejected at upload time
  // anyway, but we lock it down here so downstream readers of `mime` can
  // trust the value without re-validating.
  mime: z.enum([
    "image/jpeg", "image/png", "image/webp", "image/gif",
    "video/mp4", "video/quicktime", "video/webm",
  ]),
});

const requestSchema = z.object({
  segmentId: z.string().min(1).max(80),
  description: z.string().min(10, "Tell us a little more (at least 10 characters).").max(4000),
  quantity: z.number().int().min(1).max(50),
  budgetHintBdt: z.number().int().min(0).max(10_000_000).optional().nullable(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  customerName: z.string().min(1).max(120),
  customerPhone: z.string().min(6).max(40).optional().nullable(),
  deliveryAddress: z.object({
    line1: z.string().min(1).max(200),
    area: z.string().max(80).optional().nullable(),
    city: z.string().min(1).max(80),
    district: z.string().max(80).optional().nullable(),
    postcode: z.string().max(20).optional().nullable(),
  }).optional().nullable(),
  attachments: z.array(attachmentSchema).max(5).default([]),
});

export type PreorderRequestInput = z.infer<typeof requestSchema>;

export async function createPreorderRequest(
  input: PreorderRequestInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const user = await requireUser();
  const data = requestSchema.parse(input);
  if (await isFormRateLimited("preorder")) {
    return { ok: false as const, error: "We have received many requests from your network in the last hour. Please wait a little, or write to concierge@sanguine-co.com." };
  }

  const seg = await db.select().from(schema.segments).where(eq(schema.segments.id, data.segmentId)).limit(1);
  if (seg.length === 0 || seg[0].hidden || !seg[0].preorderEnabled) {
    return { ok: false as const, error: "Pre-orders are not currently being accepted in this collection." };
  }

  const [row] = await db.insert(schema.preorderRequests).values({
    segmentId: data.segmentId,
    customerId: user.id,
    customerEmail: user.email ?? "",
    customerName: data.customerName,
    customerPhone: data.customerPhone || null,
    description: data.description,
    quantity: data.quantity,
    budgetHintBdt: data.budgetHintBdt ?? null,
    targetDate: data.targetDate || null,
    deliveryAddress: data.deliveryAddress ?? null,
    attachments: data.attachments,
  }).returning();

  // Customer + owner notifications: sent after the response, never block.
  const customerPayload = {
    customerName: data.customerName,
    segmentName: seg[0].name,
    description: data.description,
    quantity: data.quantity,
    budgetHintBdt: data.budgetHintBdt ?? null,
    targetDate: data.targetDate ?? null,
    attachmentCount: data.attachments.length,
  };
  if (user.email) {
    const { subject, html } = preorderReceivedEmail(customerPayload);
    const to = user.email;
    runAfterResponse(() => sendEmail({ to, toName: data.customerName, subject, html }));
  }
  {
    const { subject, html } = preorderAdminNotifyEmail({
      ...customerPayload,
      requestId: row.id,
      customerEmail: user.email ?? "",
      customerPhone: data.customerPhone || null,
      adminUrl: `${SITE_URL}/en/admin/preorders?id=${row.id}`,
    });
    const sms = preorderAlertSms(seg[0].name, data.customerName, data.customerPhone || null);
    runAfterResponse(() => sendOwnerAlert({ kind: "preorder", subject, html, sms }));
  }

  revalidatePath("/[locale]/admin/preorders", "page");
  return { ok: true as const, id: row.id };
}

// ─── Product preorder (known product, no bespoke description needed) ────

const productPreorderSchema = z.object({
  productId: z.string().min(1).max(120),
  quantity: z.number().int().min(1).max(50),
  color: z.string().max(80).optional().nullable(),
  size: z.string().max(40).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  customerName: z.string().min(1).max(120),
  /** Required: the quote goes out on WhatsApp first, and the courier calls it. */
  customerPhone: z.string().trim().min(6).max(40),
  /** Optional "deliver on" day and card message (0022). */
  targetDate: z.string().optional().nullable(),
  giftMessage: z.string().trim().max(GIFT_MESSAGE_MAX).optional().nullable(),
  /** Same-day express (flowers in Dhaka): delivered today for EXPRESS_FEE_BDT. */
  express: z.boolean().optional().nullable(),
  /** Guests only: where the quote goes. Signed-in customers use their account email. */
  customerEmail: z.string().trim().email().max(200).optional().nullable(),
  deliveryAddress: z.object({
    line1: z.string().min(1).max(200),
    area: z.string().max(80).optional().nullable(),
    city: z.string().min(1).max(80),
    postcode: z.string().max(20).optional().nullable(),
  }).optional().nullable(),
  /** A friend's referral code (lib/referral.ts): optional, first orders only. */
  referralCode: z.string().trim().max(40).optional().nullable(),
  /** Honeypot: a field people never see. Only scripts fill it in. */
  trap: z.string().max(200).optional().nullable(),
});

/** Same burst guard as checkout: three requests per email per 10 minutes. */
const PREORDER_RATE_WINDOW_MIN = 10;
const PREORDER_RATE_MAX = 3;

export type ProductPreorderInput = z.infer<typeof productPreorderSchema>;

export async function createProductPreorderRequest(
  input: ProductPreorderInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  // Guests can preorder (0021): an account was a sign-up wall before the
  // only way to buy. The quote goes to this email either way.
  const user = await getCurrentUser();
  const parsed = productPreorderSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Please check the form and try again." };
  const data = parsed.data;
  // A filled honeypot gets the same answer as a real request, and nothing is
  // stored or emailed, so a script cannot tell it was caught.
  if (data.trap?.trim()) return { ok: true as const, id: "received" };
  if (data.targetDate && !isValidDeliveryDate(data.targetDate, new Date())) {
    return { ok: false as const, error: "Please choose a delivery date from tomorrow onwards." };
  }
  const email = (user?.email || data.customerEmail || "").trim();
  if (!email) return { ok: false as const, error: "Please add your email so we can send you the price." };
  if (normalizeBdWhatsApp(data.customerPhone).length < 10) {
    return { ok: false as const, error: "Please add a phone number we can reach on WhatsApp." };
  }

  const windowStart = new Date(Date.now() - PREORDER_RATE_WINDOW_MIN * 60 * 1000);
  const [recent] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.preorderRequests)
    .where(and(
      sql`${schema.preorderRequests.createdAt} > ${windowStart.toISOString()}::timestamptz`,
      sql`lower(${schema.preorderRequests.customerEmail}) = lower(${email})`,
    ));
  if (Number(recent?.n ?? 0) >= PREORDER_RATE_MAX) {
    return {
      ok: false as const,
      error: "We have received several requests from you in the last few minutes. Please wait a little, or write to concierge@sanguine-co.com.",
    };
  }

  if (await isFormRateLimited("preorder")) {
    return { ok: false as const, error: "We have received many requests from your network in the last hour. Please wait a little, or write to concierge@sanguine-co.com." };
  }

  const [product] = await db.select().from(schema.products)
    .where(eq(schema.products.id, data.productId)).limit(1);

  // status guard: archived/draft products must not be preorderable even if
  // the flag was left on.
  if (!product || !product.preorderEnabled || product.status !== "live") {
    return { ok: false as const, error: "This product is not available for preorder." };
  }
  // Bouquets cannot travel by courier: the form fixes the city, this is the backstop.
  if (isDhakaOnlySegment(product.segmentId) && data.deliveryAddress && !isDhakaCity(data.deliveryAddress.city)) {
    return { ok: false as const, error: "Flowers are delivered in Dhaka only. Please give a Dhaka address." };
  }
  const express = expressCheck(Boolean(data.express), product.segmentId, Boolean(data.deliveryAddress), new Date());
  if (!express.ok) return express;
  const referral = await checkReferralCode(data.referralCode, { email, customerId: user?.id ?? null, phone: data.customerPhone });
  if (!referral.ok) return referral;
  const targetDate = express.feeBdt ? dhakaToday(new Date()) : data.targetDate || null;

  // Snapshot what the customer was shown (estimate range + deposit %): the
  // quote may differ after research, but the advertised numbers must be on
  // record for the admin and for drift monitoring.
  const commerce = await getCommerceSettings();
  const advertised = priceDisplay(product);
  const advertisedMinBdt = advertised.kind === "fixed" ? advertised.amountBdt
    : advertised.kind === "estimate" ? advertised.minBdt : null;
  const advertisedMaxBdt = advertised.kind === "fixed" ? advertised.amountBdt
    : advertised.kind === "estimate" ? advertised.maxBdt : null;
  const advertisedDepositPct = effectiveDepositPct(product.preorderDepositPct, commerce.preorderDepositPct);

  const description = [
    `Preorder · ${product.name}`,
    data.color ? `Colour: ${data.color}` : null,
    data.size ? `Size: ${data.size}` : null,
    express.feeBdt ? `${EXPRESS_ORDER_NOTE} (+${express.feeBdt} BDT): deliver today, ${targetDate}` : null,
    referral.code ? `Referral code: ${referral.code}` : null,
    data.notes ? `Notes: ${data.notes}` : null,
  ].filter(Boolean).join(" · ");

  const [row] = await db.insert(schema.preorderRequests).values({
    productId: data.productId,
    segmentId: product.segmentId ?? null,
    customerId: user?.id ?? null,
    customerEmail: email,
    customerName: data.customerName,
    customerPhone: data.customerPhone || null,
    description,
    quantity: data.quantity,
    color: data.color || null,
    size: data.size || null,
    deliveryAddress: data.deliveryAddress ?? null,
    targetDate,
    giftMessage: data.giftMessage || null,
    expressFeeBdt: express.feeBdt,
    referralCode: referral.code,
    attachments: [],
    advertisedMinBdt,
    advertisedMaxBdt,
    advertisedDepositPct,
  }).returning();

  {
    const { subject, html } = preorderReceivedEmail({
      customerName: data.customerName,
      segmentName: product.name,
      description,
      quantity: data.quantity,
      budgetHintBdt: null,
      targetDate: null,
      attachmentCount: 0,
    });
    runAfterResponse(() => sendEmail({ to: email, toName: data.customerName, subject, html }));
  }
  {
    const { subject, html } = preorderAdminNotifyEmail({
      customerName: data.customerName,
      segmentName: product.name,
      description,
      quantity: data.quantity,
      budgetHintBdt: null,
      targetDate: null,
      attachmentCount: 0,
      requestId: row.id,
      customerEmail: email,
      customerPhone: data.customerPhone || null,
      adminUrl: `${SITE_URL}/en/admin/preorders?id=${row.id}`,
    });
    const sms = preorderAlertSms(product.name, data.customerName, data.customerPhone || null);
    runAfterResponse(() => sendOwnerAlert({ kind: "preorder", subject, html, sms }));
  }

  revalidatePath("/[locale]/admin/preorders", "page");
  return { ok: true as const, id: row.id };
}

// ─── Admin actions ──────────────────────────────────────────────────────

export async function listPreorderRequests(opts?: { status?: string }) {
  await requirePermission("preorders");
  const rows = await db.select().from(schema.preorderRequests).orderBy(desc(schema.preorderRequests.createdAt));
  return opts?.status ? rows.filter((r) => r.status === opts.status) : rows;
}

/**
 * Generate fresh signed URLs for the attachments on a single request, so
 * admins can preview customer references regardless of when they were
 * uploaded. Service-role client bypasses RLS.
 */
export async function getPreorderAttachmentUrls(id: string): Promise<string[]> {
  await requirePermission("preorders");
  const [row] = await db.select().from(schema.preorderRequests).where(eq(schema.preorderRequests.id, id));
  if (!row) return [];
  const attachments = row.attachments ?? [];
  if (attachments.length === 0) return [];
  const sb = createSupabaseServiceClient();
  const out: string[] = [];
  for (const a of attachments) {
    const { data } = await sb.storage.from("preorder-attachments").createSignedUrl(a.path, 60 * 60);
    out.push(data?.signedUrl ?? "");
  }
  return out;
}

export async function setPreorderStatus(id: string, status: "reviewing" | "rejected") {
  await requirePermission("preorders");
  await db.update(schema.preorderRequests).set({ status }).where(eq(schema.preorderRequests.id, id));
  revalidatePath("/[locale]/admin/preorders", "page");
  return { ok: true as const };
}

const quoteSchema = z.object({
  id: z.string().uuid(),
  quotedPriceBdt: z.number().int().min(1).max(10_000_000),
  adminNotes: z.string().max(2000).optional().nullable(),
});

export async function quotePreorderRequest(input: z.infer<typeof quoteSchema>) {
  await requirePermission("preorders");
  const data = quoteSchema.parse(input);

  // Deposit = pct × the PER-UNIT quote. Prefer the pct snapshotted at request
  // time (what the customer saw); legacy rows fall back to the current global.
  const [existing] = await db.select().from(schema.preorderRequests)
    .where(eq(schema.preorderRequests.id, data.id)).limit(1);
  if (!existing) return { ok: false as const, error: "Request not found" };
  // Terminal/paid states must not be silently re-quoted: converted already
  // has a real order, rejected was closed, confirmed has money on record.
  if (existing.status === "converted" || existing.status === "rejected") {
    return { ok: false as const, error: `This request is already ${existing.status}: it cannot be re-quoted.` };
  }
  if (existing.status === "confirmed") {
    return { ok: false as const, error: "Deposit already received on the current quote: convert it, or refund the deposit before re-quoting." };
  }
  const commerce = await getCommerceSettings();
  const depositPct = existing.advertisedDepositPct ?? effectiveDepositPct(null, commerce.preorderDepositPct);
  // Deposit secures the whole commission: pct × (per-unit quote × quantity).
  // Computing it per-unit made the quote email read "deposit ৳2,000 (20%)"
  // under a ৳30,000 three-piece total: 6.7% in reality.
  // A same-day express fee is paid in advance, with the deposit.
  // A referral discount (a friend's code, or the customer's own earned credit) comes off the
  // bouquet before the deposit is worked out (lib/referral.ts).
  const goods = data.quotedPriceBdt * existing.quantity;
  const referral = await referralDiscountForQuote(existing, goods);
  const depositBdt = depositForQuote(goods - referral.discountBdt, depositPct) + (existing.expressFeeBdt ?? 0);

  let row: typeof schema.preorderRequests.$inferSelect | undefined;
  try {
  [row] = await db.update(schema.preorderRequests)
    .set({
      status: "quoted",
      quotedPriceBdt: data.quotedPriceBdt,
      depositBdt,
      referralDiscountBdt: referral.discountBdt || null,
      referralCreditId: referral.creditId,
      adminNotes: data.adminNotes ?? null,
    })
    .where(eq(schema.preorderRequests.id, data.id))
    .returning();
  } catch (err) {
    // 0026's unique indexes: another quote took this discount a moment ago.
    const e = err as { code?: string; cause?: { code?: string } };
    if (e.code === "23505" || e.cause?.code === "23505") {
      return { ok: false as const, error: "Another quote just took this customer's referral discount. Press send again: the quote will be worked out afresh." };
    }
    throw err;
  }

  if (!row) return { ok: false as const, error: "Request not found" };

  // Email customer the quote.
  if (row.customerEmail) {
    const seg = row.segmentId
      ? await db.select().from(schema.segments).where(eq(schema.segments.id, row.segmentId)).limit(1)
      : [];
    const { subject, html } = preorderQuoteEmail({
      customerName: row.customerName ?? "",
      segmentName: seg[0]?.name ?? row.segmentId ?? "piece",
      description: row.description,
      quantity: row.quantity,
      budgetHintBdt: row.budgetHintBdt ?? null,
      targetDate: row.targetDate ?? null,
      attachmentCount: (row.attachments ?? []).length,
      quotedPriceBdt: data.quotedPriceBdt,
      depositBdt,
      depositPct,
      expressFeeBdt: row.expressFeeBdt ?? null,
      referralDiscountBdt: row.referralDiscountBdt ?? null,
      adminNotes: data.adminNotes ?? null,
    });
    const to = row.customerEmail;
    runAfterResponse(() => sendEmail({ to, toName: row.customerName ?? undefined, subject, html }));
  }

  revalidatePath("/[locale]/admin/preorders", "page");
  // Returned so the admin can send the same quote on WhatsApp straight away.
  return { ok: true as const, quotedPriceBdt: data.quotedPriceBdt, depositBdt, referralDiscountBdt: referral.discountBdt };
}

const rejectSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().min(1).max(1000),
});

export async function rejectPreorderRequest(input: z.infer<typeof rejectSchema>) {
  await requirePermission("preorders");
  const data = rejectSchema.parse(input);
  await db.update(schema.preorderRequests)
    .set({ status: "rejected", rejectionReason: data.reason })
    .where(eq(schema.preorderRequests.id, data.id));
  revalidatePath("/[locale]/admin/preorders", "page");
  return { ok: true as const };
}

/**
 * Record that the bKash deposit actually arrived. Nothing else may flip a
 * request to 'confirmed': the conversion only deducts the deposit from the
 * COD total when this state is set, so a quoted-but-unpaid request can never
 * silently lose the deposit amount.
 */
export async function markPreorderDepositReceived(id: string) {
  await requirePermission("preorders");
  const [req] = await db.select().from(schema.preorderRequests)
    .where(eq(schema.preorderRequests.id, id)).limit(1);
  if (!req) return { ok: false as const, error: "Request not found" };
  if (req.status !== "quoted") {
    return { ok: false as const, error: `Only quoted requests can be marked deposit-received (this one is '${req.status}').` };
  }
  if (!req.depositBdt) return { ok: false as const, error: "No deposit amount on record: re-quote first." };
  await db.update(schema.preorderRequests)
    .set({ status: "confirmed", updatedAt: new Date() })
    .where(eq(schema.preorderRequests.id, id));
  // The order-confirmed message: by email now, and ready for WhatsApp in one tap.
  const confirm = await confirmationFor({ ...req, status: "confirmed" });
  if (confirm) {
    const { subject, html } = preorderConfirmedEmail({ ...confirm, customerName: req.customerName ?? "" });
    const to = req.customerEmail;
    runAfterResponse(() => sendEmail({ to, toName: req.customerName ?? undefined, subject, html }));
  }
  revalidatePath("/[locale]/admin/preorders", "page");
  return { ok: true as const, whatsAppUrl: confirm && req.customerPhone ? confirmWhatsAppUrl(req.customerPhone, confirm) : null };
}

/** The order-confirmed message's contents: null when the request is not confirmed or has no quote. */
async function confirmationFor(req: typeof schema.preorderRequests.$inferSelect): Promise<ConfirmMessageInput | null> {
  if (req.status !== "confirmed" || !req.quotedPriceBdt) return null;
  const [product] = req.productId
    ? await db.select({ name: schema.products.name }).from(schema.products).where(eq(schema.products.id, req.productId)).limit(1)
    : [];
  const money = preorderMoney({ ...req, quotedPriceBdt: req.quotedPriceBdt });
  let referralCode: string;
  try {
    referralCode = await codeForEmail(req.customerEmail);
  } catch (err) {
    console.error("[preorders] referral code", req.id, err);
    return null;
  }
  return {
    customerName: req.customerName,
    productName: product?.name ?? "order",
    targetDate: req.targetDate ?? null,
    depositBdt: money.deposit,
    restBdt: money.rest,
    referralCode,
    referralLink: `${SITE_URL}/en?ref=${referralCode}`,
    referralBdt: REFERRAL_BDT,
  };
}

/** For the admin panel: the WhatsApp link for a confirmed request's order-confirmed message. */
export async function getConfirmationWhatsAppUrl(id: string): Promise<string | null> {
  await requirePermission("preorders");
  const [req] = await db.select().from(schema.preorderRequests).where(eq(schema.preorderRequests.id, id)).limit(1);
  if (!req?.customerPhone) return null;
  const confirm = await confirmationFor(req);
  return confirm ? confirmWhatsAppUrl(req.customerPhone, confirm) : null;
}

const convertSchema = z.object({
  id: z.string().uuid(),
});

/**
 * Convert a quoted+confirmed preorder into a real COD order. Creates an order
 * row with a single bespoke line item priced at the quoted amount.
 */
export async function convertPreorderToOrder(input: z.infer<typeof convertSchema>) {
  await requirePermission("preorders");
  const data = convertSchema.parse(input);

  const [req] = await db.select().from(schema.preorderRequests).where(eq(schema.preorderRequests.id, data.id));
  if (!req) return { ok: false as const, error: "Request not found" };
  // Idempotency guard: an admin double-click on "Convert" must not create a
  // second COD order, and rejected requests must never convert.
  if (req.status === "converted") return { ok: false as const, error: "Already converted to an order." };
  if (req.status === "rejected") return { ok: false as const, error: "This request was rejected: re-quote it first." };
  if (!req.quotedPriceBdt) return { ok: false as const, error: "Quote the request before converting." };
  if (!req.deliveryAddress) return { ok: false as const, error: "Customer did not provide a delivery address." };

  // Product preorders keep their identity on the order line: the invoice,
  // emails and review eligibility all key off productId/name/sku.
  const [linkedProduct] = req.productId
    ? await db.select().from(schema.products).where(eq(schema.products.id, req.productId)).limit(1)
    : [];

  const number = `${PREORDER_ORDER_PREFIX}${Date.now().toString(36).toUpperCase()}`;
  const money = preorderMoney({ ...req, quotedPriceBdt: req.quotedPriceBdt, depositBdt: req.status === "confirmed" ? req.depositBdt : 0 });
  const subtotal = money.goods;   // per-unit quote × qty
  // The deposit is deducted from the COD total ONLY when it was actually
  // received (status 'confirmed', set by markPreorderDepositReceived). A
  // 'quoted' request converts at the full subtotal: assuming payment that
  // never arrived would silently gift the deposit amount. Recorded in its
  // own depositPaidBdt column: it is a PAYMENT, not a discount (refund cap
  // and revenue both count it; the courier collects totalBdt).
  const expressFee = money.express;
  const depositPaid = money.deposit;
  const trackingToken = randomBytes(16).toString("hex");

  let newOrderId: string;
  try {
  newOrderId = await db.transaction(async (tx) => {
    const [order] = await tx.insert(schema.orders).values({
      number,
      customerId: req.customerId,
      guestEmail: req.customerEmail,
      guestPhone: req.customerPhone,
      status: "cod_pending",
      paymentMethod: "cod",
      subtotalBdt: subtotal,
      shippingBdt: expressFee,
      codFeeBdt: 0,
      depositPaidBdt: depositPaid,
      totalBdt: money.rest,
      // The referral discount is recorded like a coupon (refunds and revenue already read these).
      couponCode: money.discount > 0 ? (req.referralCode ?? "REFERRAL-CREDIT") : null,
      couponDiscountBdt: money.discount,
      shippingAddress: { fullName: req.customerName, phone: req.customerPhone, ...(req.deliveryAddress as object) },
      trackingToken,
      // The day and card the customer asked for travel with the order (0022).
      deliveryDate: req.targetDate ?? null,
      giftMessage: req.giftMessage ?? null,
      notes: [
        `Bespoke pre-order · request ${req.id}`,
        depositPaid > 0 ? `deposit ${depositPaid} BDT prepaid` : null,
        expressFee > 0 ? `${EXPRESS_ORDER_NOTE} (${expressFee} BDT)` : null,
        money.discount > 0 ? `referral -${money.discount} BDT` : null,
      ].filter(Boolean).join(" · "),
    }).returning({ id: schema.orders.id });

    await tx.insert(schema.orderLines).values({
      orderId: order.id,
      productId: linkedProduct?.id ?? null,
      nameSnapshot: linkedProduct?.name ?? `Bespoke piece · ${req.segmentId}`,
      skuSnapshot: linkedProduct?.sku ?? `BESPOKE-${req.id.slice(0, 8).toUpperCase()}`,
      color: req.color ?? null,
      size: req.size ?? null,
      qty: req.quantity,
      unitPriceBdt: req.quotedPriceBdt!,
      lineTotalBdt: subtotal,
    });

    await tx.update(schema.preorderRequests)
      .set({ status: "converted", convertedOrderId: order.id })
      .where(eq(schema.preorderRequests.id, req.id));

    await settleReferralAtConversion(tx, req, order.id);
    return order.id;
  });
  } catch (err) {
    if (err instanceof Error && (err.message === "REFERRAL_CREDIT_GONE" || err.message === "REFERRAL_CODE_USED")) {
      return { ok: false as const, error: "This quote's referral discount was already used on another order. Re-quote this request, then convert." };
    }
    throw err;
  }

  revalidatePath("/[locale]/admin/preorders", "page");
  revalidatePath("/[locale]/admin/orders", "page");
  return { ok: true as const, orderId: newOrderId, number };
}
