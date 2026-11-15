"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { db, schema } from "@/lib/db";
import { requirePermission } from "@/lib/auth-utils";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import {
  CUTOUTS_CACHE_TAG, CUTOUTS_KEY, PRODUCT_ID, cutoutPathFor, getStoredCutoutsUncached, readCutoutStoreStrict,
  storedCutoutSchema, type StoredCutout,
} from "@/lib/cutout-store";

/**
 * Cut-outs for the home page's rail and shelf (lib/cutouts.ts). The admin's browser cleans the
 * picture and uploads two sizes to the product-images bucket (the same route as product photos);
 * these actions only record them, after checking each file sits exactly at
 * cutouts/<productId>/<uuid>-<size>.<ext> in our own bucket. Saves lock the settings row, so
 * two admins saving at once cannot lose each other's cut-outs.
 */
const BUCKET_PREFIX = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "") + "/storage/v1/object/public/product-images/";

const saveSchema = z.object({ productId: z.string().regex(PRODUCT_ID), cutout: storedCutoutSchema });

const fileIsValid = (productId: string, url: string, path: string) =>
  BUCKET_PREFIX.startsWith("http") && cutoutPathFor(productId).test(path) && url === BUCKET_PREFIX + path;

/** Removes a cut-out's files, but only ones inside that product's own cut-out folder. */
async function removeFiles(productId: string, c: StoredCutout | undefined) {
  if (!c) return;
  const paths = [c.largePath, c.smallPath].filter((p) => cutoutPathFor(productId).test(p));
  if (paths.length) await createSupabaseServiceClient().storage.from("product-images").remove(paths).catch(() => {});
}

/** Read, change and write the store inside one transaction that locks the row. */
async function updateStore(change: (store: Record<string, StoredCutout>) => Record<string, StoredCutout>) {
  const result = await db.transaction(async (tx) => {
    await tx.select().from(schema.siteSettings).where(eq(schema.siteSettings.key, CUTOUTS_KEY)).for("update");
    const before = await readCutoutStoreStrict(tx);
    const after = change(before);
    await tx.insert(schema.siteSettings).values({ key: CUTOUTS_KEY, value: after })
      .onConflictDoUpdate({ target: schema.siteSettings.key, set: { value: after } });
    return before;
  });
  revalidateTag(CUTOUTS_CACHE_TAG);
  revalidatePath("/[locale]", "layout");   // every page, both languages
  return result;
}

export async function getCutoutForProduct(productId: string): Promise<StoredCutout | null> {
  await requirePermission("products");
  if (!PRODUCT_ID.test(productId)) return null;
  return (await getStoredCutoutsUncached())[productId] ?? null;
}

export async function saveCutout(input: z.infer<typeof saveSchema>): Promise<{ ok: true } | { ok: false; error: string }> {
  await requirePermission("products");
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "The cut-out could not be read. Please try again." };
  const { productId, cutout } = parsed.data;
  if (!fileIsValid(productId, cutout.large, cutout.largePath) || !fileIsValid(productId, cutout.small, cutout.smallPath)) {
    return { ok: false, error: "The picture must come from our own storage." };
  }
  const [product] = await db.select({ id: schema.products.id }).from(schema.products).where(eq(schema.products.id, productId)).limit(1);
  if (!product) return { ok: false, error: "That product no longer exists." };
  try {
    const before = await updateStore((store) => ({ ...store, [productId]: cutout }));
    await removeFiles(productId, before[productId]);
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not save just now. Please try again in a moment." };
  }
}

export async function removeCutout(productId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await requirePermission("products");
  if (!PRODUCT_ID.test(productId)) return { ok: false, error: "Unknown product." };
  try {
    const before = await updateStore((store) => Object.fromEntries(Object.entries(store).filter(([id]) => id !== productId)));
    await removeFiles(productId, before[productId]);
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not remove just now. Please try again in a moment." };
  }
}
