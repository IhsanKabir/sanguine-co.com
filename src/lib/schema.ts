import { pgTable, text, integer, boolean, uuid, timestamp, jsonb, numeric, primaryKey, unique, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ─── Catalogue ─────────────────────────────────────────────────────────
export const segments = pgTable("segments", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  nameBn: text("name_bn"),
  tag: text("tag"),
  tagBn: text("tag_bn"),
  blurb: text("blurb"),
  blurbBn: text("blurb_bn"),
  // Size guide shown on product pages of this segment (0018). Plain text;
  // lines containing "|" render as a table, the first such line as header.
  sizeGuide: text("size_guide"),
  sizeGuideBn: text("size_guide_bn"),
  hidden: boolean("hidden").default(false).notNull(),
  // Per-segment fulfilment toggles. Either, both, or neither can be live.
  // stockEnabled=false hides product listings entirely from this segment.
  // preorderEnabled=true reveals the bespoke request CTA.
  stockEnabled: boolean("stock_enabled").default(true).notNull(),
  preorderEnabled: boolean("preorder_enabled").default(false).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: text("id").primaryKey(),
  sku: text("sku").unique().notNull(),
  name: text("name").notNull(),
  nameBn: text("name_bn"),
  slug: text("slug").unique().notNull(),
  segmentId: text("segment_id").references(() => segments.id),
  priceBdt: integer("price_bdt").notNull(),     // whole BDT (no paisa for v1)
  wasBdt: integer("was_bdt"),                   // strike-through price
  stock: integer("stock").default(0).notNull(),
  tag: text("tag"),                             // 'new'|'sale'|'limited'|'staff-pick'
  rating: numeric("rating", { precision: 2, scale: 1 }).default("0"),
  reviewCount: integer("review_count").default(0).notNull(),
  status: text("status").default("live").notNull(),
  description: text("description"),
  descriptionBn: text("description_bn"),
  colors: jsonb("colors").$type<string[]>().default([]),
  sizes: jsonb("sizes").$type<string[]>().default([]),
  // Per-product preorder settings. Independent of segment.preorderEnabled.
  preorderEnabled: boolean("preorder_enabled").default(false).notNull(),
  preorderOnly: boolean("preorder_only").default(false).notNull(),
  estimatedDelivery: text("estimated_delivery"),   // e.g. "4–6 weeks"
  preorderPriceBdt: integer("preorder_price_bdt"), // DEPRECATED (0016) — kept for rollback; app no longer reads it
  // Quotation-driven pricing (0016): the actual price of a preorder piece is
  // set by quotation after research; until then the catalogue carries at most
  // an estimated range. Deposit % of the quoted price is what the customer
  // prepays — null falls back to site_settings.commerce.preorderDepositPct.
  priceMinBdt: integer("price_min_bdt"),
  priceMaxBdt: integer("price_max_bdt"),
  preorderDepositPct: integer("preorder_deposit_pct"),
  // Per-product return window override — null falls back to the global default.
  returnWindowDays: integer("return_window_days"),
  modelNote: text("model_note"),
  // Materials / composition and care instructions (0018). Plain text.
  details: text("details"),
  detailsBn: text("details_bn"),
  care: text("care"),
  careBn: text("care_bn"),
  lookProductIds: jsonb("look_product_ids").$type<string[]>().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const productImages = pgTable("product_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  path: text("path"),                          // storage path so we can remove the blob on delete
  alt: text("alt"),
  sortOrder: integer("sort_order").default(0).notNull(),
});

export type ProductImage = typeof productImages.$inferSelect;

// Stock per option (0019). A product with no rows keeps its single
// products.stock; a product with rows is tracked per option and its
// products.stock is kept equal to their sum (lib/variant-stock.ts).
// '' = no colour / no size, so size-only and colour-only pieces fit the key.
export const productVariants = pgTable("product_variants", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  color: text("color").default("").notNull(),
  size: text("size").default("").notNull(),
  stock: integer("stock").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  unique("product_variants_product_id_color_size_key").on(t.productId, t.color, t.size),
  index("idx_product_variants_product").on(t.productId),
  check("product_variants_stock_check", sql`${t.stock} >= 0`),
]);

export type ProductVariant = typeof productVariants.$inferSelect;

// ─── Customers (Supabase Auth owns auth.users; we add a profile) ───────
export const customerProfiles = pgTable("customer_profiles", {
  id: uuid("id").primaryKey(),                  // FK to auth.users.id
  fullName: text("full_name"),
  phone: text("phone"),                         // +8801XXXXXXXXX
  acceptsMarketing: boolean("accepts_marketing").default(false).notNull(),
  preferredLocale: text("preferred_locale").default("en"),
  birthday: text("birthday"),                   // 'YYYY-MM-DD'
  anniversary: text("anniversary"),             // 'YYYY-MM-DD'
  perfumeFamily: text("perfume_family"),
  bookGenre: text("book_genre"),
  flowerPreference: text("flower_preference"),
  notifyEmail: boolean("notify_email").default(true).notNull(),
  notifySms: boolean("notify_sms").default(false).notNull(),
  referralCode: text("referral_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const addresses = pgTable("addresses", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id"),              // FK to auth.users.id, nullable for guest checkout
  label: text("label"),                         // 'Home', 'Office'
  fullName: text("full_name"),
  phone: text("phone"),
  line1: text("line1"),
  line2: text("line2"),
  area: text("area"),                           // 'Gulshan'
  city: text("city"),                           // 'Dhaka'
  district: text("district"),                   // 'Dhaka'
  division: text("division"),                   // 'Dhaka'
  postcode: text("postcode"),
  country: text("country").default("Bangladesh"),
  isDefault: boolean("is_default").default(false).notNull(),
});

