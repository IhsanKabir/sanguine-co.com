"use server";

import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";
import { COPY_CACHE_TAG } from "@/lib/copy";
import { COMMERCE_KEY, COMMERCE_CACHE_TAG, getCommerceSettings, type CommerceSettings } from "@/lib/commerce";
import { SITE_URL } from "@/lib/site-url";

// Bust the ISR cache for every locale-prefixed route.
// revalidatePath("/", "layout") alone does not reach /en or /bn because
// localePrefix:"always" in next-intl means the root "/" path never serves
// storefront content — all pages live under /{locale}/...
//
// Known limit: this does NOT purge the /api/og share-card CDN cache
// (s-maxage=86400), so a product's social card can show an old price/name
// for up to a day after an edit. Accepted trade-off — see the Cache-Control
// note in src/app/api/og/route.tsx.
function revalidateAllLocales() {
  for (const locale of ["en", "bn"]) {
    revalidatePath(`/${locale}`, "layout");
  }
}
import { db, schema } from "@/lib/db";
import { parseShippingAddress } from "@/lib/schema";
import { eq, sql, inArray } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin, requirePermission } from "@/lib/auth-utils";
import { PERMISSIONS, type Permission, type AdminRole } from "@/lib/permissions";
import { slugify } from "@/lib/utils";
import { createPathaoOrder } from "@/lib/shipping/pathao";
import { createSteadfastOrder } from "@/lib/shipping/steadfast";
import { sendEmail } from "@/lib/email/brevo";
import { orderShippedEmail, reviewRequestEmail, type OrderEmailLine } from "@/lib/email/templates";
import { sendSms } from "@/lib/sms/ssl-wireless";
import { logOrderEvent, listOrderEvents } from "@/lib/order-events";

// ─── Segments ──────────────────────────────────────────────────────────
const segSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(80),
  nameBn: z.string().max(80).optional().nullable(),
  tag: z.string().max(40).optional().nullable(),
  tagBn: z.string().max(40).optional().nullable(),
  blurb: z.string().max(200).optional().nullable(),
  blurbBn: z.string().max(200).optional().nullable(),
  hidden: z.boolean().optional(),
  stockEnabled: z.boolean().optional(),
  preorderEnabled: z.boolean().optional(),
});

export async function createSegment(input: z.infer<typeof segSchema>) {
  await requireAdmin();
  const data = segSchema.parse(input);
  const id = slugify(data.id || data.name);
  await db.insert(schema.segments).values({
    id,
    name: data.name,
    nameBn: data.nameBn || null,
    tag: data.tag || null,
    tagBn: data.tagBn || null,
    blurb: data.blurb || null,
    blurbBn: data.blurbBn || null,
    hidden: data.hidden ?? false,
    stockEnabled: data.stockEnabled ?? true,
    preorderEnabled: data.preorderEnabled ?? false,
  });
  revalidateAllLocales();
  return { ok: true as const, id };
}

export async function updateSegment(id: string, patch: Partial<z.infer<typeof segSchema>>) {
  await requireAdmin();
  await db.update(schema.segments).set({
    ...(patch.name !== undefined && { name: patch.name }),
    ...(patch.nameBn !== undefined && { nameBn: patch.nameBn || null }),
    ...(patch.tag !== undefined && { tag: patch.tag || null }),
    ...(patch.tagBn !== undefined && { tagBn: patch.tagBn || null }),
    ...(patch.blurb !== undefined && { blurb: patch.blurb || null }),
    ...(patch.blurbBn !== undefined && { blurbBn: patch.blurbBn || null }),
    ...(patch.hidden !== undefined && { hidden: patch.hidden }),
    ...(patch.stockEnabled !== undefined && { stockEnabled: patch.stockEnabled }),
    ...(patch.preorderEnabled !== undefined && { preorderEnabled: patch.preorderEnabled }),
  }).where(eq(schema.segments.id, id));
  revalidatePath("/[locale]/shop", "layout");
  revalidatePath("/[locale]/admin/segments", "page");
  return { ok: true as const };
}

export async function toggleSegment(id: string) {
  await requireAdmin();
  await db.update(schema.segments)
    .set({ hidden: sql`not ${schema.segments.hidden}` })
    .where(eq(schema.segments.id, id));
  revalidatePath("/[locale]/admin/segments", "page");
  revalidatePath("/[locale]", "layout");
}

