import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { getSegmentBySlug, getLiveProducts, getHeroImagesFor } from "@/lib/queries";
import { getUploadedCutouts } from "@/lib/cutout-store";
import { getCommerceSettings } from "@/lib/commerce";
import { toStageItems } from "@/lib/stage-items";
import Stage from "@/components/storefront/Stage";
import { Link } from "@/i18n/routing";
import JsonLd from "@/components/seo/JsonLd";
import OccasionChips from "@/components/storefront/OccasionChips";
import { occasionsInUse } from "@/lib/occasions";

import { SITE_URL as BASE } from "@/lib/site-url";

// ISR: filtering/sorting happens client-side in ShopGrid over the full item
// list (the server render never reads searchParams), and the page reads no
// cookies: so the HTML is cacheable per segment. Admin edits purge it via
// revalidateAllLocales(); 300s is the safety net.
export const revalidate = 300;

// Without generateStaticParams a dynamic segment renders per-request and
// `revalidate` is ignored. Returning [] (segments live in the DB, which we
// don't query at build) still opts the route into on-demand ISR: the first
// visit renders and caches, subsequent visits are edge HITs.
export function generateStaticParams(): Array<{ segment: string }> {
  return [];
}

type Props = {
  params: Promise<{ locale: string; segment: string }>;
  searchParams?: Promise<Record<string, string | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, segment } = await params;
  const seg = await getSegmentBySlug(segment).catch(() => null);
  if (!seg || seg.hidden) return { title: "Not found" };
  const isBn = locale === "bn";
  const name = (isBn && seg.nameBn) || seg.name;
  const tm = await getTranslations({ locale });
  const blurb = (isBn && seg.blurbBn) || seg.blurb || tm("shop.blurbFallback", { name });
  const url = `${BASE}/${locale}/shop/${segment}`;
  return {
    title: name,
    description: blurb,
    alternates: {
      canonical: url,
      languages: {
        "en-BD": `${BASE}/en/shop/${segment}`,
        "bn-BD": `${BASE}/bn/shop/${segment}`,
        "x-default": `${BASE}/en/shop/${segment}`,
      },
    },
    openGraph: {
      title: `${name} · Sanguine`,
      description: blurb,
      url,
      type: "website",
      locale: isBn ? "bn_BD" : "en_BD",
      // Maison card: child openGraph replaces the root fallback wholesale.
      images: [{ url: "/api/og", width: 1200, height: 630, alt: "Sanguine" }],
    },
    twitter: { card: "summary_large_image", title: name, description: blurb },
  };
}

const CURSOR_BY_SEGMENT: Record<string, string> = {
  clothing: "magnify",
  accessories: "magnify",
  perfume: "perfume",
  jewelry: "jewelry",
  flowers: "flowers",
  watches: "watches",
  books: "inkwell",
};

export default async function SegmentPage({ params }: Props) {
  const { locale, segment } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const seg = await getSegmentBySlug(segment).catch(() => null);
  if (!seg || seg.hidden) notFound();

  const showStock = seg.stockEnabled;
  const showPreorder = seg.preorderEnabled;

  const allItems = showStock
    ? await getLiveProducts({ segmentId: segment }).catch(() => [])
    : [];
  const [heroImages, uploaded, commerce] = await Promise.all([
    allItems.length > 0 ? getHeroImagesFor(allItems.map((i) => i.id)).catch(() => new Map()) : Promise.resolve(new Map()),
    getUploadedCutouts(),
    getCommerceSettings(),
  ]);
  const stageItems = toStageItems(allItems, {
    locale, uploaded, photos: heroImages,
    labels: { madeToOrder: t("pdp.preorderOnly"), priceOnQuote: t("pdp.priceOnQuote") },
  });

  const name = (locale === "bn" && seg.nameBn) || seg.name;
  const displayTag = (locale === "bn" && seg.tagBn) || seg.tag || "";
  const blurb = (locale === "bn" && seg.blurbBn) || seg.blurb || "";

  const cursor = CURSOR_BY_SEGMENT[segment] || "crosshair";

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: t("nav.maison"), item: `${BASE}/${locale}` },
      { "@type": "ListItem", position: 2, name: t("nav.boutique"), item: `${BASE}/${locale}/shop/${segment}` },
      { "@type": "ListItem", position: 3, name, item: `${BASE}/${locale}/shop/${segment}` },
    ],
  };
  const itemListLd = allItems.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: allItems.length,
    itemListElement: allItems.slice(0, 30).map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${BASE}/${locale}/product/${p.slug}`,
      name: (locale === "bn" && p.nameBn) || p.name,
    })),
  } : null;

  return (
    <>
      <JsonLd data={itemListLd ? [breadcrumbLd, itemListLd] : [breadcrumbLd]} />
      {showStock && (
        <Stage
          items={stageItems}
          ghost={name}
          title={name}
          countLabel={t("stage.count", { count: stageItems.length })}
          segmentLabel={name}
          expressCutoffMin={commerce.expressCutoffMin}
          nav={<OccasionChips ids={occasionsInUse(allItems)} locale={locale} variant="line" allHref={`/shop/${segment}`} />}
        />
      )}
      <section className="section" style={{ paddingTop: showStock ? 48 : 28 }} data-cursor={cursor}>
        {!showStock && (
          <div style={{ marginBottom: 36, paddingBottom: 24, borderBottom: "1px solid var(--line)" }}>
            <div style={{ fontSize: 11, letterSpacing: ".3em", color: "var(--gold-deep)", marginBottom: 8 }}>
              {displayTag.toUpperCase()}
            </div>
            <h1 className="serif segment-h1" style={{ margin: 0, color: "var(--purple-900)", fontWeight: 400 }}>
              {name}
            </h1>
            <p style={{ fontSize: 15, color: "var(--ink-soft)", margin: "12px 0 0", maxWidth: 520 }}>
              {showPreorder ? t("shop.blurbPreorder", { blurb }) : t("shop.blurbOnly", { blurb })}
            </p>
          </div>
        )}

        {/* Bespoke pre-order CTA */}
        {showPreorder && (
          <div className="preorder-cta" style={{ marginTop: showStock ? 60 : 0 }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: ".4em", color: "var(--gold)", marginBottom: 14 }}>
                {t("shop.bespokeKicker")}
              </div>
              <h2 className="serif" style={{ fontSize: 40, margin: 0, color: "var(--cream)", fontWeight: 400, lineHeight: 1.1 }}>
                {showStock
                  ? t.rich("shop.bespokeTitleBoth", { em: (c) => <em style={{ color: "var(--gold)" }}>{c}</em> })
                  : t.rich("shop.bespokeTitleOnly", { em: (c) => <em style={{ color: "var(--gold)" }}>{c}</em> })}
              </h2>
              <p style={{ color: "var(--purple-200)", fontSize: 15, lineHeight: 1.7, margin: "16px 0 0", maxWidth: 540 }}>
                {t("shop.bespokeBody")}
              </p>
            </div>
            <Link href={`/preorder/${segment}`} className="btn btn-gold" style={{ whiteSpace: "nowrap" }}>
              {t("shop.bespokeCta")}
            </Link>
          </div>
        )}

        {/* Both off → segment placeholder */}
        {!showStock && !showPreorder && (
          <div className="empty-state">
            <h3>{t("shop.comingSoon")}</h3>
            <p style={{ color: "var(--ink-soft)" }}>{t("shop.beingPrepared")}</p>
          </div>
        )}
      </section>
    </>
  );
}
