import { unstable_cache } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "./db";

/**
 * Copy override store.
 *
 * The base storefront strings live in `messages/en.json` and `messages/bn.json`.
 * The Editorial admin can override any of those strings without redeploying by
 * writing to the `site_settings.copy` row. Override map is dotted-path keyed:
 *
 *   {
 *     en: { "brand.tagline": "Threads, flora & small ceremonies", ... },
 *     bn: { "brand.tagline": "...", ... }
 *   }
 *
 * `i18n/request.ts` merges these on top of the static JSON for each request.
 */

const overridesSchema = z
  .object({
    en: z.record(z.string(), z.string()).default({}),
    bn: z.record(z.string(), z.string()).default({}),
  })
  .default({ en: {}, bn: {} });

export type CopyOverrides = z.infer<typeof overridesSchema>;

const EMPTY_OVERRIDES: CopyOverrides = { en: {}, bn: {} };

export const COPY_KEY = "copy";
export const COPY_CACHE_TAG = "site-copy-overrides";

// Cached at the Next.js full-route level with tag-based invalidation. The
// admin's `updateCopyOverrides` action calls `revalidateTag(COPY_CACHE_TAG)`
// after every save, so even statically-optimised pages pick up new copy on
// the very next request without us having to mark every page as dynamic.
//
// Returns the parsed overrides or an empty map if the row is missing or the
// DB is unreachable (build-time, transient outage) — never throws so the
// storefront always renders.
export const getCopyOverrides = unstable_cache(
  async (): Promise<CopyOverrides> => {
    try {
      const rows = await db
        .select()
        .from(schema.siteSettings)
        .where(eq(schema.siteSettings.key, COPY_KEY))
        .limit(1);
      if (!rows[0]) return EMPTY_OVERRIDES;
      const parsed = overridesSchema.safeParse(rows[0].value);
      return parsed.success ? parsed.data : EMPTY_OVERRIDES;
    } catch {
      return EMPTY_OVERRIDES;
    }
  },
  ["site-copy-overrides"],
  { tags: [COPY_CACHE_TAG] },
);

/**
 * Apply dotted-path overrides onto a deep copy of the messages object.
 * Returns the original object untouched if there are no overrides.
 */
export function applyCopyOverrides<T extends Record<string, unknown>>(
  messages: T,
  overrides: Record<string, string>,
): T {
  const keys = Object.keys(overrides);
  if (keys.length === 0) return messages;
  const merged = structuredClone(messages) as Record<string, unknown>;
  for (const path of keys) {
    const value = overrides[path];
    if (typeof value !== "string" || value.length === 0) continue;
    const segments = path.split(".");
    let cur: Record<string, unknown> = merged;
    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i];
      const next = cur[seg];
      if (typeof next !== "object" || next === null || Array.isArray(next)) {
        cur[seg] = {};
      }
      cur = cur[seg] as Record<string, unknown>;
    }
    cur[segments[segments.length - 1]] = value;
  }
  return merged as T;
}

/**
 * Walk a nested messages object and return a flat dotted-path keyed map of
 * every string leaf. ICU placeholders inside the strings are preserved as-is —
 * the admin form will surface them as plain text and trust the editor to keep
 * tokens like `{count}` intact.
 */
export function flattenMessages(
  obj: Record<string, unknown>,
  prefix = "",
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") {
      out[path] = v;
    } else if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      Object.assign(out, flattenMessages(v as Record<string, unknown>, path));
    }
  }
  return out;
}