// ─── Orders ────────────────────────────────────────────────────────────
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  number: text("number").unique().notNull(),     // 'SSG-10501'
  customerId: uuid("customer_id"),               // null for guest
  guestEmail: text("guest_email"),
  guestPhone: text("guest_phone"),
  status: text("status").default("pending").notNull(),
  // pending | cod_pending | paid | processing | shipped | delivered | cancelled | refunded
  paymentMethod: text("payment_method").notNull(),
  // 'cod' | 'card' | 'bkash' | 'nagad' | 'rocket' (later)
  paymentRef: text("payment_ref"),
  subtotalBdt: integer("subtotal_bdt").notNull(),
  shippingBdt: integer("shipping_bdt").default(0).notNull(),
  codFeeBdt: integer("cod_fee_bdt").default(0).notNull(),
  totalBdt: integer("total_bdt").notNull(),
  shippingAddress: jsonb("shipping_address").notNull(),
  shippingCourier: text("shipping_courier"),     // 'pathao' | 'steadfast'
  shippingTracking: text("shipping_tracking"),
  couponCode: text("coupon_code"),
  couponDiscountBdt: integer("coupon_discount_bdt").default(0).notNull(),
  // Prepaid preorder deposit (0017) — a PAYMENT already received, distinct
  // from discounts: refunds cap at totalBdt + depositPaidBdt, revenue counts
  // totalBdt + depositPaidBdt, the courier collects totalBdt.
  depositPaidBdt: integer("deposit_paid_bdt").default(0).notNull(),
  // Random hex token included in confirmation/shipping emails. The /order/[number]/track
  // page requires either a matching ?t= query param OR a signed-in customer who owns the order.
  trackingToken: text("tracking_token").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const orderLines = pgTable("order_lines", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: text("product_id").references(() => products.id),
  nameSnapshot: text("name_snapshot").notNull(),
  skuSnapshot: text("sku_snapshot").notNull(),
  color: text("color"),
  size: text("size"),
  qty: integer("qty").notNull(),
  unitPriceBdt: integer("unit_price_bdt").notNull(),
  lineTotalBdt: integer("line_total_bdt").notNull(),
});

// ─── Reviews & Wishlist ────────────────────────────────────────────────
export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id"),
  orderId: uuid("order_id").references(() => orders.id),
  rating: integer("rating").notNull(),
  title: text("title"),
  body: text("body"),
  photoUrls: jsonb("photo_urls").$type<string[]>().default([]),
  helpfulCount: integer("helpful_count").default(0).notNull(),
  status: text("status").default("pending").notNull(),
  // 'pending' | 'approved' | 'rejected'
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const wishlists = pgTable(
  "wishlists",
  {
    customerId: uuid("customer_id").notNull(),
    productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.customerId, t.productId] }),
  }),
);

