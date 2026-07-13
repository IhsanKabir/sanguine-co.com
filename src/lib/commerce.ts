import { unstable_cache } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "./db";
import { DEFAULT_PREORDER_DEPOSIT_PCT, DEFAULT_RETURN_WINDOW_DAYS } from "./pricing";

/**
 * Global commerce settings (site_settings.commerce, key/jsonb) — the owner's
 * levers for the quotation-driven pricing model:
 *   preorderDepositPct — % of the quoted price prepaid to confirm a preorder
 *   returnWindowDays   — default return window (products may override)
 *
 * Cached with tag-based invalidation exactly like lib/copy.ts: the admin
 * Settings action revalidates COMMERCE_CACHE_TAG after every save. Never
 * throws — the storefront must render on defaults if the DB is unreachable.
 */

export const COMMERCE_KEY = "commerce";
export const COMMERCE_CACHE_TAG = "site-commerce";

const commerceSchema = z.object({
  preorderDepositPct: z.number().int().min(1).max(100),
  returnWindowDays: z.number().int().min(0).max(365),
});

export type CommerceSettings = z.infer<typeof commerceSchema>;

export const COMMERCE_DEFAULTS: CommerceSettings = {
  preorderDepositPct: DEFAULT_PREORDER_DEPOSIT_PCT,
  returnWindowDays: DEFAULT_RETURN_WINDOW_DAYS,
};

export const getCommerceSettings = unstable_cache(
  async (): Promise<CommerceSettings> => {
    try {
      const rows = await db
        .select()
        .from(schema.siteSettings)
        .where(eq(schema.siteSettings.key, COMMERCE_KEY))
        .limit(1);
      if (!rows[0]) return COMMERCE_DEFAULTS;
      const parsed = commerceSchema.safeParse(rows[0].value);
      return parsed.success ? parsed.data : COMMERCE_DEFAULTS;
    } catch {
      return COMMERCE_DEFAULTS;
    }
  },
  ["site-commerce"],
  { tags: [COMMERCE_CACHE_TAG] },
);
