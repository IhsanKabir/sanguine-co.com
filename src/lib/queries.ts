import { db } from "./db";
import { segments, products, productImages, orders, orderLines } from "./schema";
import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";

// Reusable subquery: ids of segments that are NOT hidden.
// Products in hidden segments are excluded from every customer-facing query.
const visibleSegmentIds = db.select({ id: segments.id })
  .from(segments)
  .where(eq(segments.hidden, false));

// ─── Segments ──────────────────────────────────────────────────────────
export async function getVisibleSegments() {
  return db.select().from(segments)
    .where(eq(segments.hidden, false))
    .orderBy(asc(segments.sortOrder));
}

export async function getAllSegments() {
  return db.select().from(segments).orderBy(asc(segments.sortOrder));
}

export async function getSegmentBySlug(id: string) {
  const rows = await db.select().from(segments).where(eq(segments.id, id)).limit(1);
  return rows[0] ?? null;
}

// ─── Products ──────────────────────────────────────────────────────────
import { gte, lte } from "drizzle-orm";

export async function getLiveProducts(opts?: {
  segmentId?: string;
  tag?: string;
  limit?: number;
  sort?: "featured" | "price-asc" | "price-desc" | "rating" | "newest";
  minPrice?: number;
  maxPrice?: number;
  /** Filter to products that include any of the given colours (matches the jsonb colours array). */
  colors?: string[];
  /** Same as `colors` but for sizes. */
  sizes?: string[];
}) {
  const conds = [
    eq(products.status, "live"),
    inArray(products.segmentId, visibleSegmentIds),
  ];
  if (opts?.segmentId) conds.push(eq(products.segmentId, opts.segmentId));
  if (opts?.tag) conds.push(eq(products.tag, opts.tag));
  if (typeof opts?.minPrice === "number") conds.push(gte(products.priceBdt, opts.minPrice));
  if (typeof opts?.maxPrice === "number") conds.push(lte(products.priceBdt, opts.maxPrice));
  if (opts?.colors && opts.colors.length > 0) {
    // jsonb ?| array — true if any of the strings are present in the colours array.
    conds.push(sql`${products.colors} ?| ${opts.colors}`);
  }
  if (opts?.sizes && opts.sizes.length > 0) {
    conds.push(sql`${products.sizes} ?| ${opts.sizes}`);
  }

  const orderBy = (() => {
    switch (opts?.sort) {
      case "price-asc":  return asc(products.priceBdt);
      case "price-desc": return desc(products.priceBdt);
      case "rating":     return desc(products.rating);
      case "newest":     return desc(products.createdAt);
      default:           return asc(products.id);
    }
  })();

  const q = db.select().from(products).where(and(...conds)).orderBy(orderBy);
  return opts?.limit ? q.limit(opts.limit) : q;
}

export async function getProductBySlug(slug: string) {
  const rows = await db.select().from(products).where(and(
    eq(products.slug, slug),
    eq(products.status, "live"),
    inArray(products.segmentId, visibleSegmentIds),
  )).limit(1);
  return rows[0] ?? null;
}

export async function getProductImages(productId: string) {
  return db.select().from(productImages)
    .where(eq(productImages.productId, productId))
    .orderBy(asc(productImages.sortOrder));
}

/**
 * Fetch a list of products by id, preserving the input order, and excluding
 * any that are now hidden / not live. Used by the recently-viewed strip.
 */
export async function getProductsByIds(ids: string[]) {
  if (ids.length === 0) return [];
  const rows = await db.select().from(products).where(and(
    inArray(products.id, ids),
    eq(products.status, "live"),
    inArray(products.segmentId, visibleSegmentIds),
  ));
  // Preserve the input order — client passes most-recent first.
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => !!p);
}

/**
 * Batch-fetch up to two images (hero + hover) for a list of products.
 * Returns a map keyed by productId. `hoverUrl` is the second image by
 * sortOrder — undefined when the product has only one image.
 */
export async function getHeroImagesFor(productIds: string[]): Promise<Map<string, { url: string; alt: string | null; hoverUrl?: string }>> {
  if (productIds.length === 0) return new Map();
  const rows = await db.select().from(productImages)
    .where(inArray(productImages.productId, productIds))
    .orderBy(asc(productImages.sortOrder));
  const out = new Map<string, { url: string; alt: string | null; hoverUrl?: string }>();
  for (const r of rows) {
    const existing = out.get(r.productId);
    if (!existing) {
      out.set(r.productId, { url: r.url, alt: r.alt });
    } else if (!existing.hoverUrl) {
      existing.hoverUrl = r.url;
    }
  }
  return out;
}

export async function getRelatedProducts(productId: string, segmentId: string, limit = 4) {
  return db.select().from(products)
    .where(and(eq(products.status, "live"), eq(products.segmentId, segmentId), sql`${products.id} != ${productId}`))
    .limit(limit);
}

/**
 * Count units of a product sold (via confirmed orders) in the last 30 days.
 * Drives the "X+ ordered this month" social-proof badge on the PDP.
 */
export async function getProductSalesVelocity(productId: string): Promise<number> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [row] = await db.execute<{ count: number }>(sql`
    select count(*)::int as count
    from ${orderLines}
    join ${orders} on ${orderLines.orderId} = ${orders.id}
    where ${orderLines.productId} = ${productId}
      and ${orders.createdAt} >= ${since.toISOString()}
  `);
  return row?.count ?? 0;
}

// ─── Search (Postgres full-text) ───────────────────────────────────────
export async function searchProducts(query: string, limit = 8) {
  if (!query || query.trim().length < 2) return [];
  // Escape LIKE wildcards (% _ \) so a customer can't trigger pathological
  // patterns like "%a%b%c%d..." against the index. The trimmed query is also
  // capped at a sane length so a 4 KB input can't get pushed through.
  const trimmed = query.trim().slice(0, 80);
  const escaped = trimmed.replace(/[\\%_]/g, "\\$&");
  return db.select().from(products).where(
    and(
      eq(products.status, "live"),
      inArray(products.segmentId, visibleSegmentIds),
      or(
        ilike(products.name, `%${escaped}%`),
        // Bengali-locale customers search Bengali product names — matching
        // only the Latin name returned nothing for them.
        ilike(products.nameBn, `%${escaped}%`),
        ilike(products.sku, `%${escaped}%`),
      ),
    ),
  ).limit(limit);
}
