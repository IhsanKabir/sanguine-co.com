import type { Metadata } from "next";
import { Inter, Cormorant_Garamond, JetBrains_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { getLocale } from "next-intl/server";
import "./globals.css";
import JsonLd from "@/components/seo/JsonLd";

const BASE = (process.env.NEXT_PUBLIC_SITE_URL || "https://saanguine-the-retail-shop.vercel.app").replace(/\/$/, "");

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
  title: { default: "Saanguine Maison", template: "%s · Saanguine" },
  description: "Garments, flora & small ceremonies for the violet hour. A Bangladeshi maison, slowly assembled.",
  applicationName: "Saanguine",
  // No `keywords` — Google has ignored meta keywords since 2009 and Bing
  // treats large keyword lists as a weak spam signal. Targeting lives in
  // page-level title / description copy.
  openGraph: {
    type: "website",
    siteName: "Saanguine Maison",
    locale: "en_BD",
    alternateLocale: ["bn_BD"],
    url: BASE,
    title: "Saanguine Maison",
    description: "Garments, flora & small ceremonies for the violet hour.",
  },
  twitter: { card: "summary_large_image", title: "Saanguine Maison" },
  formatDetection: { email: false, address: false, telephone: false },
};

const organizationLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Maison Saanguine",
  alternateName: "Saanguine",
  url: BASE,
  logo: `${BASE}/logo.png`,
  description: "Garments, flora & small ceremonies for the violet hour. A Bangladeshi maison, slowly assembled.",
  email: "concierge@saanguine.com",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Dhaka",
    addressCountry: "BD",
  },
};

const websiteLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Saanguine Maison",
  url: BASE,
  inLanguage: ["en-BD", "bn-BD"],
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${BASE}/en/shop?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
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
