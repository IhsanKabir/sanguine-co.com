import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { searchProducts, getHeroImagesFor, getVisibleSegments } from "@/lib/queries";
import { Link } from "@/i18n/routing";
import Stage from "@/components/storefront/Stage";
import { toStageItems } from "@/lib/stage-items";
import { getUploadedCutouts } from "@/lib/cutout-store";
import { getCommerceSettings } from "@/lib/commerce";

// Full search results: the header dropdown shows 8 matches; Enter (or "See all results")
// lands here with every match, on the same stage as the shop (tap one: its panel opens in
// place). Results depend on ?q=, so the page renders per request.
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
  // Result pages are thin and endless (one per query): keep them out of the index.
  return { title: t("searchPage.title"), robots: { index: false, follow: true } };
}

export default async function SearchPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const isBn = locale === "bn";

  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw ?? "").trim().slice(0, 80);

  const [items, segments, uploaded, commerce] = await Promise.all([
    q.length >= 2 ? searchProducts(q, MAX_RESULTS).catch(() => []) : Promise.resolve([]),
    getVisibleSegments().catch(() => []),
    getUploadedCutouts().catch(() => ({})),
    getCommerceSettings(),
  ]);
  const photos = items.length > 0 ? await getHeroImagesFor(items.map((i) => i.id)).catch(() => new Map()) : new Map();
  const stageItems = toStageItems(items, {
    locale, uploaded, photos,
    labels: { madeToOrder: t("pdp.preorderOnly"), priceOnQuote: t("pdp.priceOnQuote") },
    segmentNames: new Map(segments.map((s) => [s.id, (isBn && s.nameBn) || s.name])),
  });
  const countLabel = items.length >= MAX_RESULTS
    ? t("searchPage.countCapped", { count: MAX_RESULTS })
    : t("stage.count", { count: items.length });

  // A plain GET form: works before JavaScript loads, and keeps the URL shareable.
  const form = (
    <form action={`/${locale}/search`} method="get" role="search" className="search-page-form">
      <input type="search" name="q" defaultValue={q} placeholder={t("nav.search")} aria-label={t("nav.search")}
        minLength={2} maxLength={80} className="input" />
      <button type="submit" className="btn btn-primary">{t("searchPage.submit")}</button>
    </form>
  );

  if (stageItems.length > 0) {
    return (
      <>
        <div className="search-bar">{form}</div>
        <Stage items={stageItems} ghost={q} title={t("searchPage.resultsFor", { q })} countLabel={countLabel}
          segmentLabel={t("searchPage.title")} expressCutoffMin={commerce.expressCutoffMin} />
      </>
    );
  }

  return (
    <section className="search-quiet" aria-labelledby="search-title">
      <div className="stage-ghost" aria-hidden="true" data-ghost={q.length >= 2 ? q : t("searchPage.title")} />
      <div className="stage-kicker"><span>01</span><h1 id="search-title">{q.length >= 2 ? t("searchPage.none", { q }) : t("searchPage.title")}</h1></div>
      {form}
      <p className="search-quiet-hint">{q.length >= 2 ? t("searchPage.noneHint") : t("searchPage.prompt")}</p>
      {q.length >= 2 && (
        <nav className="occasion-line" aria-label={t("searchPage.title")}>
          {segments.map((s) => (
            <Link key={s.id} href={`/shop/${s.id}`}>{(isBn && s.nameBn) || s.name}</Link>
          ))}
        </nav>
      )}
    </section>
  );
}