export async function moveSegment(id: string, delta: number) {
  await requireAdmin();
  const all = await db.select().from(schema.segments).orderBy(schema.segments.sortOrder);
  const idx = all.findIndex((s) => s.id === id);
  const j = idx + delta;
  if (idx < 0 || j < 0 || j >= all.length) return;
  await db.transaction(async (tx) => {
    await tx.update(schema.segments).set({ sortOrder: j }).where(eq(schema.segments.id, all[idx].id));
    await tx.update(schema.segments).set({ sortOrder: idx }).where(eq(schema.segments.id, all[j].id));
  });
  revalidateAllLocales();
}

export async function deleteSegment(id: string) {
  await requireAdmin();
  // Ensure "uncategorised" exists, reparent products, then delete the segment.
  await db.transaction(async (tx) => {
    const orphans = await tx.select().from(schema.products).where(eq(schema.products.segmentId, id));
    if (orphans.length > 0) {
      const unc = await tx.select().from(schema.segments).where(eq(schema.segments.id, "uncategorised")).limit(1);
      if (unc.length === 0) {
        await tx.insert(schema.segments).values({
          id: "uncategorised",
          name: "Uncategorised",
          tag: "Misc",
          blurb: "Pieces between categories",
          hidden: false,
          sortOrder: 999,
        });
      }
      await tx.update(schema.products).set({ segmentId: "uncategorised" }).where(eq(schema.products.segmentId, id));
    }
    await tx.delete(schema.segments).where(eq(schema.segments.id, id));
  });
  revalidateAllLocales();
}

// ─── Products ──────────────────────────────────────────────────────────
const prodSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(120),
  nameBn: z.string().max(120).optional().nullable(),
  sku: z.string().min(1).max(40),
  segmentId: z.string(),
  priceBdt: z.number().int().min(0),
  wasBdt: z.number().int().min(0).optional().nullable(),
  stock: z.number().int().min(0),
  tag: z.string().max(20).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  descriptionBn: z.string().max(2000).optional().nullable(),
  colors: z.array(z.string()).optional(),
  sizes: z.array(z.string()).optional(),
  preorderEnabled: z.boolean().optional(),
  preorderOnly: z.boolean().optional(),
  estimatedDelivery: z.string().max(100).optional().nullable(),
  preorderPriceBdt: z.number().int().min(0).optional().nullable(),
  modelNote: z.string().max(300).optional().nullable(),
  lookProductIds: z.array(z.string()).optional(),
  // Quotation model (0016): estimated range + per-product deposit/return overrides.
  priceMinBdt: z.number().int().min(1).optional().nullable(),
  priceMaxBdt: z.number().int().min(1).optional().nullable(),
  preorderDepositPct: z.number().int().min(1).max(100).optional().nullable(),
  returnWindowDays: z.number().int().min(0).max(365).optional().nullable(),
});

/**
 * Cross-field price rules (shared by create, update and CSV import):
 *  - a regular (buy-now) product must have a real price — ৳0 placeholders were
 *    the root cause of the zero-price checkout hole;
 *  - an estimate range must be coherent (min ≤ max).
 * Preorder-only pieces MAY omit every price ("price on quotation").
 */
function validatePriceRules(p: {
  priceBdt: number;
  preorderOnly?: boolean | null;
  priceMinBdt?: number | null;
  priceMaxBdt?: number | null;
}): string | null {
  if (!p.preorderOnly && p.priceBdt < 1) {
    return "A buy-now product needs a price of at least ৳1. Mark it preorder-only if the price comes from quotation.";
  }
  if (p.priceMinBdt != null && p.priceMaxBdt != null && p.priceMinBdt > p.priceMaxBdt) {
    return "Estimated price range is inverted — min must be ≤ max.";
  }
  return null;
}