// ─── Audit + Inventory log ─────────────────────────────────────────────
export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id"),
  action: text("action").notNull(),
  targetType: text("target_type"),
  targetId: text("target_id"),
  payload: jsonb("payload"),
  ip: text("ip"),
  ua: text("ua"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// One-time SMS codes for cash-on-delivery checkout (0020). Only a hash of
// the code is stored. status 'send_failed' = the SMS could not be sent and
// that checkout goes through unverified (lib/phone-code.ts).
export const phoneVerifications = pgTable("phone_verifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  phone: text("phone").notNull(),
  codeHash: text("code_hash").notNull(),
  status: text("status").default("sent").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  ip: text("ip"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("idx_phone_verifications_phone").on(t.phone, t.createdAt.desc()),
  index("idx_phone_verifications_ip").on(t.ip, t.createdAt.desc()),
]);

export const inventoryLog = pgTable("inventory_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: text("product_id").notNull().references(() => products.id),
  delta: integer("delta").notNull(),
  reason: text("reason").notNull(),              // 'order'|'restock'|'adjustment'|'return'
  referenceId: text("reference_id"),
  actorId: uuid("actor_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── Coupons (discount codes) ──────────────────────────────────────────
export const coupons = pgTable("coupons", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").unique().notNull(),
  description: text("description"),
  type: text("type").notNull(),                 // 'percent' | 'fixed' | 'free_shipping'
  value: integer("value").default(0).notNull(),
  minSubtotalBdt: integer("min_subtotal_bdt").default(0).notNull(),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").default(0).notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const couponRedemptions = pgTable("coupon_redemptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  couponId: uuid("coupon_id").notNull(),
  orderId: uuid("order_id"),
  customerId: uuid("customer_id"),
  customerEmail: text("customer_email"),
  discountBdt: integer("discount_bdt").notNull(),
  redeemedAt: timestamp("redeemed_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Coupon = typeof coupons.$inferSelect;

// ─── Events (behavior analytics) ───────────────────────────────────────
export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").notNull(),
  sessionId: text("session_id"),
  customerId: uuid("customer_id"),
  productId: text("product_id"),
  payload: jsonb("payload").default({}),
  ua: text("ua"),
  referrer: text("referrer"),
  path: text("path"),
  ip: text("ip"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── Site settings (overflow when not in Sanity) ───────────────────────
export const siteSettings = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── Refunds ───────────────────────────────────────────────────────────
export const refunds = pgTable("refunds", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => orders.id),
  amountBdt: integer("amount_bdt").notNull(),
  reason: text("reason").notNull(),
  method: text("method").notNull(),
  // 'bkash' | 'bank' | 'cash' | 'card'
  recipientInfo: text("recipient_info"),
  processedBy: uuid("processed_by"),
  processedByEmail: text("processed_by_email"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Refund = typeof refunds.$inferSelect;

// ─── Order events (append-only timeline) ───────────────────────────────
export const orderEvents = pgTable("order_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  // 'created' | 'status_changed' | 'courier_booked' | 'refund_issued'
  // | 'note_added' | 'email_sent' | 'sms_sent' | 'payment_received'
  payload: jsonb("payload").default({}).notNull(),
  actorId: uuid("actor_id"),
  actorEmail: text("actor_email"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type OrderEvent = typeof orderEvents.$inferSelect;

// ─── Notify-me-when-back-in-stock ──────────────────────────────────────
export const stockNotifications = pgTable("stock_notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id"),
  email: text("email").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  notifiedAt: timestamp("notified_at", { withTimezone: true }),
});

// ─── Pre-order requests (bespoke / sourced-to-order) ───────────────────
export type PreorderAttachment = {
  url: string;
  path: string;        // storage path (for delete)
  type: "image" | "video";
  sizeBytes: number;
  mime: string;
};

export const preorderRequests = pgTable("preorder_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  // segmentId is nullable so product preorders (no segment context) can be stored.
  segmentId: text("segment_id").references(() => segments.id),
  // productId is set for product-level preorders; null for bespoke segment requests.
  productId: text("product_id").references(() => products.id),
  customerId: uuid("customer_id").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone"),
  customerName: text("customer_name"),

  description: text("description").notNull(),
  quantity: integer("quantity").default(1).notNull(),
  budgetHintBdt: integer("budget_hint_bdt"),
  targetDate: text("target_date"),                 // YYYY-MM-DD as text for simplicity
  color: text("color"),
  size: text("size"),

  deliveryAddress: jsonb("delivery_address"),
  attachments: jsonb("attachments").$type<PreorderAttachment[]>().default([]).notNull(),

  status: text("status").default("new").notNull(),
  // 'new' | 'reviewing' | 'quoted' | 'confirmed' | 'rejected' | 'converted'
  adminNotes: text("admin_notes"),
  quotedPriceBdt: integer("quoted_price_bdt"),   // PER-UNIT quote (owner decision 2026-07-13)
  // Snapshot of what the customer was shown at request time (0016) — the
  // quote can differ from the estimate, but the estimate must be on record.
  advertisedMinBdt: integer("advertised_min_bdt"),
  advertisedMaxBdt: integer("advertised_max_bdt"),
  advertisedDepositPct: integer("advertised_deposit_pct"),
  depositBdt: integer("deposit_bdt"),            // quoted unit price × pct / 100, set at quote time
  rejectionReason: text("rejection_reason"),
  convertedOrderId: uuid("converted_order_id"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── Type aliases for app code ─────────────────────────────────────────
export type Segment = typeof segments.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderLine = typeof orderLines.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type PreorderRequest = typeof preorderRequests.$inferSelect;

/**
 * Canonical shape of `orders.shippingAddress` jsonb. All fields optional so a
 * single parser handles every historical row safely. Always use
 * `parseShippingAddress(jsonb)` before reading individual fields rather than
 * casting inline — historical orders or future regressions may have missing
 * fields and inline casts will silently produce `undefined.foo` accesses.
 */
export type ShippingAddress = {
  fullName?: string;
  phone?: string;
  line1?: string;
  line2?: string;
  area?: string;
  city?: string;
  district?: string;
  division?: string;
  postcode?: string;
  country?: string;
};

export function parseShippingAddress(value: unknown): ShippingAddress {
  if (!value || typeof value !== "object") return {};
  const v = value as Record<string, unknown>;
  const str = (k: string): string | undefined => (typeof v[k] === "string" ? (v[k] as string) : undefined);
  return {
    fullName: str("fullName"),
    phone: str("phone"),
    line1: str("line1"),
    line2: str("line2"),
    area: str("area"),
    city: str("city"),
    district: str("district"),
    division: str("division"),
    postcode: str("postcode"),
    country: str("country"),
  };
}
