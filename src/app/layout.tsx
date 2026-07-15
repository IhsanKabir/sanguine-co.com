import type { Metadata } from "next";
import "./globals.css";

import { SITE_URL as BASE } from "@/lib/site-url";

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: { default: "Sanguine", template: "%s · Sanguine" },
  description: "Garments, flora & small ceremonies for the violet hour. A Bangladeshi maison, slowly assembled.",
  applicationName: "Sanguine",
  // Both tokens stay: the first is the original May property, the second is
  // the owner's live Search Console property for sanguine-co.com (2026-07-14).
  verification: {
    google: [
      "ZKS_JSSguTq9M5qdH24Y4p8m5XKUXnHuvXI2CNMQPdM",
      "OheUYwamOmq0R_NxVHeQfisToMNucm4RvpF4xotnp7A",
    ],
  },
  // No `keywords` — Google has ignored meta keywords since 2009 and Bing
  // treats large keyword lists as a weak spam signal. Targeting lives in
  // page-level title / description copy.
  openGraph: {
    type: "website",
    siteName: "Sanguine",
    locale: "en_BD",
    alternateLocale: ["bn_BD"],
    url: BASE,
    title: "Sanguine",
    description: "Garments, flora & small ceremonies for the violet hour.",
    // Generic maison card rendered by /api/og (wordmark + tagline, 1200×630).
    // Pages with richer context (PDP) override this with their own card.
    images: [{ url: "/api/og", width: 1200, height: 630, alt: "Sanguine" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sanguine",
    images: ["/api/og"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      // Google Search only shows a SERP favicon that is >=48px (multiple of
      // 48) or SVG — the .ico ships 16/32px layers only, which is why results
      // showed the generic globe next to competitors' logos. SVG qualifies.
      { url: "/favicon-source.svg", type: "image/svg+xml" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  formatDetection: { email: false, address: false, telephone: false },
};

// Pass-through: <html>/<body> live in [locale]/layout.tsx, which knows its
// locale STATICALLY from params. Reading the locale here (via next-intl's
// getLocale) required request headers, which forced every route in the app
// into dynamic rendering — no page ever served from the static/ISR cache.
// The root not-found document renders its own <html> for the same reason.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