export async function createProduct(input: z.infer<typeof prodSchema>) {
  await requireAdmin();
  const data = prodSchema.parse(input);
  const priceError = validatePriceRules(data);
  if (priceError) return { ok: false as const, error: priceError };
  const id = data.id || `p-${Date.now().toString(36)}`;
  const slug = slugify(data.name);
  await db.insert(schema.products).values({
    id,
    name: data.name,
    nameBn: data.nameBn || null,
    sku: data.sku.toUpperCase(),
    slug,
    segmentId: data.segmentId,
    priceBdt: data.priceBdt,
    wasBdt: data.wasBdt || null,
    stock: data.stock,
    tag: data.tag || null,
    description: data.description || null,
    descriptionBn: data.descriptionBn || null,
    colors: data.colors || [],
    sizes: data.sizes || [],
    preorderEnabled: data.preorderEnabled ?? false,
    preorderOnly: data.preorderOnly ?? false,
    estimatedDelivery: data.estimatedDelivery || null,
    preorderPriceBdt: data.preorderPriceBdt ?? null,
    modelNote: data.modelNote || null,
    lookProductIds: data.lookProductIds || [],
    priceMinBdt: data.priceMinBdt ?? null,
    priceMaxBdt: data.priceMaxBdt ?? null,
    preorderDepositPct: data.preorderDepositPct ?? null,
    returnWindowDays: data.returnWindowDays ?? null,
  });
  revalidateAllLocales();
  return { ok: true as const, id, slug };
}

export async function updateProduct(id: string, patch: Partial<z.infer<typeof prodSchema>>) {
  await requireAdmin();
  // Server actions are network-callable: the Partial<> type is compile-time
  // only, so re-validate the patch shape at runtime before touching the DB.
  const parsed = prodSchema.partial().safeParse(patch);
  if (!parsed.success) return { ok: false as const, error: "Invalid product patch" };
  const safe = parsed.data;
  // Price rules need the merged row (patch may change only one side of the rule).
  const [current] = await db.select().from(schema.products).where(eq(schema.products.id, id)).limit(1);
  if (!current) return { ok: false as const, error: "Product not found" };
  const priceError = validatePriceRules({
    priceBdt: safe.priceBdt ?? current.priceBdt,
    preorderOnly: safe.preorderOnly ?? current.preorderOnly,
    priceMinBdt: safe.priceMinBdt !== undefined ? safe.priceMinBdt : current.priceMinBdt,
    priceMaxBdt: safe.priceMaxBdt !== undefined ? safe.priceMaxBdt : current.priceMaxBdt,
  });
  if (priceError) return { ok: false as const, error: priceError };

  const update: Record<string, unknown> = {};
  for (const k of ["name","nameBn","sku","segmentId","priceBdt","wasBdt","stock","tag","description","descriptionBn","colors","sizes","preorderEnabled","preorderOnly","estimatedDelivery","preorderPriceBdt","modelNote","lookProductIds","priceMinBdt","priceMaxBdt","preorderDepositPct","returnWindowDays"] as const) {
    if (safe[k] !== undefined) (update as Record<string, unknown>)[k] = safe[k];
  }
  if (typeof safe.sku === "string") update.sku = safe.sku.toUpperCase();
  if (typeof safe.name === "string") update.slug = slugify(safe.name);
  await db.update(schema.products).set(update).where(eq(schema.products.id, id));
  revalidateAllLocales();
  return { ok: true as const };
}

export async function deleteProduct(id: string) {
  await requireAdmin();
  await db.transaction(async (tx) => {
    // orderLines.productId and preorderRequests.productId are nullable FKs with no cascade —
    // nullify them so order history is preserved but the constraint doesn't block the delete.
    await tx.update(schema.orderLines).set({ productId: null }).where(eq(schema.orderLines.productId, id));
    await tx.update(schema.preorderRequests).set({ productId: null }).where(eq(schema.preorderRequests.productId, id));
    // inventoryLog.productId is NOT NULL with no cascade — delete those rows first.
    await tx.delete(schema.inventoryLog).where(eq(schema.inventoryLog.productId, id));
    // Product row last (cascade handles productImages, reviews, wishlists, stockNotifications).
    await tx.delete(schema.products).where(eq(schema.products.id, id));
  });
  revalidateAllLocales();
}

export async function deleteProducts(ids: string[]) {
  if (!ids.length) return;
  await requireAdmin();
  await db.transaction(async (tx) => {
    await tx.update(schema.orderLines).set({ productId: null }).where(inArray(schema.orderLines.productId, ids));
    await tx.update(schema.preorderRequests).set({ productId: null }).where(inArray(schema.preorderRequests.productId, ids));
    await tx.delete(schema.inventoryLog).where(inArray(schema.inventoryLog.productId, ids));
    await tx.delete(schema.products).where(inArray(schema.products.id, ids));
  });
  revalidateAllLocales();
}

