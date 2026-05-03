import type { MetadataRoute } from "next";
import { db, schema } from "@/lib/db";
import { eq, and, inArray } from "drizzle-orm";
import { routing } from "@/i18n/routing";

const BASE = (process.env.NEXT_PUBLIC_SITE_URL || "https://saanguine-the-retail-shop.vercel.app").replace(/\/$/, "");
const LOCALES = routing.locales;

/**
 * Build the alternates map for a path. Used by Google to discover the
 * translated variants of every URL.
 */
function alternates(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const l of LOCALES) {
    // BCP-47 region tag — Google treats `en-BD` / `bn-BD` as a stronger
    // geo-targeting signal than bare `en` / `bn`, and Mr Porter / Net-A-Porter
    // both use the regional form. Bengali in Bangladesh is the only locale
    // we serve, so the region is unambiguous.
    out[`${l}-BD`] = `${BASE}/${l}${path}`;
  }
  // x-default lets Google pick a sensible default for users with no
  // language match (typical international visitors land here).
  out["x-default"] = `${BASE}/en${path}`;
  return out;
}

function entry(
  path: string,
  opts?: Partial<Omit<MetadataRoute.Sitemap[number], "url" | "alternates">>,
): MetadataRoute.Sitemap {
  return LOCALES.map((locale) => ({
    url: `${BASE}/${locale}${path}`,
    lastModified: opts?.lastModified ?? new Date(),
    changeFrequency: opts?.changeFrequency ?? "weekly",
    priority: opts?.priority ?? 0.7,
    alternates: { languages: alternates(path) },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    ...entry("", { priority: 1.0, changeFrequency: "daily" }),
    // /wishlist intentionally omitted — content is per-visitor (localStorage)
    // and the page has `robots: noindex`. See SEO-AUDIT.md.
    ...entry("/legal/privacy", { priority: 0.3, changeFrequency: "yearly" }),
    ...entry("/legal/terms", { priority: 0.3, changeFrequency: "yearly" }),
    ...entry("/legal/returns", { priority: 0.3, changeFrequency: "yearly" }),
    ...entry("/legal/shipping", { priority: 0.3, changeFrequency: "yearly" }),
  ];

  let segmentRoutes: MetadataRoute.Sitemap = [];
  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const segs = await db.select().from(schema.segments).where(eq(schema.segments.hidden, false));
    segmentRoutes = segs.flatMap((s) => entry(`/shop/${s.id}`, { priority: 0.8, changeFrequency: "weekly" }));

    if (segs.length > 0) {
      const segIds = segs.map((s) => s.id);
      const products = await db
        .select({ slug: schema.products.slug, updatedAt: schema.products.updatedAt })
        .from(schema.products)
        .where(and(eq(schema.products.status, "live"), inArray(schema.products.segmentId, segIds)));
      productRoutes = products.flatMap((p) =>
        entry(`/product/${p.slug}`, {
          priority: 0.6,
          changeFrequency: "weekly",
          lastModified: p.updatedAt ?? new Date(),
        }),
      );
    }
  } catch {
    // DB unavailable at build time — return static-only sitemap.
  }

  return [...staticRoutes, ...segmentRoutes, ...productRoutes];
}
