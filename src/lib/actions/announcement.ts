"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { db, schema } from "@/lib/db";
import { requirePermission } from "@/lib/auth-utils";
import {
  ANNOUNCEMENT_CACHE_TAG,
  ANNOUNCEMENT_KEY,
  announcementSchema,
  type Announcement,
} from "@/lib/announcement";

/**
 * Save the scheduled announcement (EXECUTION-PLAN 4.3). Gated on the same
 * `editorial` permission as the copy library — the announcement bar is
 * explicitly part of the Editorial subadmin template's remit.
 */
export async function updateAnnouncement(
  input: Announcement,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requirePermission("editorial");

  const parsed = announcementSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid announcement payload." };
  const data = parsed.data;

  if (data.startAt && data.endAt && new Date(data.startAt) >= new Date(data.endAt)) {
    return { ok: false, error: "The end of the window must come after its start." };
  }
  if (data.enabled && !data.textEn.trim() && !data.textBn.trim()) {
    return { ok: false, error: "An enabled announcement needs text in at least one language." };
  }

  await db
    .insert(schema.siteSettings)
    .values({ key: ANNOUNCEMENT_KEY, value: data })
    .onConflictDoUpdate({ target: schema.siteSettings.key, set: { value: data } });

  revalidateTag(ANNOUNCEMENT_CACHE_TAG);
  // SSG storefront pages bake the bar into their HTML — rebuild them so the
  // save is visible on the very next request (same idiom as the copy library).
  for (const locale of ["en", "bn"]) {
    revalidatePath(`/${locale}`, "layout");
  }
  return { ok: true };
}