export async function adjustStock(id: string, delta: number, reason: string) {
  await requireAdmin();
  await db.transaction(async (tx) => {
    await tx.update(schema.products)
      .set({ stock: sql`greatest(0, ${schema.products.stock} + ${delta})` })
      .where(eq(schema.products.id, id));
    await tx.insert(schema.inventoryLog).values({ productId: id, delta, reason });
  });
  revalidateAllLocales();
}

// ─── Orders ────────────────────────────────────────────────────────────
const validStatuses = ["pending","cod_pending","paid","processing","shipped","delivered","cancelled","refunded","return_requested","returned"] as const;

const SITE_URL_ORDERS = SITE_URL;

/** Resolve recipient email for any order — guests have guestEmail, auth users need Supabase lookup. */
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
      const { data } = await adminClient().auth.admin.getUserById(order.customerId);
      if (data?.user?.email) {
        return { email: data.user.email, firstName, number: order.number, trackingToken: order.trackingToken };
      }
    } catch {}
  }

  return null;
}

/** Fire review request email for a delivered order. Best-effort; never throws. */
async function fireReviewRequest(orderId: string): Promise<void> {
  const recipient = await resolveOrderEmail(orderId);
  if (!recipient) return;

  const trackingUrl = `${SITE_URL_ORDERS}/en/order/${recipient.number}/track?t=${recipient.trackingToken}`;
  const { subject, html } = reviewRequestEmail(recipient.firstName, recipient.number, trackingUrl);

  const result = await sendEmail({ to: recipient.email, subject, html });
  await logOrderEvent({
    orderId,
    type: "email_sent",
    payload: { subject, to: recipient.email, ok: result.ok, error: result.error ?? null },
  });
}

/** Public-to-admin wrapper around the order events log. Permission-gated. */
export async function getOrderTimeline(orderId: string) {
  await requirePermission("orders");
  return listOrderEvents(orderId);
}

export async function updateOrderStatus(orderId: string, status: typeof validStatuses[number]) {
  await requireAdmin();
  const [before] = await db.select({ status: schema.orders.status }).from(schema.orders).where(eq(schema.orders.id, orderId));
  await db.update(schema.orders).set({ status }).where(eq(schema.orders.id, orderId));
  await logOrderEvent({
    orderId,
    type: "status_changed",
    payload: { from: before?.status ?? null, to: status },
  });

  // Send review request when an order transitions into delivered for the first time.
  if (status === "delivered" && before?.status !== "delivered") {
    fireReviewRequest(orderId).catch(() => {});
  }

  revalidatePath("/admin", "layout");
}

const bulkStatusSchema = z.object({
  orderIds: z.array(z.string().uuid()).min(1).max(200),
  status: z.enum(validStatuses),
});

/**
 * Apply the same status change to many orders at once. Used for the
 * multi-select bulk-action workflow on /admin/orders. Each transition is
 * logged individually so the per-order timeline still shows what happened.
 */
export async function bulkUpdateOrderStatus(input: z.infer<typeof bulkStatusSchema>) {
  await requireAdmin();
  const data = bulkStatusSchema.parse(input);

  const before = await db.select({ id: schema.orders.id, status: schema.orders.status })
    .from(schema.orders)
    .where(inArray(schema.orders.id, data.orderIds));
  if (before.length === 0) return { ok: false as const, error: "No matching orders." };

  await db.update(schema.orders)
    .set({ status: data.status })
    .where(inArray(schema.orders.id, data.orderIds));

  for (const o of before) {
    if (o.status !== data.status) {
      await logOrderEvent({
        orderId: o.id,
        type: "status_changed",
        payload: { from: o.status, to: data.status, bulk: true },
      });
    }
  }

  revalidatePath("/[locale]/admin/orders", "page");
  return { ok: true as const, updated: before.length };
}

const courierSchema = z.object({
  orderId: z.string(),
  courier: z.enum(["pathao", "steadfast"]),
  // Pathao-specific (city/zone IDs from their API)
  pathaoCity: z.number().optional(),
  pathaoZone: z.number().optional(),
  pathaoArea: z.number().optional(),
});

