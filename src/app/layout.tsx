import type { Metadata } from "next";
import { Inter, Cormorant_Garamond, JetBrains_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { getLocale } from "next-intl/server";
import "./globals.css";
import JsonLd from "@/components/seo/JsonLd";

import { SITE_URL as BASE } from "@/lib/site-url";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});
const jbMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: { default: "Sanguine", template: "%s · Sanguine" },
  description: "Garments, flora & small ceremonies for the violet hour. A Bangladeshi maison, slowly assembled.",
  applicationName: "Sanguine",
  verification: { google: "ZKS_JSSguTq9M5qdH24Y4p8m5XKUXnHuvXI2CNMQPdM" },
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
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  formatDetection: { email: false, address: false, telephone: false },
};

// Canonical entity name is "Sanguine" everywhere — JSON-LD, OG,
// manifest, brand copy. Inconsistent naming delays Google Knowledge Panel
// disambiguation. `sameAs` lists only *claimed* external profiles for the brand.
const organizationLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Sanguine",
  url: BASE,
  logo: `${BASE}/logo.png`,
  description: "A Bangladeshi maison for perfume, flora, books and small ceremonies — slowly assembled with the patience of a florist.",
  email: "concierge@sanguine-co.com",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Dhaka",
    addressCountry: "BD",
  },
  // Only CLAIMED profiles — unclaimed handles muddy Knowledge Panel
  // disambiguation. Add more (Instagram etc.) as the accounts are created.
  sameAs: [
    "https://www.facebook.com/profile.php?id=61591619233431",
  ],
};

// SearchAction removed 2026-05-03 — the query-string URL template
// (`/en/shop?q=`) is disallowed by robots.txt's `/*?*` rule, so emitting
// it as a SearchAction was inaccurate. Restore once we have a stable
// crawlable search results URL.
const websiteLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Sanguine",
  url: BASE,
  inLanguage: ["en-BD", "bn-BD"],
};

// `lang` is sourced from next-intl's `getLocale()` so SSR / SSG / Googlebot
// see the correct `lang="bn"` for Bengali pages on first paint. Previously
// `HtmlLangSync` patched it client-side after hydration, which crawlers
// never see. WCAG 3.1.1 also requires this to be correct.
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${inter.variable} ${cormorant.variable} ${jbMono.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <JsonLd data={[organizationLd, websiteLd]} />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
