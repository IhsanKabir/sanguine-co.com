import { unstable_cache } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "./db";

/**
 * The home page's "Moments" band: one campaign at a time (an anniversary, Valentine's, Eid,
 * Mother's Day), edited in Admin, Editorial, and stored in site_settings.moments. Optional
 * dates show it only in a window, so the next campaign can be set up ahead.
 *
 * Titles may mark one phrase with <em>...</em> (shown in the accent colour); nothing else is
 * read as markup. "{cutoff}" in the text becomes the same-day cutoff (Admin, Settings).
 * Without a saved row, the band shows the first campaign: the cat film.
 */
export const MOMENTS_KEY = "moments";
export const MOMENTS_CACHE_TAG = "site-moments";

/** A link inside the site ("/occasion/anniversary") or on the page ("#shelf"); never elsewhere. */
const localHref = z.string().max(200).regex(/^(\/(?!\/)[\w\-/]*|#[\w-]+)$/, "Use a link inside the site, like /occasion/anniversary or #shelf.")
  .refine((h) => !/^\/(admin|api)(\/|$)/.test(h), "The button cannot link to the admin.");
/** Our own bundled picture or one uploaded to our bucket. */
const imageUrl = z.string().max(500).refine(
  (u) => !u.includes("..") && !u.includes("?") && !u.includes("#") &&
    (u.startsWith("/moments/") || u.startsWith((process.env.NEXT_PUBLIC_SUPABASE_URL ?? "\u0000").replace(/\/$/, "") + "/storage/v1/object/public/product-images/moments/")),
  "The picture must be one of ours.",
);

/** A short film bundled with the site (public/moments/*.mp4); the image is its poster. */
const videoUrl = z.string().max(200).regex(/^\/moments\/[\w-]+\.mp4$/,"The film must be one of ours.");

export const momentsSchema = z.object({
  enabled: z.boolean(),
  image: imageUrl,
  /** Optional: plays in place of the picture (muted, with a sound button). Older rows have none. */
  video: videoUrl.nullable().optional(),
  imageAltEn: z.string().max(200),
  imageAltBn: z.string().max(200),
  titleEn: z.string().max(160),
  titleBn: z.string().max(160),
  bodyEn: z.string().max(300),
  bodyBn: z.string().max(300),
  ctaEn: z.string().max(40),
  ctaBn: z.string().max(40),
  href: localHref,
  startAt: z.string().datetime({ offset: true }).nullable(),
  endAt: z.string().datetime({ offset: true }).nullable(),
});
export type Moments = z.infer<typeof momentsSchema>;

export const MOMENTS_DEFAULT: Moments = {
  enabled: true,
  image: "/moments/cats-anniversary.webp",
  video: "/moments/cats-anniversary.mp4",
  imageAltEn: "Two cartoon cats: she is cross, he forgot their anniversary",
  imageAltBn: "কার্টুনের দুটি বিড়াল: সে রাগ করেছে, আর সে বিবাহবার্ষিকী ভুলে গেছে",
  titleEn: "Forgot your anniversary? <em>It's not too late.</em>",
  titleBn: "বিবাহবার্ষিকী ভুলে গেছেন? <em>দেরি হয়নি এখনো।</em>",
  bodyEn: "Order by {cutoff} and choose same-day express: the bouquet arrives today.",
  bodyBn: "{cutoff}-এর মধ্যে অর্ডার করে একই দিনের এক্সপ্রেস বেছে নিন: তোড়া আজই পৌঁছে যাবে।",
  ctaEn: "Choose a bouquet",
  ctaBn: "তোড়া বেছে নিন",
  href: "#shelf",
  startAt: null,
  endAt: null,
};

/** Shown when the database cannot be read: nothing, so a band switched off never comes back by accident. */
const MOMENTS_OFF: Moments = { ...MOMENTS_DEFAULT, enabled: false };

/** Throws on a database error. No saved row: the first campaign. A malformed row: nothing shown. */
async function readMoments(): Promise<Moments> {
  const rows = await db.select().from(schema.siteSettings).where(eq(schema.siteSettings.key, MOMENTS_KEY)).limit(1);
  if (!rows[0]) return MOMENTS_DEFAULT;
  const parsed = momentsSchema.safeParse(rows[0].value);
  if (!parsed.success) return MOMENTS_OFF;
  // Saved before films existed, still the cat poster: the cat film plays with it.
  if (parsed.data.video === undefined && parsed.data.image === MOMENTS_DEFAULT.image) return { ...parsed.data, video: MOMENTS_DEFAULT.video };
  return parsed.data;
}

/** For the admin form: never throws. */
export async function getMomentsUncached(): Promise<Moments> {
  try {
    return await readMoments();
  } catch {
    return MOMENTS_DEFAULT;
  }
}

/** For the storefront: cached for 5 minutes (and busted on save); a failed read is never cached. */
const cachedMoments = unstable_cache(readMoments, ["site-moments"], { tags: [MOMENTS_CACHE_TAG], revalidate: 300 });
export async function getMoments(): Promise<Moments> {
  try {
    return await cachedMoments();
  } catch {
    return MOMENTS_OFF;
  }
}

/** Whether the band shows at this moment: switched on, and inside its dates when it has any. */
export function momentsLive(m: Moments, now: Date): boolean {
  if (!m.enabled) return false;
  if (m.startAt && now < new Date(m.startAt)) return false;
  if (m.endAt && now >= new Date(m.endAt)) return false;
  return true;
}

/** A title split into plain text and the one <em> phrase, for safe rendering (no HTML is injected). */
export function splitEm(title: string): { before: string; em: string; after: string } {
  const m = title.match(/^([\s\S]*?)<em>([\s\S]*?)<\/em>([\s\S]*)$/);
  return m ? { before: m[1], em: m[2], after: m[3] } : { before: title, em: "", after: "" };
}