export async function bookCourier(input: z.infer<typeof courierSchema>) {
  await requireAdmin();
  const data = courierSchema.parse(input);
  const [order] = await db.select().from(schema.orders).where(eq(schema.orders.id, data.orderId));
  if (!order) return { ok: false as const, error: "Order not found" };
  const lines = await db.select().from(schema.orderLines).where(eq(schema.orderLines.orderId, order.id));
  const addr = parseShippingAddress(order.shippingAddress);
  if (!addr.fullName || !addr.phone || !addr.line1 || !addr.city) {
    return { ok: false as const, error: "Order is missing required shipping fields. Add an address before booking." };
  }
  const itemQty = lines.reduce((s, l) => s + l.qty, 0);

  let trackingCode = "";
  try {
    if (data.courier === "pathao") {
      if (!data.pathaoCity || !data.pathaoZone) {
        return { ok: false as const, error: "Pathao city + zone required" };
      }
      const r = await createPathaoOrder({
        merchantOrderId: order.number,
        recipientName: addr.fullName,
        recipientPhone: addr.phone,
        recipientAddress: `${addr.line1}${addr.area ? ", " + addr.area : ""}, ${addr.city}`,
        recipientCity: data.pathaoCity,
        recipientZone: data.pathaoZone,
        recipientArea: data.pathaoArea,
        itemQty,
        itemWeight: 0.5,
        amountToCollect: order.paymentMethod === "cod" ? order.totalBdt : 0,
        itemDescription: lines.map((l) => l.nameSnapshot).join(", ").slice(0, 200),
      });
      trackingCode = r.trackingCode;
    } else {
      const r = await createSteadfastOrder({
        invoice: order.number,
        recipientName: addr.fullName,
        recipientPhone: addr.phone,
        recipientAddress: `${addr.line1}${addr.area ? ", " + addr.area : ""}, ${addr.city}`,
        codAmount: order.paymentMethod === "cod" ? order.totalBdt : 0,
      });
      trackingCode = r.trackingCode;
    }
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Courier API failed" };
  }

  await db.update(schema.orders).set({
    status: "shipped",
    shippingCourier: data.courier,
    shippingTracking: trackingCode,
  }).where(eq(schema.orders.id, order.id));

  await logOrderEvent({
    orderId: order.id,
    type: "courier_booked",
    payload: { courier: data.courier, tracking: trackingCode },
  });
  await logOrderEvent({
    orderId: order.id,
    type: "status_changed",
    payload: { from: order.status, to: "shipped" },
  });

  // Notify customer (best-effort)
  if (order.guestEmail) {
    const emailLines: OrderEmailLine[] = lines.map((l) => ({
      name: l.nameSnapshot,
      qty: l.qty,
      lineTotalBdt: l.lineTotalBdt,
      color: l.color,
      size: l.size,
    }));
    const siteUrl = SITE_URL;
    const { subject, html } = orderShippedEmail({
      number: order.number,
      customerName: addr.fullName,
      customerEmail: order.guestEmail,
      customerPhone: addr.phone,
      shippingAddress: { line1: addr.line1, city: addr.city, area: addr.area },
      lines: emailLines,
      subtotalBdt: order.subtotalBdt,
      shippingBdt: order.shippingBdt,
      codFeeBdt: order.codFeeBdt,
      totalBdt: order.totalBdt,
      paymentMethod: order.paymentMethod as "cod",
      courier: data.courier,
      tracking: trackingCode,
      trackingUrl: `${siteUrl}/en/order/${order.number}/track?t=${order.trackingToken}`,
    });
    sendEmail({ to: order.guestEmail, toName: addr.fullName, subject, html })
      .then((r) => logOrderEvent({
        orderId: order.id,
        type: "email_sent",
        payload: { subject, to: order.guestEmail, ok: r.ok, error: r.error ?? null },
      }))
      .catch(() => {});
  }
  if (order.guestPhone) {
    sendSms(order.guestPhone, `Sanguine: ${order.number} shipped via ${data.courier} (${trackingCode}).`)
      .then((r) => logOrderEvent({
        orderId: order.id,
        type: "sms_sent",
        payload: { to: order.guestPhone, ok: r.ok, error: r.error ?? null },
      }))
      .catch(() => {});
  }

  revalidatePath("/admin", "layout");
  return { ok: true as const, trackingCode };
}

// ─── Editorial / brand ─────────────────────────────────────────────────
//
// `brand` row holds non-i18n metadata (currently just the contact email).
// All consumer-facing copy lives in messages/{en,bn}.json and is overridden
// per-locale via the `copy` row — see `lib/copy.ts`.
const brandSchema = z.object({
  name: z.string().min(1).max(80),
  tagline: z.string().max(160).optional(),
  email: z.string().email().optional(),
  announcement: z.string().max(200).optional(),
});

