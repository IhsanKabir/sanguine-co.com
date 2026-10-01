import type { Metadata } from "next";
import { Suspense } from "react";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { searchProducts, getHeroImagesFor, getVisibleSegments } from "@/lib/queries";
import { Link } from "@/i18n/routing";
import ShopGrid from "@/components/storefront/ShopGrid";
import { priceSortValue } from "@/lib/pricing";

// Full search results: the header dropdown shows 8 matches; Enter (or
// "See all results") lands here with every match, in the shop grid with its
// filters and sort. Results depend on ?q=, so the page renders per request.
export const dynamic = "force-dynamic";

// Matches beyond this are not shown; a query this broad needs narrowing anyway.
const MAX_RESULTS = 120;

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  // Result pages are thin and endless (one per query) — keep them out of the index.
  return { title: t("searchPage.title"), robots: { index: false, follow: true } };
}

export default async function SearchPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const isBn = locale === "bn";

  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw ?? "").trim().slice(0, 80);

  const [items, segments] = await Promise.all([
    q.length >= 2 ? searchProducts(q, MAX_RESULTS).catch(() => []) : Promise.resolve([]),
    getVisibleSegments().catch(() => []),
  ]);
  const heroImages = items.length > 0
    ? Object.fromEntries((await getHeroImagesFor(items.map((i) => i.id)).catch(() => new Map())).entries())
    : {};

  const availableColors = Array.from(new Set(items.flatMap((p) => (p.colors as string[] | null) ?? []))).sort();
  const availableSizes = Array.from(new Set(items.flatMap((p) => (p.sizes as string[] | null) ?? []))).sort();
  const availableTags = Array.from(new Set(items.map((p) => p.tag).filter((v): v is string => !!v))).sort();
  const priceValues = items.map(priceSortValue).filter((v) => v < Number.MAX_SAFE_INTEGER);
  const priceMin = priceValues.length > 0 ? Math.min(...priceValues) : 0;
  const priceMax = priceValues.length > 0 ? Math.max(...priceValues) : 0;

  return (
    <>
      <div className="crumbs">
        <Link href="/" style={{ cursor: "pointer" }}>{t("nav.maison")}</Link>
        <span className="current">{t("searchPage.title")}</span>
      </div>
      <section className="section" style={{ paddingTop: 28 }}>
        <div style={{ marginBottom: 36, paddingBottom: 24, borderBottom: "1px solid var(--line)" }}>
          {/* A plain GET form: works before JavaScript loads, and keeps the URL shareable. */}
          <form action={`/${locale}/search`} method="get" role="search" className="search-page-form">
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder={t("nav.search")}
              aria-label={t("nav.search")}
              minLength={2}
              maxLength={80}
              className="input"
            />
            <button type="submit" className="btn btn-primary">{t("searchPage.submit")}</button>
          </form>
          {q.length >= 2 && (
            <h1 className="serif segment-h1" style={{ margin: "24px 0 0", color: "var(--purple-900)", fontWeight: 400 }}>
              {t("searchPage.resultsFor", { q })}
            </h1>
          )}
          {q.length >= 2 && items.length > 0 && (
            <p style={{ fontSize: 15, color: "var(--ink-soft)", margin: "12px 0 0" }}>
              {items.length >= MAX_RESULTS
                ? t("searchPage.countCapped", { count: MAX_RESULTS })
                : t("searchPage.count", { count: items.length })}
            </p>
          )}
        </div>

        {q.length < 2 ? (
          <div className="empty-state">
            <p style={{ color: "var(--ink-soft)" }}>{t("searchPage.prompt")}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <h3>{t("searchPage.none", { q })}</h3>
            <p style={{ color: "var(--ink-soft)" }}>{t("searchPage.noneHint")}</p>
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
              segmentTag=""
              segmentSlug=""
              showPreorder={false}
              resetHref={`/search?q=${encodeURIComponent(q)}`}
              preserveParams={["q"]}
            />
          </Suspense>
        )}
      </section>
    </>
  );
}
