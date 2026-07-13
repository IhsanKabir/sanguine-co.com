import type { MetadataRoute } from "next";

import { SITE_URL as BASE } from "@/lib/site-url";

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
        // Every customer-facing URL is locale-prefixed (/en/…, /bn/…) because
        // next-intl uses localePrefix:"always" — a bare "/account" prefix rule
        // never matches "/en/account", so each rule is emitted per locale too.
        disallow: [
          "/admin", "/en/admin", "/bn/admin",           // private operations area
          "/api",                                       // server actions / webhooks (not localized)
          "/auth", "/en/auth", "/bn/auth",              // OAuth callback handlers
          "/account", "/en/account", "/bn/account",     // signed-in only
          "/checkout", "/en/checkout", "/bn/checkout",  // transactional, not indexable
          "/preorder", "/en/preorder", "/bn/preorder",  // signed-in bespoke request form
          "/order", "/en/order", "/bn/order",           // confirmation/tracking pages hold PII
          "/*?*",                                       // anything with query parameters
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
