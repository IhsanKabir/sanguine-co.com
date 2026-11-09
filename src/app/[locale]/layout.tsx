import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import Script from "next/script";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { routing } from "@/i18n/routing";
import { fontClasses } from "@/app/fonts";
import { organizationLd, websiteLd } from "@/lib/site-ld";
import JsonLd from "@/components/seo/JsonLd";
import { getCommerceSettings, shippingRulesOf } from "@/lib/commerce";
import { ShippingRulesProvider } from "@/lib/shipping-rules-context";
import TopNav from "@/components/storefront/TopNav";
import Footer from "@/components/storefront/Footer";
import { CartProvider } from "@/lib/cart-context";
import { WishlistProvider } from "@/lib/wishlist-context";
import CartDrawer from "@/components/storefront/CartDrawer";
import RouteTransition from "@/components/storefront/RouteTransition";
import SessionTracker from "@/components/storefront/SessionTracker";
import FloatingChat from "@/components/storefront/FloatingChat";
import CookieConsent from "@/components/storefront/CookieConsent";
import { CONSENT_BOOT_SCRIPT } from "@/lib/consent-key";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }
  setRequestLocale(locale);
  const messages = await getMessages();
  const t = await getTranslations();

  // Saved shipping rules (Admin → Settings) for the browser-side cart,
  // drawer and checkout; cached and tag-busted on save.
  const shippingRules = shippingRulesOf(await getCommerceSettings());

  // This layout owns <html> (the root layout is a pass-through): `lang` comes
  // statically from the [locale] param, so crawlers get the correct lang="bn"
  // on first paint WITHOUT the request-time getLocale() read that used to
  // force the whole app into dynamic rendering.
  return (
    <html lang={locale} className={fontClasses} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: CONSENT_BOOT_SCRIPT }} />
        <JsonLd data={[organizationLd, websiteLd]} />
        <NextIntlClientProvider messages={messages}>
          <SessionTracker />
      <a href="#main" className="skip-link">{t("common.skipToContent")}</a>
      <ShippingRulesProvider rules={shippingRules}>
      <CartProvider>
        <WishlistProvider>
          <TopNav />
          <main id="main"><RouteTransition>{children}</RouteTransition></main>
          <Footer />
          <CartDrawer />
          <FloatingChat />
          <CookieConsent />
        </WishlistProvider>
      </CartProvider>
      </ShippingRulesProvider>
          {/* cursor.js runs the scroll reveal, so it stays afterInteractive.
           *  moments.js and atier.js (sound, wax-seal loader, word-by-word
           *  hero line, canvas orrery) were removed for speed: atier.js alone
           *  cost ~1.3 s of main thread and delayed the home LCP text. */}
          <Script src="/cursor.js" strategy="afterInteractive" />
          {/* Cloudflare Analytics removed 2026-05-03: Vercel Analytics +
           *   Speed Insights are now the canonical telemetry stack. Two
           *   beacons per pageview is wasteful at our scale. */}
        </NextIntlClientProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
