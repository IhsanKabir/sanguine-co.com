import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
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

type Props = { params: Promise<{ locale: string }> };

const BASE = (process.env.NEXT_PUBLIC_SITE_URL || "https://saanguine-the-retail-shop.vercel.app").replace(/\/$/, "");

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
      siteName: "Saanguine Maison",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

const PRESS_MARKS = [
  { name: "Maison Quarterly", sup: "MMXXVI" },
  { name: "La Florilegium", sup: "Mars" },
  { name: "Le Horologium", sup: "Issue 14" },
  { name: "Sable Review", sup: "Spring" },
  { name: "Bibliothèque", sup: "Vol. IX" },
  { name: "Atelier Notes", sup: "Avril" },
];

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
  // Wunderkammer scrolls — duplicate for seamless loop
  const wkCats = [...segs, ...segs];

  // Editorial product groupings exposed as ItemList structured data so
  // Google can surface featured products in image / shopping results.
  // Bergdorf Goodman / Mr Porter both ship this on their homepage.
  const homeListsLd = [
    news.length > 0 && {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "New This Week",
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
      name: "Editor's Selection",
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
            <div style={{ display: "flex", gap: 12 }}>
              {segs[0] && (
                <Link href={`/shop/${segs[0].id}`} className="btn btn-gold" data-magnetic data-cursor-label="Enter">
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
              <span>{t("brand.name")}</span><span>·</span><span>Atelier</span>
            </div>
            <div className="hs-cap">
              The slow unspooling of a season.<small>Genesis · Chapter I</small>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Marquee — concise trust points ──────────────────────── */}
      <div className="marquee" data-cursor="default">
        <div className="marquee-track">
          <span>Atelier-made</span><span>Cash on Delivery</span>
          <span>Gift packaging</span><span>Free delivery over ৳3,000</span>
          <span>30-day returns</span><span>House-certified</span>
          <span>Atelier-made</span><span>Cash on Delivery</span>
          <span>Gift packaging</span><span>Free delivery over ৳3,000</span>
          <span>30-day returns</span><span>House-certified</span>
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
              return (
                <Link
                  key={p.id}
                  href={`/product/${p.slug}`}
                  className={cls}
                  data-cursor={CAT_CURSOR[p.segmentId || ""] || "magnify"}
                >
                  <Composition cat={p.segmentId || "clothing"} sku={p.sku} name={p.name} tag={p.tag} />
                  <div className="b-overlay">
                    <div className="b-kicker">{seg?.tag}</div>
                    <h3 className="b-name">{p.name}</h3>
                    <div className="b-price">৳{p.priceBdt.toLocaleString("en-IN")}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <Ornament variant="spiral" size={64} />

      {/* ─── Editor's Selection · House Favourites ──────────────── */}
      {eds.length > 0 && (
        <section className="section" data-cursor="crosshair">
          <div className="section-hd" data-reveal>
            <div>
              <div className="kicker">{t("home.editors")}</div>
              <h2>{t("home.favourites")}</h2>
              <div className="ornament-rule" />
            </div>
          </div>
          <div className="grid grid-3">
            {eds.slice(0, 6).map((p, i) => {
              const seg = segs.find((s) => s.id === p.segmentId);
              return (
                <div key={p.id} data-reveal data-reveal-delay={(i % 3) + 1}>
                  <ProductCard product={p} segmentTag={seg?.tag} heroImage={heroImages.get(p.id) ?? null} />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ─── Wunderkammer · scrolling curiosity strip ───────────── */}
      {segs.length > 0 && (
        <section className="wunderkammer" aria-label="Curiosities by category" data-cursor="magnify">
          <div className="wunderkammer-track">
            {wkCats.map((c, i) => (
              <Link key={c.id + i} href={`/shop/${c.id}`} className="wunderkammer-card">
                <Composition cat={c.id} sku={c.id} name={c.name} />
                <span className="wk-tag">{c.tag}</span>
                <div className="wk-name">{c.name}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ─── Pin showcase (Genesis Collection · 4 frames) ──────── */}
      <section data-pin-showcase className="pin-showcase" data-cursor="seal" style={{ height: "300vh", background: "var(--purple-950)", color: "var(--cream)", margin: "60px 0", position: "relative" }}>
        <div className="pin-inner">
          <div className="pin-stage">
            <div className="pin-aside">
              <div className="kicker" style={{ color: "var(--gold)" }}>Genesis Collection · Chapter I</div>
              <h2 className="pin-headline serif">The slow<br /><em>unspooling</em><br />of a season.</h2>
              <div className="pin-progress"><div className="pin-progress-bar"></div><span className="pin-counter">01 / 04</span></div>
            </div>
            <div className="pin-frames">
              <div className="pin-frame active" data-i="0">
                <div className="pin-art pin-art-1">
                  <div className="pin-num">I.</div>
                  <div className="pin-cap">Velvet Hours</div>
                  <div className="pin-meta">Cropped opera coat · Plum velvet · MMXXVI</div>
                </div>
              </div>
              <div className="pin-frame" data-i="1">
                <div className="pin-art pin-art-2">
                  <div className="pin-num">II.</div>
                  <div className="pin-cap">Inkwell &amp; Folio</div>
                  <div className="pin-meta">Bound first editions · Atelier-pressed</div>
                </div>
              </div>
              <div className="pin-frame" data-i="2">
                <div className="pin-art pin-art-3">
                  <div className="pin-num">III.</div>
                  <div className="pin-cap">Hours, Worn</div>
                  <div className="pin-meta">Mechanical movement · Cabochon crown</div>
                </div>
              </div>
              <div className="pin-frame" data-i="3">
                <div className="pin-art pin-art-4">
                  <div className="pin-num">IV.</div>
                  <div className="pin-cap">After the Rain</div>
                  <div className="pin-meta">Eau de parfum · Iris, vetiver, rain</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Journal · Atelier note ──────────────────────────────── */}
      <section className="journal" data-reveal data-cursor="inkwell">
        <div className="journal-inner">
          <div>
            <div className="journal-kicker">Atelier · Note · 001</div>
            <p className="journal-num">№<small>One</small></p>
          </div>
          <div>
            <h2>On the cutting of <em>velvet</em> at dusk, and the patience it asks of the hand.</h2>
            <p>The first cut is never the deepest. We learned this from an aunt — who learned it from her own — that velvet asks for the slow knife, the one that waits for the nap to settle before it commits. The maison was built around small lessons of this kind: that a wax seal cools in under a minute but holds for a century, that an iris will refuse to open if you watch it too closely, that a watch crown is best turned with the ball of the thumb, not the nail.</p>
            <p>None of this is on our website by accident. Each object you'll find here has been refused, redrafted, and accepted by hands that have argued about it. We are a small house. We prefer it this way.</p>
            <div className="journal-sig">— The Atelier<small>Maison {t("brand.name")} · MMXXVI</small></div>
          </div>
        </div>
      </section>

      {/* ─── Press strip — aspirational citations ────────────────── */}
      <section className="press" aria-label="Press">
        <div className="press-inner">
          <span className="press-kicker">As discussed in</span>
          {/* Press marks are aspirational placeholders. Rendered as <span>,
            * not <a> with no href — Google's quality rater guidelines flag
            * anchor-without-destination as "implied false authority". Swap
            * to real publications + real URLs once we have citations. */}
          {PRESS_MARKS.map((m) => (
            <span key={m.name} className="press-mark">{m.name}<sup aria-hidden="true">{m.sup}</sup></span>
          ))}
        </div>
      </section>

      <Ornament variant="tide-line" />

      {/* ─── Our Promise · dark slab with 4 features ────────────── */}
      <section data-cursor="seal" data-reveal style={{ background: "var(--purple-950)", color: "var(--cream)", padding: "80px 32px", margin: "0" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: 11, letterSpacing: ".4em", color: "var(--gold)", marginBottom: 16 }}>OUR PROMISE</div>
          <h2 className="serif" style={{ fontSize: 48, margin: "0 0 20px", color: "var(--cream)", fontWeight: 400, lineHeight: 1.1 }}>
            We hand-deliver and accept payment <em style={{ color: "var(--gold)" }}>on arrival</em>,<br />like a couturier — not a warehouse.
          </h2>
          <p style={{ color: "var(--purple-200)", fontSize: 16, maxWidth: 600, margin: "0 auto 24px", lineHeight: 1.7 }}>
            Pay by card, wallet, UPI, or in cash when our courier arrives at your door. Complimentary returns within thirty days.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 32, marginTop: 40, textAlign: "left" }}>
            {[
              { i: "arrow",   t: "White-glove delivery",   s: "Courier, signed." },
              { i: "check",   t: "Cash on Delivery",       s: "No pre-payment required." },
              { i: "feather", t: "30-day returns",         s: "Complimentary." },
              { i: "feather", t: "Ceremonial packaging",   s: "Wax-sealed." },
            ].map((x) => (
              <div key={x.t} style={{ display: "flex", gap: 14, alignItems: "start" }}>
                <div style={{ color: "var(--gold)" }}><Icon name={x.i} size={26} /></div>
                <div>
                  <div style={{ fontWeight: 500, color: "var(--cream)", marginBottom: 4 }}>{x.t}</div>
                  <div style={{ fontSize: 12, color: "var(--purple-200)" }}>{x.s}</div>
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
          <div className="letters-kicker">Letters from the Maison</div>
          <h2>Correspondence, <em>quietly</em>.</h2>
          <p>One slim envelope each season — new arrivals, atelier notes, and the occasional invitation to a private viewing. No more, no less.</p>
          <NewsletterForm />
        </div>
      </section>
    </>
  );
}

async function safeQuery<T>(p: Promise<T>): Promise<T | null> {
  try { return await p; } catch { return null; }
}
