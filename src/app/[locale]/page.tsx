import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { priceDisplay, priceDisplayText } from "@/lib/pricing";
import { Link } from "@/i18n/routing";
import { getVisibleSegments, getLiveProducts, getHeroImagesFor } from "@/lib/queries";
import Composition from "@/components/storefront/Composition";
import ProductCard from "@/components/storefront/ProductCard";
import Icon from "@/components/storefront/Icon";
import NewsletterForm from "@/components/storefront/NewsletterForm";
import RecentlyViewedStrip from "@/components/storefront/RecentlyViewedStrip";
import HeroTide from "@/components/storefront/HeroTide";
import Ornament from "@/components/storefront/Ornament";
import JsonLd from "@/components/seo/JsonLd";
import { SITE_URL as BASE } from "@/lib/site-url";
import { getCommerceSettings } from "@/lib/commerce";
import { formatBdt } from "@/lib/utils";

// ISR: the homepage fires several catalogue queries per request and reads no
// cookies/auth — cache the rendered page. Admin edits still appear instantly
// because every admin action calls revalidateAllLocales() (revalidatePath
// purges this cache); 300s is only the safety net. Speed Insights showed the
// query-heavy routes gating FCP/LCP (home RES 72).
export const revalidate = 300;

type Props = { params: Promise<{ locale: string }> };

