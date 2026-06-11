import type { MetadataRoute } from "next";
import { db, schema } from "@/lib/db";
import { eq, and, inArray } from "drizzle-orm";
import { routing } from "@/i18n/routing";

import { SITE_URL as BASE } from "@/lib/site-url";
const LOCALES = routing.locales;

function entry(
  path: string,
  opts?: Partial<Omit<MetadataRoute.Sitemap[number], "url" | "alternates">>,
): MetadataRoute.Sitemap {
  return LOCALES.map((locale) => ({
    url: `${BASE}/${locale}${path}`,
    lastModified: opts?.lastModified ?? new Date(),
    changeFrequency: opts?.changeFrequency ?? "weekly",
    priority: opts?.priority ?? 0.7,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    ...entry("", { priority: 1.0, changeFrequency: "daily" }),
    ...entry("/atelier", { priority: 0.6, changeFrequency: "monthly" }),
    ...entry("/journal", { priority: 0.6, changeFrequency: "monthly" }),
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
    // DB unavailable — return static-only sitemap
  }

  return [...staticRoutes, ...segmentRoutes, ...productRoutes];
}