export async function updateBrand(input: z.infer<typeof brandSchema>) {
  await requireAdmin();
  const data = brandSchema.parse(input);
  await db.insert(schema.siteSettings).values({ key: "brand", value: data })
    .onConflictDoUpdate({ target: schema.siteSettings.key, set: { value: data } });
  revalidateAllLocales();
  return { ok: true as const };
}

export async function getBrand() {
  const rows = await db.select().from(schema.siteSettings).where(eq(schema.siteSettings.key, "brand"));
  if (!rows[0]) return null;
  // safeParse rather than blind cast — protects against historical / corrupted
  // jsonb that doesn't conform to the current `brandSchema`.
  const parsed = brandSchema.safeParse(rows[0].value);
  return parsed.success ? parsed.data : null;
}

// ─── Commerce settings (quotation-driven pricing) ──────────────────────
//
// Global levers for the pricing model: the preorder deposit percentage and
// the default return window. Product-level overrides live on the product row.
const commerceUpdateSchema = z.object({
  preorderDepositPct: z.number().int().min(1).max(100),
  returnWindowDays: z.number().int().min(0).max(365),
});

export async function getCommerceForAdmin(): Promise<CommerceSettings> {
  await requirePermission("settings");
  return getCommerceSettings();
}

export async function updateCommerceSettings(input: z.infer<typeof commerceUpdateSchema>) {
  await requirePermission("settings");
  const data = commerceUpdateSchema.parse(input);
  await db.insert(schema.siteSettings).values({ key: COMMERCE_KEY, value: data })
    .onConflictDoUpdate({
      target: schema.siteSettings.key,
      set: { value: data, updatedAt: new Date() },
    });
  revalidateTag(COMMERCE_CACHE_TAG);
  revalidateAllLocales();
  return { ok: true as const };
}

// ─── Copy overrides ────────────────────────────────────────────────────
//
// Stores per-locale dotted-path overrides for any string in messages/{en,bn}.json.
// The Editorial admin form writes here; i18n/request.ts reads it on every
// render and merges it over the static JSON.
const copyOverridesSchema = z.object({
  en: z.record(z.string(), z.string()),
  bn: z.record(z.string(), z.string()),
});

export async function updateCopyOverrides(input: z.infer<typeof copyOverridesSchema>) {
  await requirePermission("editorial");
  const data = copyOverridesSchema.parse(input);
  // Empty-string entries mean "fall back to the static default" — drop them so
  // future re-edits don't surface stale blanks in the form.
  const clean = {
    en: Object.fromEntries(Object.entries(data.en).filter(([, v]) => v !== "")),
    bn: Object.fromEntries(Object.entries(data.bn).filter(([, v]) => v !== "")),
  };
  await db
    .insert(schema.siteSettings)
    .values({ key: "copy", value: clean })
    .onConflictDoUpdate({
      target: schema.siteSettings.key,
      set: { value: clean, updatedAt: new Date() },
    });
  // Bust the unstable_cache wrapping `getCopyOverrides()` so the next i18n
  // request reads fresh values, then bump the route cache so already-rendered
  // pages re-render with the new merged messages.
  revalidateTag(COPY_CACHE_TAG);
  revalidateAllLocales();
  return { ok: true as const };
}

// ─── Admin user management (owner only) ───────────────────────────────
function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

const subadminInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["owner", "admin", "subadmin"]),
  permissions: z.array(z.enum(PERMISSIONS)).default([]),
});

export type AdminUserSummary = {
  id: string;
  email: string;
  role: AdminRole;
  permissions: Permission[];
  createdAt: string;
  lastSignInAt: string | null;
};

export async function listAdminUsers(): Promise<AdminUserSummary[]> {
  await requirePermission("users");
  const sb = adminClient();
  const all: AdminUserSummary[] = [];
  let page = 1;
  for (;;) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    for (const u of data.users) {
      const meta = (u.app_metadata ?? {}) as { role?: AdminRole; permissions?: Permission[] };
      const role: AdminRole = meta.role && ["owner", "admin", "subadmin"].includes(meta.role) ? meta.role : "customer";
      if (role === "customer") continue; // only show admin-tier users
      all.push({
        id: u.id,
        email: u.email ?? "",
        role,
        permissions: meta.permissions ?? [],
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at ?? null,
      });
    }
    if (data.users.length < 100) break;
    page++;
  }
  return all;
}