/**
 * Per-locale homepage metadata.
 *
 * The previous setup fell through to root-layout defaults — same title and
 * description for `/en` and `/bn`, no canonical, no in-page hreflang. The
 * homepage is the brand's highest-priority crawl target so it gets the most
 * specific metadata. Sources copy from next-intl messages so the admin copy
 * library can override `home.metaTitle` / `home.metaDescription` without a
 * redeploy.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  const isBn = locale === "bn";
  const url = `${BASE}/${locale}`;
  const title = t("home.metaTitle");
  const description = t("home.metaDescription");
  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        "en-BD": `${BASE}/en`,
        "bn-BD": `${BASE}/bn`,
        "x-default": `${BASE}/en`,
      },
    },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      locale: isBn ? "bn_BD" : "en_BD",
      siteName: "Sanguine",
      // Child openGraph replaces the root one wholesale, so the /api/og
      // maison card must be restated or the page ships with no og:image.
      images: [{ url: "/api/og", width: 1200, height: 630, alt: "Sanguine" }],
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

const MARQUEE_KEYS = ["atelierMade", "cod", "gift", "freeDelivery", "returns", "certified"];

const CAT_CURSOR: Record<string, string> = {
  clothing: "magnify",
  accessories: "magnify",
  perfume: "perfume",
  jewelry: "jewelry",
  flowers: "flowers",
  watches: "watches",
  books: "inkwell",
  anime: "anime",
  boardgames: "magnify",
};

export default async function Home({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const commerce = await getCommerceSettings();
  const freeOver = formatBdt(commerce.freeShippingThresholdBdt, locale as "en" | "bn");
  // A threshold of 0 switches free shipping off: drop that marquee point.
  const marqueeKeys = commerce.freeShippingThresholdBdt > 0
    ? MARQUEE_KEYS
    : MARQUEE_KEYS.filter((k) => k !== "freeDelivery");

  const [segments, newArrivals, editors] = await Promise.all([
    safeQuery(getVisibleSegments()),
    safeQuery(getLiveProducts({ tag: "new", limit: 4 })),
    safeQuery(getLiveProducts({ limit: 6 })),
  ]);

  const showSetupBanner = segments === null;
  const segs = segments ?? [];
  const news = newArrivals ?? [];
  const eds = editors ?? [];
  // Single batched fetch of hero images for every product on the page.
  const allProductIds = Array.from(new Set([...news, ...eds].map((p) => p.id)));
  const heroImages = allProductIds.length > 0
    ? await safeQuery(getHeroImagesFor(allProductIds)) ?? new Map()
    : new Map();

  // Bento takes the first 6 visible products
  const bento = (eds.length >= 6 ? eds : [...eds, ...news]).slice(0, 6);

  // Editorial product groupings exposed as ItemList structured data so
  // Google can surface featured products in image / shopping results.
  // Bergdorf Goodman / Mr Porter both ship this on their homepage.
  const homeListsLd = [
    news.length > 0 && {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: t("home.newThisWeek"),
      numberOfItems: news.length,
      itemListElement: news.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${BASE}/${locale}/product/${p.slug}`,
        name: (locale === "bn" && p.nameBn) || p.name,
      })),
    },
    eds.length > 0 && {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: t("home.editors"),
      numberOfItems: eds.length,
      itemListElement: eds.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${BASE}/${locale}/product/${p.slug}`,
        name: (locale === "bn" && p.nameBn) || p.name,
      })),
    },
  ].filter(Boolean) as Record<string, unknown>[];

  return (
    <>
      {homeListsLd.length > 0 && <JsonLd data={homeListsLd} />}
      {showSetupBanner && (
        <div style={{ background: "#fff8d4", borderBottom: "1px solid #c8a200", padding: "10px 20px", textAlign: "center", fontFamily: "var(--mono)", fontSize: 12, color: "#704d00" }}>
          ⚠ Database not configured · copy <code>.env.example</code> → <code>.env</code>, fill Supabase URL + DATABASE_URL, run <code>npm run db:migrate</code> + <code>npm run db:seed</code>.
        </div>
      )}

      {/* ─── Hero ─────────────────────────────────────────────────── */}
      <section className="hero" data-cursor="inkwell">
        <HeroTide />
        <div className="hero-inner">
          <div>
            <div className="hero-kicker">{t("home.kicker")}</div>
            <h1>
              {t("home.headlineLineOne")}<br />
              {t("home.headlineLineTwoStart")}<em>{t("home.headlineLineTwoEm")}</em><br />
              {t("home.headlineLineThree")}
            </h1>
            <p>{t("home.lede")}</p>
            <div className="hero-btns">
              {segs[0] && (
                <Link href={`/shop/${segs[0].id}`} className="btn btn-gold" data-magnetic data-cursor-label={t("home.cursorEnter")}>
                  {t("home.ctaPrimary")} <Icon name="arrow" size={14} />
                </Link>
              )}
              {segs.length > 0 && (
                <Link href="#departments" className="btn btn-ghost" data-magnetic style={{ borderColor: "var(--mauve)", color: "var(--mauve)" }}>
                  {t("home.ctaSecondary")}
                </Link>
              )}
            </div>
          </div>
          <div className="hero-still" aria-hidden="true">
            <div className="hs-frame" />
            <div className="hs-ring" />
            <div className="hs-numeral">MMXXVI</div>
            <div className="hs-rail">
              <span>{t("brand.name")}</span><span>·</span><span>{t("home.stillRail")}</span>
            </div>
            <div className="hs-cap">
              {t("home.stillCaption")}<small>{t("home.stillCaptionSmall")}</small>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Marquee — concise trust points ──────────────────────── */}
      <div className="marquee" data-cursor="default">
        <div className="marquee-track">
          {/* Listed twice so the scrolling track loops seamlessly. */}
          {[...marqueeKeys, ...marqueeKeys].map((k, i) => (
            <span key={k + i} aria-hidden={i >= marqueeKeys.length || undefined}>{t(`home.marquee.${k}`, { threshold: freeOver })}</span>
          ))}
        </div>
      </div>

      {/* ─── Departments / Wander the House ──────────────────────── */}
      {segs.length > 0 && (
        <section id="departments" className="section" data-cursor="magnify">
          <div className="section-hd" data-reveal>
            <div>
              <div className="kicker">{t("home.departments")}</div>
              <h2>{t("home.wanderTheHouse")}</h2>
              <div className="ornament-rule" />
            </div>
          </div>
          <div className="cat-grid">
            {segs.slice(0, 6).map((c, i) => (
              <Link
                key={c.id}
                href={`/shop/${c.id}`}
                className="cat-tile"
                data-reveal
                data-reveal-delay={(i % 3) + 1}
                data-cursor={CAT_CURSOR[c.id] || "magnify"}
                data-cursor-label={c.name}
              >
                <Composition cat={c.id} sku={c.id} name={c.name} style={{ position: "absolute", inset: 0 }} />
                <div className="cat-tile-lbl">
                  <div className="kicker">{c.tag}</div>
                  <div className="name">{c.name}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ─── New This Week ────────────────────────────────────────── */}
      {news.length > 0 && (
        <section className="section" style={{ paddingTop: 20 }} data-cursor="crosshair">
          <div className="section-hd" data-reveal>
            <div>
              <div className="kicker">{t("home.justArrived")}</div>
              <h2>{t("home.newThisWeek")}</h2>
              <div className="ornament-rule" />
            </div>
            {segs[0] && (
              <Link href={`/shop/${segs[0].id}`} className="link">{t("home.viewAll")} →</Link>
            )}
          </div>
          <div className="grid grid-4">
            {news.map((p, i) => {
              const seg = segs.find((s) => s.id === p.segmentId);
              return (
                <div key={p.id} data-reveal data-reveal-delay={i + 1}>
                  <ProductCard product={p} segmentTag={seg?.tag} heroImage={heroImages.get(p.id) ?? null} />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ─── Bento · A small cabinet of curiosities ─────────────── */}
      {bento.length > 0 && (
        <section className="section" data-cursor="crosshair">
          <div className="section-hd" data-reveal>
            <div>
              <div className="kicker">{t("home.atelier")}</div>
              <h2>{t("home.cabinet")}</h2>
              <div className="ornament-rule" />
            </div>
          </div>
          <div className="bento" data-reveal>
            {bento.map((p, i) => {
              const cls = ["b-1", "b-2", "b-3", "b-4", "b-3", "b-5"][i] || "b-3";
              const seg = segs.find((s) => s.id === p.segmentId);
              // Pricing rules, not raw priceBdt — quotation/preorder pieces
              // showed ৳0 here (and the hardcoded en-IN ignored bn).
              const display = priceDisplay(p);
              return (
                <Link
                  key={p.id}
                  href={`/product/${p.slug}`}
                  className={cls}
                  data-cursor={CAT_CURSOR[p.segmentId || ""] || "magnify"}
                >
                  <Composition cat={p.segmentId || "clothing"} sku={p.sku} name={p.name} tag={p.tag} image={heroImages.get(p.id) ?? null} />
                  <div className="b-overlay">
                    <div className="b-kicker">{seg?.tag}</div>
                    <h3 className="b-name">{p.name}</h3>
                    <div className="b-price">
                      {display.kind === "quote" ? t("pdp.priceOnQuote") : priceDisplayText(display, locale as "en" | "bn")}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <Ornament variant="spiral" size={64} />

      {/* ─── Journal · Atelier note ──────────────────────────────── */}
      <section className="journal" data-reveal data-cursor="inkwell">
        <div className="journal-inner">
          <div>
            <div className="journal-kicker">{t("home.note.kicker")}</div>
            <p className="journal-num">№<small>{t("home.note.num")}</small></p>
          </div>
          <div>
            <h2>{t.rich("home.note.title", { em: (c) => <em>{c}</em> })}</h2>
            <p>{t("home.note.p1")}</p>
            <p>{t("home.note.p2")}</p>
            <div className="journal-sig">{t("home.note.sig")}<small>{t("brand.name")} · MMXXVI</small></div>
          </div>
        </div>
      </section>

      <Ornament variant="tide-line" />

      {/* ─── Our Promise · dark slab with 4 features ────────────── */}
      <section data-cursor="seal" data-reveal className="promise-section" style={{ background: "var(--purple-950)", color: "var(--cream)", margin: "0" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: 11, letterSpacing: ".4em", color: "var(--gold)", marginBottom: 16 }}>{t("home.promise.kicker")}</div>
          <h2 className="serif" style={{ fontSize: 48, margin: "0 0 20px", color: "var(--cream)", fontWeight: 400, lineHeight: 1.1 }}>
            {t.rich("home.promise.title", { em: (c) => <em style={{ color: "var(--gold)" }}>{c}</em>, br: () => <br /> })}
          </h2>
          <p style={{ color: "var(--purple-200)", fontSize: 16, maxWidth: 600, margin: "0 auto 24px", lineHeight: 1.7 }}>
            {t("home.promise.body")}
          </p>
          <div className="promise-grid">
            {[
              { i: "arrow",   n: 1 },
              { i: "check",   n: 2 },
              { i: "feather", n: 3 },
              { i: "feather", n: 4 },
            ].map((x) => (
              <div key={x.n} style={{ display: "flex", gap: 14, alignItems: "start" }}>
                <div style={{ color: "var(--gold)" }}><Icon name={x.i} size={26} /></div>
                <div>
                  <div style={{ fontWeight: 500, color: "var(--cream)", marginBottom: 4 }}>{t(`home.promise.f${x.n}Title`)}</div>
                  <div style={{ fontSize: 12, color: "var(--purple-200)" }}>{t(`home.promise.f${x.n}Sub`)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Ornament variant="frond" size={72} />

      {/* ─── Recently viewed (client-rendered, hidden if list is empty) ─ */}
      <RecentlyViewedStrip />

      {/* ─── Newsletter / Letters from the Maison ───────────────── */}
      <section className="letters" data-cursor="seal">
        <div className="letters-inner">
          <div className="letters-kicker">{t("home.letters.kicker")}</div>
          <h2>{t.rich("home.letters.title", { em: (c) => <em>{c}</em> })}</h2>
          <p>{t("home.letters.body")}</p>
          <NewsletterForm />
        </div>
      </section>
    </>
  );
}

async function safeQuery<T>(p: Promise<T>): Promise<T | null> {
  try { return await p; } catch { return null; }
}
