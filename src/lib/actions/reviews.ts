"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireUser, requirePermission } from "@/lib/auth-utils";

/**
 * Customer-facing: submit a review of a product.
 * Eligibility: the customer must have at least one *delivered* order whose
 * line items include this product. The order id is recorded so we can mark
 * the review as a "verified purchase". One review per customer per product.
 */
const submitSchema = z.object({
  productId: z.string().min(1).max(120),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(120).optional().nullable(),
  body: z.string().min(10, "Tell us a little more (10+ characters).").max(2000),
});

/**
 * A delivered order containing the product, owned by the user — matched by
 * customerId OR guestEmail, because storefront orders placed while signed out
 * (or before checkout stamped customerId) only carry the email. Exported so
 * the PDP review-CTA gate applies the exact same rule.
 */
export async function findEligibleOrderId(
  userId: string,
  userEmail: string | null,
  productId: string,
): Promise<string | null> {
  const rows = await db.execute<{ order_id: string }>(sql`
    select ${schema.orders.id} as order_id
    from ${schema.orders}
    join ${schema.orderLines} on ${schema.orderLines.orderId} = ${schema.orders.id}
    where (
        ${schema.orders.customerId} = ${userId}
        or (${userEmail ?? ""} <> '' and lower(${schema.orders.guestEmail}) = lower(${userEmail ?? ""}))
      )
      and ${schema.orders.status} = 'delivered'
      and ${schema.orderLines.productId} = ${productId}
    limit 1
  `).catch(() => [] as { order_id: string }[]);
  return rows[0]?.order_id ?? null;
}

export async function submitReview(
  input: z.infer<typeof submitSchema>,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const user = await requireUser();
  const data = submitSchema.parse(input);

  const eligibleOrderId = await findEligibleOrderId(user.id, user.email ?? null, data.productId);
  if (!eligibleOrderId) {
    return { ok: false as const, error: "Only customers with a delivered order of this piece may write a review." };
  }

  // Prevent duplicates: one review per (customer, product).
  const existing = await db.select().from(schema.reviews).where(
    and(eq(schema.reviews.customerId, user.id), eq(schema.reviews.productId, data.productId)),
  ).limit(1);
  if (existing.length > 0) {
    return { ok: false as const, error: "You have already written a review for this piece." };
  }

  const [row] = await db.insert(schema.reviews).values({
    productId: data.productId,
    customerId: user.id,
    orderId: eligibleOrderId,
    rating: data.rating,
    title: data.title?.trim() || null,
    body: data.body.trim(),
    status: "pending",
  }).returning();

  revalidatePath("/[locale]/admin/reviews", "page");
  return { ok: true as const, id: row.id };
}

/**
 * Public: list approved reviews for a product, newest first.
 * Used by the PDP. Includes the rating + title + body; no customer identifiers.
 */
export async function listApprovedReviews(productId: string) {
  return db.select({
    id: schema.reviews.id,
    rating: schema.reviews.rating,
    title: schema.reviews.title,
    body: schema.reviews.body,
    createdAt: schema.reviews.createdAt,
    helpfulCount: schema.reviews.helpfulCount,
    photoUrls: schema.reviews.photoUrls,
  })
    .from(schema.reviews)
    .where(and(eq(schema.reviews.productId, productId), eq(schema.reviews.status, "approved")))
    .orderBy(desc(schema.reviews.createdAt));
}

/** Has the current customer reviewed this product already? */
export async function hasReviewed(productId: string): Promise<boolean> {
  const user = await requireUser();
  const rows = await db.select({ id: schema.reviews.id }).from(schema.reviews)
    .where(and(eq(schema.reviews.customerId, user.id), eq(schema.reviews.productId, productId)))
    .limit(1);
  return rows.length > 0;
}

// ─── Admin moderation ─────────────────────────────────────────────────

export async function listReviewsForModeration(opts?: { status?: "pending" | "approved" | "rejected" }) {
  await requirePermission("reviews");
  const status = opts?.status ?? "pending";
  const reviews = await db.select().from(schema.reviews)
    .where(eq(schema.reviews.status, status))
    .orderBy(desc(schema.reviews.createdAt));
  if (reviews.length === 0) return { reviews, productNames: new Map<string, string>() };
  const productIds = Array.from(new Set(reviews.map((r) => r.productId)));
  const products = await db.select({ id: schema.products.id, name: schema.products.name })
    .from(schema.products)
    .where(inArray(schema.products.id, productIds));
  const productNames = new Map(products.map((p) => [p.id, p.name]));
  return { reviews, productNames };
}

const moderateSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(["approve", "reject"]),
  reason: z.string().max(500).optional().nullable(),
});

export async function moderateReview(input: z.infer<typeof moderateSchema>) {
  await requirePermission("reviews");
  const data = moderateSchema.parse(input);

  await db.transaction(async (tx) => {
    const status = data.action === "approve" ? "approved" : "rejected";
    const [row] = await tx.update(schema.reviews)
      .set({ status, rejectionReason: data.action === "reject" ? (data.reason || null) : null })
      .where(eq(schema.reviews.id, data.id))
      .returning();
    if (!row) return;

    // Re-aggregate the product's rating + reviewCount from approved rows only.
    const [agg] = await tx.execute<{ avg: number; count: number }>(sql`
      select coalesce(avg(${schema.reviews.rating}), 0)::numeric(2,1) as avg,
             count(*)::int as count
      from ${schema.reviews}
      where ${schema.reviews.productId} = ${row.productId}
        and ${schema.reviews.status} = 'approved'
    `);
    await tx.update(schema.products)
      .set({ rating: String(agg.avg ?? 0), reviewCount: agg.count ?? 0 })
      .where(eq(schema.products.id, row.productId));
  });

  revalidatePath("/[locale]/admin/reviews", "page");
  revalidatePath("/[locale]/product/[slug]", "page");
  revalidatePath("/[locale]/shop/[segment]", "page");
  return { ok: true as const };
}