export async function inviteAdminUser(input: z.infer<typeof subadminInputSchema>) {
  const ctx = await requirePermission("users");
  const data = subadminInputSchema.parse(input);

  // Only an existing owner may create another owner. Without this guard, an
  // admin (in some future state where they have `users`) could self-escalate.
  if (data.role === "owner" && ctx.role !== "owner") {
    return { ok: false as const, error: "Only owners may create owner accounts." };
  }

  const sb = adminClient();
  // Paginate through all auth users (default perPage is 50) so that this lookup
  // doesn't silently miss matches once the user count exceeds the first page.
  let found: Awaited<ReturnType<typeof sb.auth.admin.listUsers>>["data"]["users"][number] | undefined;
  let page = 1;
  while (!found) {
    const { data: existing } = await sb.auth.admin.listUsers({ page, perPage: 100 });
    found = existing.users.find((u) => u.email?.toLowerCase() === data.email.toLowerCase());
    if (existing.users.length < 100) break;
    page++;
  }
  const appMeta = data.role === "subadmin"
    ? { role: data.role, permissions: data.permissions }
    : { role: data.role };
  if (found) {
    await sb.auth.admin.updateUserById(found.id, {
      password: data.password,
      email_confirm: true,
      app_metadata: { ...found.app_metadata, ...appMeta },
    });
  } else {
    await sb.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      app_metadata: appMeta,
    });
  }
  revalidatePath("/admin/users", "page");
  return { ok: true as const };
}

export async function updateAdminUser(id: string, patch: { role?: AdminRole; permissions?: Permission[] }) {
  const ctx = await requirePermission("users");

  // Only owners may promote another user to owner.
  if (patch.role === "owner" && ctx.role !== "owner") {
    return { ok: false as const, error: "Only owners may promote a user to owner." };
  }

  const sb = adminClient();
  const { data: { user }, error: getErr } = await sb.auth.admin.getUserById(id);
  if (getErr || !user) return { ok: false as const, error: "User not found" };
  const meta = (user.app_metadata ?? {}) as Record<string, unknown>;
  const next: Record<string, unknown> = { ...meta };
  if (patch.role !== undefined) next.role = patch.role;
  if (patch.permissions !== undefined) next.permissions = patch.permissions;
  await sb.auth.admin.updateUserById(id, { app_metadata: next });
  revalidatePath("/admin/users", "page");
  return { ok: true as const };
}

export async function demoteAdminUser(id: string) {
  await requirePermission("users");
  const sb = adminClient();
  const { data: { user } } = await sb.auth.admin.getUserById(id);
  if (!user) throw new Error("User not found");
  const meta = (user.app_metadata ?? {}) as Record<string, unknown>;
  delete meta.role;
  delete meta.permissions;
  await sb.auth.admin.updateUserById(id, { app_metadata: meta });
  revalidatePath("/admin/users", "page");
  return { ok: true as const };
}

export async function deleteAdminUser(id: string) {
  const ctx = await requirePermission("users");

  // Self-deletion guard: a user with `users` permission could otherwise call
  // this action directly (bypassing the UI's hidden delete button) and lock
  // themselves out, with no recovery path short of Supabase dashboard access.
  if (id === ctx.user.id) {
    return { ok: false as const, error: "You cannot delete your own account." };
  }

  const sb = adminClient();
  const { data: { user: target } } = await sb.auth.admin.getUserById(id);
  if (!target) return { ok: false as const, error: "User not found" };

  // Last-owner guard: removing the only owner leaves the maison locked out.
  const targetMeta = (target.app_metadata ?? {}) as { role?: string };
  if (targetMeta.role === "owner") {
    let owners = 0;
    let page = 1;
    for (;;) {
      const { data } = await sb.auth.admin.listUsers({ page, perPage: 100 });
      for (const u of data.users) {
        const m = (u.app_metadata ?? {}) as { role?: string };
        if (m.role === "owner") owners++;
      }
      if (data.users.length < 100) break;
      page++;
    }
    if (owners <= 1) {
      return { ok: false as const, error: "Cannot delete the last owner. Promote another user to owner first." };
    }
  }

  await sb.auth.admin.deleteUser(id);
  revalidatePath("/admin/users", "page");
  return { ok: true as const };
}
