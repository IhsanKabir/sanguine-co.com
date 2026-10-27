"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { eq, asc, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requirePermission } from "@/lib/auth-utils";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

/** Allowed CDN prefix for product image URLs. Anything else is rejected so an
 * admin (or compromised admin session) can't write arbitrary external image
 * URLs to the DB and have them rendered on the storefront. */
const SUPABASE_PUBLIC_PREFIX = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "")
  + "/storage/v1/object/public/product-images/";

/**
 * Image upload pattern: the admin browser uploads the file directly to
 * Supabase Storage using its authenticated session JWT (RLS allows admin-tier
 * roles to write the `product-images` bucket). The browser then calls this
 * server action to record the resulting URL + path on the `product_images`
 * table. We never push the file bytes through this action: only the URL.
 */

const recordSchema = z.object({
  productId: z.string().min(1).max(120),
  url: z.string().url(),
  path: z.string().min(1).max(500).regex(/^[^\.][\w/.-]+$/, "Invalid storage path"),
  alt: z.string().max(200).optional().nullable(),
});

export async function recordProductImage(input: z.infer<typeof recordSchema>) {
  // Require the `products` permission specifically (not just admin tier),
  // matching the storage RLS that ought to restrict bucket writes to
  // catalogue editors. See migration 0006.
  await requirePermission("products");
  const data = recordSchema.parse(input);

  // Reject any URL that doesn't come from our own Supabase Storage bucket.
  // Prevents an admin (or compromised admin session) from injecting an
  // attacker-controlled image URL: stored XSS via OG image / phishing image.
  if (!SUPABASE_PUBLIC_PREFIX || !data.url.startsWith(SUPABASE_PUBLIC_PREFIX)) {
    return { ok: false as const, error: "Image URL must come from our storage bucket." };
  }
  // Cross-check that the URL and path agree: the URL should be the public
  // CDN URL of the file at `path`. Eliminates URL-vs-path mismatch attacks.
  const expectedTail = data.path.replace(/^\/+/, "");
  if (!data.url.endsWith(expectedTail)) {
    return { ok: false as const, error: "Image URL does not match the uploaded path." };
  }

  // Place new image at the end of the order list.
  const [{ next }] = await db
    .select({ next: sql<number>`coalesce(max(${schema.productImages.sortOrder}) + 1, 0)` })
    .from(schema.productImages)
    .where(eq(schema.productImages.productId, data.productId));

  const [row] = await db.insert(schema.productImages).values({
    productId: data.productId,
    url: data.url,
    path: data.path,
    alt: data.alt ?? null,
    sortOrder: next ?? 0,
  }).returning();

  revalidatePath("/[locale]/product/[slug]", "page");
  revalidatePath("/[locale]/shop/[segment]", "page");
  revalidatePath("/[locale]/admin/products", "page");
  return { ok: true as const, image: row };
}

export async function deleteProductImage(id: string) {
  await requirePermission("products");
  const [row] = await db.select().from(schema.productImages).where(eq(schema.productImages.id, id));
  if (!row) return { ok: false as const, error: "Image not found" };

  // Remove from Storage first (best-effort), then drop the row.
  if (row.path) {
    const sb = createSupabaseServiceClient();
    await sb.storage.from("product-images").remove([row.path]).catch(() => {});
  }
  await db.delete(schema.productImages).where(eq(schema.productImages.id, id));

  revalidatePath("/[locale]/product/[slug]", "page");
  revalidatePath("/[locale]/shop/[segment]", "page");
  revalidatePath("/[locale]/admin/products", "page");
  return { ok: true as const };
}

const altSchema = z.object({
  id: z.string().uuid(),
  alt: z.string().max(200),
});

export async function updateProductImageAlt(input: z.infer<typeof altSchema>) {
  await requirePermission("products");
  const data = altSchema.parse(input);
  await db.update(schema.productImages)
    .set({ alt: data.alt || null })
    .where(eq(schema.productImages.id, data.id));
  revalidatePath("/[locale]/admin/products", "page");
  return { ok: true as const };
}

const reorderSchema = z.object({
  productId: z.string().min(1),
  orderedIds: z.array(z.string().uuid()).min(1).max(20),
});

export async function reorderProductImages(input: z.infer<typeof reorderSchema>) {
  await requirePermission("products");
  const data = reorderSchema.parse(input);
  await db.transaction(async (tx) => {
    for (let i = 0; i < data.orderedIds.length; i++) {
      await tx.update(schema.productImages)
        .set({ sortOrder: i })
        .where(eq(schema.productImages.id, data.orderedIds[i]));
    }
  });
  revalidatePath("/[locale]/product/[slug]", "page");
  revalidatePath("/[locale]/shop/[segment]", "page");
  revalidatePath("/[locale]/admin/products", "page");
  return { ok: true as const };
}

export async function listProductImages(productId: string) {
  await requirePermission("products");
  return db.select().from(schema.productImages)
    .where(eq(schema.productImages.productId, productId))
    .orderBy(asc(schema.productImages.sortOrder));
}
