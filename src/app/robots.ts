import type { MetadataRoute } from "next";

const BASE = (process.env.NEXT_PUBLIC_SITE_URL || "https://saanguine-the-retail-shop.vercel.app").replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        // `/api/og` must stay fetchable despite the `/api` + `/*?*` disallows
        // below — Google only shows OG images in rich results / Discover if
        // the image URL itself is crawlable. Longest-match precedence means
        // this allow rule wins for /api/og?slug=… on Google and Bing.
        allow: ["/", "/api/og"],
        disallow: [
          "/admin",         // private operations area
          "/api",           // server actions / webhook endpoints
          "/auth",          // OAuth callback handlers
          "/account",       // signed-in only
          "/checkout",      // transactional, not indexable
          "/preorder",      // signed-in bespoke request form
          "/*?*",           // anything with query parameters (cart state etc)
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
