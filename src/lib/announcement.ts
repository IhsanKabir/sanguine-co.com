import { unstable_cache } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "./db";

/**
 * Scheduled announcement bar — EXECUTION-PLAN Phase 4.3.
 *
 * Promotes the topbar announcement from a plain copy string
 * (`topbar.announcement`, editable via the copy library) to a first-class
 * scheduled object in `site_settings.announcement`:
 *
 *   { enabled, textEn, textBn, startAt, endAt, dismissible, tone }
 *
 * When the row is disabled or absent the storefront falls back to the
 * static `topbar.announcement` translation — existing behaviour, untouched.
 * Same storage + caching idiom as the copy library (copy.ts).
 */

// Plan R-4.C: only "neutral" and "celebration" tones ship — a red "warn"
// style clashes with the maison register.
export const announcementSchema = z.object({
  enabled: z.boolean().default(false),
  textEn: z.string().max(200).default(""),
  textBn: z.string().max(200).default(""),
  // ISO timestamps (UTC). Null = unbounded on that side.
  startAt: z.string().datetime({ offset: true }).nullable().default(null),
  endAt: z.string().datetime({ offset: true }).nullable().default(null),
  dismissible: z.boolean().default(true),
  tone: z.enum(["neutral", "celebration"]).default("neutral"),
});

export type Announcement = z.infer<typeof announcementSchema>;

export const ANNOUNCEMENT_KEY = "announcement";
export const ANNOUNCEMENT_CACHE_TAG = "site-announcement";

/**
 * Cached read — `updateAnnouncement` busts the tag on every save, so even
 * statically-optimised pages pick the new row up on the next request.
 * Returns null when the row is missing, malformed, or the DB is unreachable;
 * the storefront then falls back to the static translation. Never throws.
 */
export const getAnnouncement = unstable_cache(
  async (): Promise<Announcement | null> => {
    try {
      const rows = await db
        .select()
        .from(schema.siteSettings)
        .where(eq(schema.siteSettings.key, ANNOUNCEMENT_KEY))
        .limit(1);
      if (!rows[0]) return null;
      const parsed = announcementSchema.safeParse(rows[0].value);
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  },
  ["site-announcement"],
  { tags: [ANNOUNCEMENT_CACHE_TAG] },
);

/** Uncached read for the admin editor — always shows what is stored. */
export async function getAnnouncementUncached(): Promise<Announcement | null> {
  try {
    const rows = await db
      .select()
      .from(schema.siteSettings)
      .where(eq(schema.siteSettings.key, ANNOUNCEMENT_KEY))
      .limit(1);
    if (!rows[0]) return null;
    const parsed = announcementSchema.safeParse(rows[0].value);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** True when `now` falls inside the configured window (open ends allowed). */
export function isWithinWindow(a: Announcement, now: Date): boolean {
  if (a.startAt && now < new Date(a.startAt)) return false;
  if (a.endAt && now > new Date(a.endAt)) return false;
  return true;
}

/**
 * Stable signature of the announcement's content. The storefront persists
 * the dismissal under this signature, so editing the text (or re-scheduling)
 * automatically resurfaces the bar for visitors who dismissed the old one.
 */
export function announcementSignature(a: Announcement): string {
  const raw = `${a.textEn}|${a.textBn}|${a.startAt ?? ""}|${a.endAt ?? ""}`;
  // djb2 — tiny, deterministic, collision-tolerant for this use.
  let h = 5381;
  for (let i = 0; i < raw.length; i++) h = ((h << 5) + h + raw.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
