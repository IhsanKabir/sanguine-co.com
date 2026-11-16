import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { priceDisplay, priceDisplayText } from "@/lib/pricing";
import { categoryList } from "@/lib/category-list";
import { Link } from "@/i18n/routing";
import { getVisibleSegments, getLiveProducts, getHeroImagesFor, getOccasionsInUse } from "@/lib/queries";
import OccasionChips from "@/components/storefront/OccasionChips";
import Icon from "@/components/storefront/Icon";
import HeroRail, { type RailItem } from "@/components/storefront/HeroRail";
import Shelf, { type ShelfItem } from "@/components/storefront/Shelf";
import SameDayLine from "@/components/storefront/SameDayLine";
import { cutoutFor } from "@/lib/cutouts";
import { getUploadedCutouts } from "@/lib/cutout-store";
import { getMoments, momentsLive, splitEm } from "@/lib/moments";
import MomentsFilm from "@/components/storefront/MomentsFilm";
import { displayName } from "@/lib/product-name";
import { expressCutoffLabel } from "@/lib/delivery";
import { getCommerceSettings } from "@/lib/commerce";
import { whatsAppUrl } from "@/lib/contact";
import NewsletterForm from "@/components/storefront/NewsletterForm";
import RecentlyViewedStrip from "@/components/storefront/RecentlyViewedStrip";
import Ornament from "@/components/storefront/Ornament";
import JsonLd from "@/components/seo/JsonLd";
import { SITE_URL as BASE } from "@/lib/site-url";
import { deliveryScope, scopedKey } from "@/lib/delivery-scope";

// ISR: the homepage fires several catalogue queries per request and reads no
// cookies/auth: cache the rendered page. Admin edits still appear instantly
// because every admin action calls revalidateAllLocales() (revalidatePath
// purges this cache); 300s is only the safety net. Speed Insights showed the
// query-heavy routes gating FCP/LCP (home RES 72).
export const revalidate = 300;

type Props = { params: Promise<{ locale: string }> };

