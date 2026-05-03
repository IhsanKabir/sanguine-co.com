import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, and, inArray } from "drizzle-orm";
import { routing } from "@/i18n/routing";

const BASE = (process.env.NEXT_PUBLIC_SITE_URL || "https://saanguine-the-retail-shop.vercel.app").replace(/\/$/, "");
const LOCALES = routing.locales;

function toDate(d: Date | string | null | undefined): string {
  if (!d) return new Date().toISOString().split("T")[0];
  return new Date(d).toISOString().split("T")[0];
}

function urlBlock(loc: string, lastmod: string, changefreq: string, priority: string): string {
  return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

function entries(path: string, opts: { lastmod?: string; changefreq?: string; priority?: string } = {}): string[] {
  const lastmod = opts.lastmod ?? toDate(new Date());
  const changefreq = opts.changefreq ?? "weekly";
  const priority = opts.priority ?? "0.7";
  return LOCALES.map((locale) =>
    urlBlock(`${BASE}/${locale}${path}`, lastmod, changefreq, priority),
  );
}

export async function GET() {
  const today = toDate(new Date());

  const blocks: string[] = [
    ...entries("", { changefreq: "daily", priority: "1.0", lastmod: today }),
    ...entries("/legal/privacy", { changefreq: "yearly", priority: "0.3" }),
    ...entries("/legal/terms", { changefreq: "yearly", priority: "0.3" }),
    ...entries("/legal/returns", { changefreq: "yearly", priority: "0.3" }),
    ...entries("/legal/shipping", { changefreq: "yearly", priority: "0.3" }),
  ];

  try {
    const segs = await db.select().from(schema.segments).where(eq(schema.segments.hidden, false));
    for (const s of segs) {
      blocks.push(...entries(`/shop/${s.id}`, { changefreq: "weekly", priority: "0.8" }));
    }

    if (segs.length > 0) {
      const segIds = segs.map((s) => s.id);
      const products = await db
        .select({ slug: schema.products.slug, updatedAt: schema.products.updatedAt })
        .from(schema.products)
        .where(and(eq(schema.products.status, "live"), inArray(schema.products.segmentId, segIds)));
      for (const p of products) {
        blocks.push(
          ...entries(`/product/${p.slug}`, {
            changefreq: "weekly",
            priority: "0.6",
            lastmod: toDate(p.updatedAt),
          }),
        );
      }
    }
  } catch {
    // DB unavailable — serve static-only sitemap
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${blocks.join("\n")}\n</urlset>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
