"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { db, schema } from "@/lib/db";
import { requirePermission } from "@/lib/auth-utils";
import { MOMENTS_CACHE_TAG, MOMENTS_KEY, momentsSchema, type Moments } from "@/lib/moments";

/** Save the home page's Moments band (lib/moments.ts). Same permission as the announcement. */
export async function updateMoments(input: Moments): Promise<{ ok: true } | { ok: false; error: string }> {
  await requirePermission("editorial");
  const parsed = momentsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the fields." };
  const data = parsed.data;
  if (data.startAt && data.endAt && new Date(data.startAt) >= new Date(data.endAt)) {
    return { ok: false, error: "The end date must come after the start." };
  }
  if (data.enabled && (!data.titleEn.trim() || !data.ctaEn.trim())) {
    return { ok: false, error: "A shown band needs at least an English title and button text." };
  }
  await db.insert(schema.siteSettings).values({ key: MOMENTS_KEY, value: data })
    .onConflictDoUpdate({ target: schema.siteSettings.key, set: { value: data } });
  revalidateTag(MOMENTS_CACHE_TAG);
  revalidatePath("/[locale]", "layout");   // every page, both languages
  return { ok: true };
}