/**
 * Per-locale homepage metadata.
 *
 * The previous setup fell through to root-layout defaults: same title and
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
  const openSegments = await getVisibleSegments().catch(() => []);
  const description = t(scopedKey("home.metaDescription", deliveryScope(openSegments), ["dhaka", "mixed"]), { categories: categoryList(openSegments, isBn ? "bn" : "en") });
  return {
    // The copy already carries the brand ("Sanguine · Considered gifts…"), so
    // skip the layout template that would append " · Sanguine" a second time.
    title: { absolute: title },
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

// The third "How it works" point is the delivery promise.
const DELIVERY_FEATURE = 3;

// The shelf holds up to this many products; "See all" leads to the rest.
const SHELF_LIMIT = 24;

export default async function Home({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const [segments, live, occasions, uploaded, moments, commerce] = await Promise.all([
    safeQuery(getVisibleSegments()),
    safeQuery(getLiveProducts({ limit: SHELF_LIMIT })),
    safeQuery(getOccasionsInUse()),
    getUploadedCutouts(),
    getMoments(),
    getCommerceSettings(),
  ]);

  const showSetupBanner = segments === null;
  const segs = segments ?? [];
  // Flowers are Dhaka only: the delivery wording follows what is open.
  const scope = deliveryScope(segs);
  const products = live ?? [];
  // One batched fetch of first photos, for shelf items without a cut-out.
  const heroImages = products.length > 0
    ? await safeQuery(getHeroImagesFor(products.map((p) => p.id))) ?? new Map()
    : new Map();
  const nameOf = (p: { name: string; nameBn: string | null }) => (locale === "bn" && p.nameBn) || displayName(p.name);
  const priceOf = (p: Parameters<typeof priceDisplay>[0]) => {
    const display = priceDisplay(p);
    return display.kind === "quote" ? t("pdp.priceOnQuote") : priceDisplayText(display, locale as "en" | "bn");
  };
  // The rail: products with a cut-out (lib/cutouts.ts). The shelf: every live product.
  const rail: RailItem[] = products.flatMap((p) => {
    const cutout = cutoutFor(p, uploaded);
    return cutout ? [{ slug: p.slug, name: nameOf(p), meta: `${t("pdp.preorderOnly")} · ${priceOf(p)}`, cutout }] : [];
  });
  const shelf: ShelfItem[] = products.map((p) => ({
    slug: p.slug, name: nameOf(p), price: priceOf(p), cutout: cutoutFor(p, uploaded), photo: heroImages.get(p.id)?.url ?? null,
  }));
  // Campaigns lean on same-day express, which is for flowers in Dhaka.
  // The band follows Admin, Editorial; the page is rebuilt at least every few minutes, so its dates hold.
  // Campaigns lean on same-day express, which is for flowers in Dhaka.
  const showMoments = scope !== "nationwide" && momentsLive(moments, new Date());
  const bn = locale === "bn";
  const cutoffLabel = expressCutoffLabel(bn ? "bn" : "en", commerce.expressCutoffMin);
  const momentTitle = splitEm(bn ? moments.titleBn || moments.titleEn : moments.titleEn);
  const wa = whatsAppUrl();
  const shopHref = segs.length === 1 ? `/shop/${segs[0].id}` : "#shelf";

  // Editorial product groupings exposed as ItemList structured data so
  // Google can surface featured products in image / shopping results.
  // Bergdorf Goodman / Mr Porter both ship this on their homepage.
  const homeListsLd = [
    products.length > 0 && {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: t("home.shelf.title"),
      numberOfItems: products.length,
      itemListElement: products.map((p, i) => ({
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

      {/* ─── Opening: the product is the hero (brand/landing-mockup) ─── */}
      <section className="lh" aria-labelledby="home-title">
        <div className="lh-copy">
          <div className="lh-top">
            <div className="lh-kicker">{t("home.kicker")}</div>
            <h1 id="home-title">
              {t("home.headlineLineOne")}<br />
              {t("home.headlineLineTwoStart")}<em>{t("home.headlineLineTwoEm")}</em>{t("home.headlineLineTwoEnd")}
            </h1>
          </div>
          <div className="lh-rest">
            <p className="lh-lede">{t(scopedKey("home.lede", scope, ["dhaka", "mixed"]), { categories: categoryList(segs, locale === "bn" ? "bn" : "en") })}</p>
            {scope !== "nationwide" && <SameDayLine cutoffMin={commerce.expressCutoffMin} />}
            <div className="lh-btns">
              <Link href={shopHref} className="btn btn-gold" data-magnetic data-cursor-label={t("home.cursorEnter")}>
                {segs.length === 1
                  ? t("home.ctaShopOne", { name: locale === "bn" ? segs[0].nameBn || segs[0].name : segs[0].name.toLowerCase() })
                  : t("home.ctaPrimary")} <Icon name="arrow" size={14} />
              </Link>
              <a href={wa} className="btn btn-ghost" target="_blank" rel="noopener noreferrer">{t("home.whatsapp")}</a>
            </div>
            <ul className="lh-trust">
              <li>{t("home.trust.price")}</li>
              <li>{t("home.trust.cod")}</li>
              <li>{t("home.trust.fresh")}</li>
            </ul>
          </div>
        </div>
        {rail.length > 0 && (
          <div className="lh-rail">
            <HeroRail
              items={rail}
              labels={{ region: t("home.rail.region"), prev: t("home.rail.prev"), next: t("home.rail.next"), pause: t("home.rail.pause"), play: t("home.rail.play") }}
            />
          </div>
        )}
      </section>

      {/* ─── The shelf: every bouquet in a row ───────────────────── */}
      {shelf.length > 0 && (
        <section id="shelf" className="shelf-sec" aria-labelledby="shelf-title">
          <div className="shelf-hd">
            <div>
              <div className="lh-kicker">{t("home.shelf.kicker")}</div>
              <h2 id="shelf-title">{t("home.shelf.title")}</h2>
            </div>
            {segs[0] && <Link href={`/shop/${segs[0].id}`} className="link">{t("home.shelf.seeAll")} →</Link>}
          </div>
          <Shelf items={shelf} labels={{ prev: t("home.shelf.prev"), next: t("home.shelf.next") }} />
        </section>
      )}

      {/* ─── Shop by occasion: only occasions with live pieces ───── */}
      {occasions && occasions.length > 0 && (
        <section className="section" style={{ paddingTop: 12 }}>
          <div className="section-hd">
            <div>
              <div className="kicker">{t("occasion.kicker")}</div>
              <h2>{t("home.occasionsTitle")}</h2>
              <div className="ornament-rule" />
            </div>
          </div>
          <OccasionChips ids={occasions} locale={locale} />
        </section>
      )}

      {/* ─── Moments: one campaign at a time (Admin, Editorial) ─────── */}
      {showMoments && (
        <section className="moment" aria-labelledby="moment-title">
          <div className="moment-poster">
            {moments.video ? (
              <MomentsFilm video={moments.video} poster={moments.image} alt={bn ? moments.imageAltBn || moments.imageAltEn : moments.imageAltEn} />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element -- a small campaign poster */
              <img src={moments.image} width={540} height={960} alt={bn ? moments.imageAltBn || moments.imageAltEn : moments.imageAltEn} loading="lazy" decoding="async" />
            )}
          </div>
          <div>
            <div className="lh-kicker">{t("home.moments.kicker")}</div>
            <h2 id="moment-title">{momentTitle.before}{momentTitle.em && <em>{momentTitle.em}</em>}{momentTitle.after}</h2>
            <p>{(bn ? moments.bodyBn || moments.bodyEn : moments.bodyEn).replaceAll("{cutoff}", cutoffLabel)}</p>
            <Link href={moments.href} className="btn">{bn ? moments.ctaBn || moments.ctaEn : moments.ctaEn}</Link>
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
            <div className="journal-sig">{t("home.note.sig")}<small>{t("brand.name")} · {t("home.stillRail")}</small></div>
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
            {t(scopedKey("home.promise.body", scope, ["dhaka"]))}
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
                  <div style={{ fontWeight: 500, color: "var(--cream)", marginBottom: 4 }}>{t(scopedKey(`home.promise.f${x.n}Title`, scope, x.n === DELIVERY_FEATURE ? ["dhaka"] : []))}</div>
                  <div style={{ fontSize: 12, color: "var(--purple-200)" }}>{t(scopedKey(`home.promise.f${x.n}Sub`, scope, x.n === DELIVERY_FEATURE ? ["dhaka"] : []))}</div>
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
