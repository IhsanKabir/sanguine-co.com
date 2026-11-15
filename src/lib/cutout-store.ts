import { unstable_cache } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "./db";
import type { Cutout } from "./cutouts";

/**
 * Cut-outs uploaded in the admin, in site_settings.cutouts as { [productId]: StoredCutout }.
 * No new table: one small JSON row, cached (5 minutes, and busted on every save).
 *
 * Failure rules (code review, 15 Nov 2026):
 *  - the storefront read never throws, but a database error is not cached: the cached
 *    function throws, and only the caller falls back to "no uploaded cut-outs";
 *  - entries are checked one by one, so one bad entry drops only itself;
 *  - the write path reads with readCutoutStoreStrict, which throws on any problem, so a
 *    failed read can never be written back as an empty store.
 */
export const CUTOUTS_KEY = "cutouts";
export const CUTOUTS_CACHE_TAG = "site-cutouts";
const REVALIDATE_SECONDS = 300;

export const PRODUCT_ID = /^[\w-]{1,120}$/;
/** Where an uploaded cut-out may live: cutouts/<productId>/<uuid>-<900|450>.<webp|png>. */
export function cutoutPathFor(productId: string): RegExp {
  return new RegExp(`^cutouts/${productId.replace(/[^\w-]/g, "")}/[0-9a-f-]{36}-(900|450)\\.(webp|png)$`);
}

export const storedCutoutSchema = z.object({
  large: z.string().url(),
  small: z.string().url(),
  width: z.number().int().min(1).max(4000),
  height: z.number().int().min(1).max(4000),
  /** Storage paths, so the files can be removed when the cut-out is replaced. */
  largePath: z.string().max(500),
  smallPath: z.string().max(500),
});
export type StoredCutout = z.infer<typeof storedCutoutSchema>;

/** Every valid entry of a stored value; anything malformed is skipped, not fatal. */
function validEntries(value: unknown): Record<string, StoredCutout> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, StoredCutout> = {};
  for (const [id, entry] of Object.entries(value)) {
    const parsed = storedCutoutSchema.safeParse(entry);
    if (PRODUCT_ID.test(id) && parsed.success) out[id] = parsed.data;
  }
  return out;
}

/** For writes: the current store. Throws if the database cannot be read. */
export async function readCutoutStoreStrict(tx: Pick<typeof db, "select"> = db): Promise<Record<string, StoredCutout>> {
  const rows = await tx.select().from(schema.siteSettings).where(eq(schema.siteSettings.key, CUTOUTS_KEY)).limit(1);
  return validEntries(rows[0]?.value ?? {});
}

/** For the admin panel: never throws. */
export async function getStoredCutoutsUncached(): Promise<Record<string, StoredCutout>> {
  try {
    return await readCutoutStoreStrict();
  } catch {
    return {};
  }
}

const cachedCutouts = unstable_cache(
  async (): Promise<Record<string, Cutout>> => {
    const stored = await readCutoutStoreStrict();   // throws on a database error: never cached
    return Object.fromEntries(Object.entries(stored).map(([id, c]) => [id, { large: c.large, small: c.small, width: c.width, height: c.height }]));
  },
  ["site-cutouts"],
  { tags: [CUTOUTS_CACHE_TAG], revalidate: REVALIDATE_SECONDS },
);

/** For the storefront: product id to cut-out; on a database error, none (the built-in ones still show). */
export async function getUploadedCutouts(): Promise<Record<string, Cutout>> {
  try {
    return await cachedCutouts();
  } catch {
    return {};
  }
}
