import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { getLiveProducts, getHeroImagesFor, getVisibleSegments } from "@/lib/queries";
import { Link } from "@/i18n/routing";
import { uniqueOptions } from "@/lib/option-labels";
import ShopGrid from "@/components/storefront/ShopGrid";
import OccasionChips from "@/components/storefront/OccasionChips";
import JsonLd from "@/components/seo/JsonLd";
import { priceSortValue } from "@/lib/pricing";
import { OCCASION_IDS, findOccasion, occasionLabel, occasionsInUse } from "@/lib/occasions";
import { SITE_URL as BASE } from "@/lib/site-url";

// Same caching as /shop/[segment]: ISR per occasion, admin saves purge it via
// revalidateAllLocales(), 300 s is the safety net. The occasion list is fixed,
// so every page is known at build time.
export const revalidate = 300;

export function generateStaticParams(): Array<{ occasion: string }> {
  return OCCASION_IDS.map((occasion) => ({ occasion }));
}

type Props = { params: Promise<{ locale: string; occasion: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, occasion } = await params;
  if (!findOccasion(occasion)) return { title: "Not found" };
  const t = await getTranslations({ locale });
  const name = occasionLabel(occasion, locale);
  const description = t("occasion.metaDescription", { occasion: name });
  const url = `${BASE}/${locale}/occasion/${occasion}`;
  return {
    title: t("occasion.metaTitle", { occasion: name }),
    description,
    alternates: {
      canonical: url,
      languages: {
        "en-BD": `${BASE}/en/occasion/${occasion}`,
        "bn-BD": `${BASE}/bn/occasion/${occasion}`,
        "x-default": `${BASE}/en/occasion/${occasion}`,
      },
    },
    openGraph: {
      title: `${name} · Sanguine`,
      description,
      url,
      type: "website",
      locale: locale === "bn" ? "bn_BD" : "en_BD",
      images: [{ url: "/api/og", width: 1200, height: 630, alt: "Sanguine" }],
    },
  };
}

export default async function OccasionPage({ params }: Props) {
  const { locale, occasion } = await params;
  setRequestLocale(locale);
  if (!findOccasion(occasion)) notFound();
  const t = await getTranslations();
  const isBn = locale === "bn";
  const name = occasionLabel(occasion, locale);

  const [allLive, segments] = await Promise.all([
    getLiveProducts().catch(() => []),
    getVisibleSegments().catch(() => []),
  ]);
  const items = allLive.filter((p) => (p.occasions ?? []).includes(occasion));
  const heroImages = items.length > 0
    ? Object.fromEntries((await getHeroImagesFor(items.map((i) => i.id)).catch(() => new Map())).entries())
    : {};
  const segName = (id: string | null) => {
    const s = segments.find((x) => x.id === id);
    return s ? (isBn && s.tagBn) || s.tag || "" : "";
  };

  const availableColors = uniqueOptions(items.flatMap((p) => (p.colors as string[] | null) ?? []));
  const availableSizes = uniqueOptions(items.flatMap((p) => (p.sizes as string[] | null) ?? []));
  const availableTags = Array.from(new Set(items.map((p) => p.tag).filter((v): v is string => !!v))).sort();
  const priceValues = items.map(priceSortValue).filter((v) => v < Number.MAX_SAFE_INTEGER);
  const priceMin = priceValues.length > 0 ? Math.min(...priceValues) : 0;
  const priceMax = priceValues.length > 0 ? Math.max(...priceValues) : 0;

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: t("nav.maison"), item: `${BASE}/${locale}` },
      { "@type": "ListItem", position: 2, name, item: `${BASE}/${locale}/occasion/${occasion}` },
    ],
  };

  return (
    <>
      <JsonLd data={[breadcrumbLd]} />
      <div className="crumbs">
        <Link href="/" style={{ cursor: "pointer" }}>{t("nav.maison")}</Link>
        <span>{t("occasion.kicker")}</span>
        <span className="current">{name}</span>
      </div>
      <section className="section" style={{ paddingTop: 28 }}>
        <div style={{ marginBottom: 28, paddingBottom: 24, borderBottom: "1px solid var(--line)" }}>
          <div style={{ fontSize: 11, letterSpacing: ".3em", color: "var(--gold-deep)", marginBottom: 8, textTransform: "uppercase" }}>
            {t("occasion.kicker")}
          </div>
          <h1 className="serif segment-h1" style={{ margin: 0, color: "var(--purple-900)", fontWeight: 400 }}>
            {name}
          </h1>
          <p style={{ fontSize: 15, color: "var(--ink-soft)", margin: "12px 0 0", maxWidth: 520 }}>
            {t("occasion.blurb", { occasion: name, count: items.length })}
          </p>
          <OccasionChips ids={occasionsInUse(allLive)} current={occasion} locale={locale} />
        </div>

        {items.length === 0 ? (
          <div className="empty-state">
            <h3>{t("occasion.empty")}</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginTop: 16 }}>
              {segments.map((s) => (
                <Link key={s.id} href={`/shop/${s.id}`} className="btn btn-ghost btn-sm">
                  {(isBn && s.nameBn) || s.name}
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <Suspense fallback={<div style={{ minHeight: 300 }} />}>
            <ShopGrid
              allItems={items}
              heroImages={heroImages}
              availableColors={availableColors}
              availableSizes={availableSizes}
              availableTags={availableTags}
              priceMin={priceMin}
              priceMax={priceMax}
              segmentTag={segName(items[0]?.segmentId ?? null)}
              segmentSlug=""
              showPreorder={false}
              resetHref={`/occasion/${occasion}`}
            />
          </Suspense>
        )}
      </section>
    </>
  );
}
