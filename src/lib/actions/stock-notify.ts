"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { eq, and, isNull, gte, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getCurrentUser, requirePermission } from "@/lib/auth-utils";
import { sendEmail } from "@/lib/email/brevo";
import { backInStockEmail } from "@/lib/email/templates";

import { SITE_URL } from "@/lib/site-url";

const subscribeSchema = z.object({
  productId: z.string().min(1).max(120),
  email: z.string().email().max(200),
});

/**
 * Customer-facing: register an email to be notified when this product is back in stock.
 * If the visitor is signed-in we associate the row with their `customerId`.
 * The unique index on (product_id, lower(email)) where notified_at is null
 * prevents duplicate pending registrations.
 */
export async function subscribeBackInStock(input: z.infer<typeof subscribeSchema>) {
  const data = subscribeSchema.parse(input);
  const user = await getCurrentUser();

  // Soft rate-limit: cap one email at 10 active subscriptions per hour.
  // Defends against the action being abused as an email-spam vector or
  // enumeration tool. Returns a uniform success shape so the caller can't
  // distinguish "already registered" from "rate-limited" via response shape.
  const oneHourAgo = new Date(Date.now() - 60 * 60_000);
  const [{ recent }] = await db
    .select({ recent: sql<number>`count(*)::int` })
    .from(schema.stockNotifications)
    .where(and(
      sql`lower(${schema.stockNotifications.email}) = lower(${data.email})`,
      gte(schema.stockNotifications.createdAt, oneHourAgo),
    ));
  if ((recent ?? 0) >= 10) {
    // Same shape as success — no information leak about whether the email
    // exists in the system.
    return { ok: true as const, alreadyRegistered: true };
  }

  // Idempotent: check first, insert if missing.
  const existing = await db.select().from(schema.stockNotifications).where(and(
    eq(schema.stockNotifications.productId, data.productId),
    sql`lower(${schema.stockNotifications.email}) = lower(${data.email})`,
    isNull(schema.stockNotifications.notifiedAt),
  )).limit(1);

  if (existing.length > 0) {
    return { ok: true as const, alreadyRegistered: true };
  }

  await db.insert(schema.stockNotifications).values({
    productId: data.productId,
    customerId: user?.id ?? null,
    email: data.email,
  });

  return { ok: true as const, alreadyRegistered: false };
}

/**
 * Admin trigger: when a product is restocked, fire emails to every pending
 * subscriber and mark them notified. Best-effort sends; one failure does not
 * block the others.
 */
export async function notifyBackInStock(productId: string) {
  await requirePermission("inventory");

  const [product] = await db.select().from(schema.products).where(eq(schema.products.id, productId)).limit(1);
  if (!product) return { ok: false as const, error: "Product not found" };
  if (product.stock <= 0) return { ok: false as const, error: "Product is still out of stock — restock before notifying." };

  const pending = await db.select().from(schema.stockNotifications).where(and(
    eq(schema.stockNotifications.productId, productId),
    isNull(schema.stockNotifications.notifiedAt),
  ));

  if (pending.length === 0) return { ok: true as const, notified: 0 };

  const url = `${SITE_URL}/en/product/${product.slug}`;
  const { subject, html } = backInStockEmail(product.name, url);

  let notified = 0;
  for (const row of pending) {
    try {
      await sendEmail({ to: row.email, subject, html });
      await db.update(schema.stockNotifications)
        .set({ notifiedAt: new Date() })
        .where(eq(schema.stockNotifications.id, row.id));
      notified++;
    } catch {
      // Skip this row but keep going.
    }
  }

  revalidatePath("/[locale]/admin/inventory", "page");
  return { ok: true as const, notified };
}

/** Admin: count pending notifications per product, for the inventory list. */
export async function pendingNotificationsByProduct(): Promise<Map<string, number>> {
  await requirePermission("inventory");
  const rows = await db.execute<{ product_id: string; count: number }>(sql`
    select ${schema.stockNotifications.productId} as product_id, count(*)::int as count
    from ${schema.stockNotifications}
    where ${schema.stockNotifications.notifiedAt} is null
    group by ${schema.stockNotifications.productId}
  `).catch(() => []);
  return new Map(rows.map((r) => [r.product_id, r.count]));
}

