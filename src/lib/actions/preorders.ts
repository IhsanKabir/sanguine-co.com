"use server";

import { z } from "zod";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { eq, desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/auth-utils";
import { requirePermission } from "@/lib/auth-utils";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/brevo";
import {
  preorderReceivedEmail,
  preorderQuoteEmail,
  preorderAdminNotifyEmail,
} from "@/lib/email/templates";
import { SITE_URL } from "@/lib/site-url";
import { priceDisplay, effectiveDepositPct, depositForQuote } from "@/lib/pricing";
import { getCommerceSettings } from "@/lib/commerce";

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
  description: z.string().min(10, "Tell the maison a little more (10+ characters).").max(4000),
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

  // Customer + admin notification emails — fire-and-forget, never block.
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
    sendEmail({ to: user.email, toName: data.customerName, subject, html }).catch(() => {});
  }
  const adminEmail = process.env.PREORDER_ADMIN_EMAIL || process.env.BREVO_FROM_EMAIL;
  if (adminEmail) {
    const baseUrl = SITE_URL;
    const { subject, html } = preorderAdminNotifyEmail({
      ...customerPayload,
      requestId: row.id,
      customerEmail: user.email ?? "",
      customerPhone: data.customerPhone || null,
      adminUrl: `${baseUrl}/en/admin/preorders?id=${row.id}`,
    });
    sendEmail({ to: adminEmail, subject, html }).catch(() => {});
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
  customerPhone: z.string().min(6).max(40).optional().nullable(),
  deliveryAddress: z.object({
    line1: z.string().min(1).max(200),
    area: z.string().max(80).optional().nullable(),
    city: z.string().min(1).max(80),
    postcode: z.string().max(20).optional().nullable(),
  }).optional().nullable(),
});

export type ProductPreorderInput = z.infer<typeof productPreorderSchema>;

export async function createProductPreorderRequest(
  input: ProductPreorderInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const user = await requireUser();
  const data = productPreorderSchema.parse(input);

  const [product] = await db.select().from(schema.products)
    .where(eq(schema.products.id, data.productId)).limit(1);

  // status guard: archived/draft products must not be preorderable even if
  // the flag was left on.
  if (!product || !product.preorderEnabled || product.status !== "live") {
    return { ok: false as const, error: "This product is not available for preorder." };
  }

  // Snapshot what the customer was shown (estimate range + deposit %) — the
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
    data.notes ? `Notes: ${data.notes}` : null,
  ].filter(Boolean).join(" · ");

  const [row] = await db.insert(schema.preorderRequests).values({
    productId: data.productId,
    segmentId: product.segmentId ?? null,
    customerId: user.id,
    customerEmail: user.email ?? "",
    customerName: data.customerName,
    customerPhone: data.customerPhone || null,
    description,
    quantity: data.quantity,
    color: data.color || null,
    size: data.size || null,
    deliveryAddress: data.deliveryAddress ?? null,
    attachments: [],
    advertisedMinBdt,
    advertisedMaxBdt,
    advertisedDepositPct,
  }).returning();

  if (user.email) {
    const { subject, html } = preorderReceivedEmail({
      customerName: data.customerName,
      segmentName: product.name,
      description,
      quantity: data.quantity,
      budgetHintBdt: null,
      targetDate: null,
      attachmentCount: 0,
    });
    sendEmail({ to: user.email, toName: data.customerName, subject, html }).catch(() => {});
  }
  const adminEmail = process.env.PREORDER_ADMIN_EMAIL || process.env.BREVO_FROM_EMAIL;
  if (adminEmail) {
    const baseUrl = SITE_URL;
    const { subject, html } = preorderAdminNotifyEmail({
      customerName: data.customerName,
      segmentName: product.name,
      description,
      quantity: data.quantity,
      budgetHintBdt: null,
      targetDate: null,
      attachmentCount: 0,
      requestId: row.id,
      customerEmail: user.email ?? "",
      customerPhone: data.customerPhone || null,
      adminUrl: `${baseUrl}/en/admin/preorders?id=${row.id}`,
    });
    sendEmail({ to: adminEmail, subject, html }).catch(() => {});
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
  const commerce = await getCommerceSettings();
  const depositPct = existing.advertisedDepositPct ?? effectiveDepositPct(null, commerce.preorderDepositPct);
  const depositBdt = depositForQuote(data.quotedPriceBdt, depositPct);

  const [row] = await db.update(schema.preorderRequests)
    .set({
      status: "quoted",
      quotedPriceBdt: data.quotedPriceBdt,
      depositBdt,
      adminNotes: data.adminNotes ?? null,
    })
    .where(eq(schema.preorderRequests.id, data.id))
    .returning();

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
      adminNotes: data.adminNotes ?? null,
    });
    sendEmail({ to: row.customerEmail, toName: row.customerName ?? undefined, subject, html }).catch(() => {});
  }

  revalidatePath("/[locale]/admin/preorders", "page");
  return { ok: true as const };
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
  if (req.status === "rejected") return { ok: false as const, error: "This request was rejected — re-quote it first." };
  if (!req.quotedPriceBdt) return { ok: false as const, error: "Quote the request before converting." };
  if (!req.deliveryAddress) return { ok: false as const, error: "Customer did not provide a delivery address." };

  // Product preorders keep their identity on the order line — the invoice,
  // emails and review eligibility all key off productId/name/sku.
  const [linkedProduct] = req.productId
    ? await db.select().from(schema.products).where(eq(schema.products.id, req.productId)).limit(1)
    : [];

  const number = `SSG-PO-${Date.now().toString(36).toUpperCase()}`;
  const subtotal = req.quotedPriceBdt * req.quantity;   // per-unit quote × qty
  const trackingToken = randomBytes(16).toString("hex");

  const newOrderId = await db.transaction(async (tx) => {
    const [order] = await tx.insert(schema.orders).values({
      number,
      customerId: req.customerId,
      guestEmail: req.customerEmail,
      guestPhone: req.customerPhone,
      status: "cod_pending",
      paymentMethod: "cod",
      subtotalBdt: subtotal,
      shippingBdt: 0,
      codFeeBdt: 0,
      totalBdt: subtotal,
      shippingAddress: { fullName: req.customerName, phone: req.customerPhone, ...(req.deliveryAddress as object) },
      trackingToken,
      notes: `Bespoke pre-order · request ${req.id}`,
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

    return order.id;
  });

  revalidatePath("/[locale]/admin/preorders", "page");
  revalidatePath("/[locale]/admin/orders", "page");
  return { ok: true as const, orderId: newOrderId, number };
}
