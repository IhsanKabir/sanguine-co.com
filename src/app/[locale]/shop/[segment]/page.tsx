import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getSegmentBySlug, getLiveProducts, getHeroImagesFor } from "@/lib/queries";
import { Link } from "@/i18n/routing";
import ShopGrid from "@/components/storefront/ShopGrid";
import JsonLd from "@/components/seo/JsonLd";

const BASE = (process.env.NEXT_PUBLIC_SITE_URL || "https://saanguine-the-retail-shop.vercel.app").replace(/\/$/, "");

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
  const blurb = (isBn && seg.blurbBn) || seg.blurb || `Pieces in ${name}, composed by Maison Saanguine.`;
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
      title: `${name} · Maison Saanguine`,
      description: blurb,
      url,
      type: "website",
      locale: isBn ? "bn_BD" : "en_BD",
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

  const seg = await getSegmentBySlug(segment).catch(() => null);
  if (!seg || seg.hidden) notFound();

  const showStock = seg.stockEnabled;
  const showPreorder = seg.preorderEnabled;

  const allItems = showStock
    ? await getLiveProducts({ segmentId: segment }).catch(() => [])
    : [];
  const heroImages = allItems.length > 0
    ? await getHeroImagesFor(allItems.map((i) => i.id)).catch(() => new Map())
    : new Map();
  const heroImagesObj = Object.fromEntries(heroImages.entries());

  // Distinct values for filter chips.
  const availableColors = Array.from(new Set(allItems.flatMap((p) => (p.colors as string[] | null) ?? []))).sort();
  const availableSizes = Array.from(new Set(allItems.flatMap((p) => (p.sizes as string[] | null) ?? []))).sort();
  const availableTags = Array.from(new Set(allItems.map((p) => p.tag).filter((t): t is string => !!t))).sort();
  const priceMin = allItems.length > 0 ? Math.min(...allItems.map((p) => p.priceBdt)) : 0;
  const priceMax = allItems.length > 0 ? Math.max(...allItems.map((p) => p.priceBdt)) : 0;

  const name = (locale === "bn" && seg.nameBn) || seg.name;
  const displayTag = (locale === "bn" && seg.tagBn) || seg.tag || "";
  const blurb = (locale === "bn" && seg.blurbBn) || seg.blurb || "";

  const cursor = CURSOR_BY_SEGMENT[segment] || "crosshair";

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Maison", item: `${BASE}/${locale}` },
      { "@type": "ListItem", position: 2, name: "Boutique", item: `${BASE}/${locale}/shop/${segment}` },
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
      <div className="crumbs">
        <Link href="/" style={{ cursor: "pointer" }}>Maison</Link>
        <span>Boutique</span>
        <span className="current">{name}</span>
      </div>
      <section className="section" style={{ paddingTop: 28 }} data-cursor={cursor}>
        <div style={{ marginBottom: 36, paddingBottom: 24, borderBottom: "1px solid var(--line)" }}>
          <div style={{ fontSize: 11, letterSpacing: ".3em", color: "var(--gold-deep)", marginBottom: 8 }}>
            {displayTag.toUpperCase()}
          </div>
          <h1 className="serif segment-h1" style={{ margin: 0, color: "var(--purple-900)", fontWeight: 400 }}>
            {name}
          </h1>
          <p style={{ fontSize: 15, color: "var(--ink-soft)", margin: "12px 0 0", maxWidth: 520 }}>
            {showStock && showPreorder
              ? `${blurb}. Browse below or compose a bespoke piece.`
              : showPreorder
              ? `${blurb}. Each piece is composed on request, then delivered.`
              : showStock
              ? `${blurb}. ${allItems.length} pieces in stock.`
              : `${blurb}.`}
          </p>
        </div>

        {showStock && (
          <Suspense fallback={<div style={{ minHeight: 300 }} />}>
            <ShopGrid
              allItems={allItems}
              heroImages={heroImagesObj}
              availableColors={availableColors}
              availableSizes={availableSizes}
              availableTags={availableTags}
              priceMin={priceMin}
              priceMax={priceMax}
              segmentTag={(locale === "bn" && seg.tagBn) || seg.tag || ""}
              segmentSlug={segment}
              showPreorder={showPreorder}
            />
          </Suspense>
        )}

        {/* Bespoke pre-order CTA */}
        {showPreorder && (
          <div className="preorder-cta" style={{ marginTop: showStock ? 60 : 0 }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: ".4em", color: "var(--gold)", marginBottom: 14 }}>
                BESPOKE · ON REQUEST
              </div>
              <h2 className="serif" style={{ fontSize: 40, margin: 0, color: "var(--cream)", fontWeight: 400, lineHeight: 1.1 }}>
                {showStock
                  ? <>Or have us <em style={{ color: "var(--gold)" }}>compose one</em> for you.</>
                  : <>Each piece is <em style={{ color: "var(--gold)" }}>composed on request</em>.</>}
              </h2>
              <p style={{ color: "var(--purple-200)", fontSize: 15, lineHeight: 1.7, margin: "16px 0 0", maxWidth: 540 }}>
                Send your references — images, films, the feeling you have in mind — and the maison will return a quote and timeline within a day or two. No payment is taken until delivery.
              </p>
            </div>
            <Link href={`/preorder/${segment}`} className="btn btn-gold" style={{ whiteSpace: "nowrap" }}>
              Compose a piece →
            </Link>
          </div>
        )}

        {/* Both off → segment placeholder */}
        {!showStock && !showPreorder && (
          <div className="empty-state">
            <h3>Coming soon</h3>
            <p style={{ color: "var(--ink-soft)" }}>This collection is being prepared.</p>
          </div>
        )}
      </section>
    </>
  );
}
