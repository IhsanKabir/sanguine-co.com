import { pgTable, text, integer, boolean, uuid, timestamp, jsonb, numeric, primaryKey } from "drizzle-orm/pg-core";
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
  preorderPriceBdt: integer("preorder_price_bdt"), // null = use priceBdt
  modelNote: text("model_note"),
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
  quotedPriceBdt: integer("quoted_price_bdt"),
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
