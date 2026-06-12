import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import Script from "next/script";
import { routing } from "@/i18n/routing";
import { getAudioSettings } from "@/lib/audio-settings";
import TopNav from "@/components/storefront/TopNav";
import Footer from "@/components/storefront/Footer";
import { CartProvider } from "@/lib/cart-context";
import { WishlistProvider } from "@/lib/wishlist-context";
import CartDrawer from "@/components/storefront/CartDrawer";
import RouteTransition from "@/components/storefront/RouteTransition";
import SessionTracker from "@/components/storefront/SessionTracker";
import FloatingChat from "@/components/storefront/FloatingChat";
import CookieConsent from "@/components/storefront/CookieConsent";

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

  // Admin-uploaded ambient audio (EXECUTION-PLAN 4.2). Only the URLs cross
  // to the client; atier.js plays the file when present and falls back to
  // its synth tone otherwise. Cached + tag-busted like the copy library.
  const audio = await getAudioSettings();
  const audioUrls: Record<string, string> = {};
  if (audio.gong) audioUrls.gong = audio.gong.url;
  if (audio.chime) audioUrls.chime = audio.chime.url;
  if (audio.seal) audioUrls.seal = audio.seal.url;

  return (
    <NextIntlClientProvider messages={messages}>
      <SessionTracker />
      <a href="#main" className="skip-link">Skip to content</a>
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
      {/* Plain inline tag (not next/script): executes during HTML parse, so
       *  window.SSG_AUDIO_URLS exists before the afterInteractive atier.js
       *  reads it. URLs are server-validated against our own bucket prefix;
       *  the </>/& escapes are defence-in-depth against script breakout. */}
      {Object.keys(audioUrls).length > 0 && (
        <script
          dangerouslySetInnerHTML={{
            __html: `window.SSG_AUDIO_URLS=${JSON.stringify(audioUrls)
              .replace(/</g, "\\u003c")
              .replace(/>/g, "\\u003e")
              .replace(/&/g, "\\u0026")};`,
          }}
        />
      )}
      {/* Atelier motion + custom cursor (ported verbatim from prototype). */}
      <Script src="/cursor.js" strategy="afterInteractive" />
      <Script src="/moments.js" strategy="afterInteractive" />
      <Script src="/atier.js" strategy="afterInteractive" />
      {/* Cloudflare Analytics removed 2026-05-03 — Vercel Analytics +
       *   Speed Insights are now the canonical telemetry stack. Two
       *   beacons per pageview is wasteful at our scale. */}
    </NextIntlClientProvider>
  );
}
