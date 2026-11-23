import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { getLiveProducts, getHeroImagesFor, getVisibleSegments } from "@/lib/queries";
import { Link } from "@/i18n/routing";
import { getUploadedCutouts } from "@/lib/cutout-store";
import { getCommerceSettings } from "@/lib/commerce";
import { toStageItems, type StageItem } from "@/lib/stage-items";
import Stage from "@/components/storefront/Stage";
import GiftLook, { type GiftPiece } from "@/components/storefront/GiftLook";
import OccasionChips from "@/components/storefront/OccasionChips";
import JsonLd from "@/components/seo/JsonLd";
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
  // Photos for the pieces here and for the board games picked to go with them.
  const lookIds = Array.from(new Set(items.flatMap((p) => (p.lookProductIds as string[] | null) ?? [])));
  const photoIds = Array.from(new Set([...items.map((i) => i.id), ...lookIds]));
  const [heroImages, uploaded, commerce] = await Promise.all([
    photoIds.length > 0 ? getHeroImagesFor(photoIds).catch(() => new Map()) : Promise.resolve(new Map()),
    getUploadedCutouts(),
    getCommerceSettings(),
  ]);
  const labels = { madeToOrder: t("pdp.preorderOnly"), priceOnQuote: t("pdp.priceOnQuote") };
  const stageItems = toStageItems(items, { locale, uploaded, photos: heroImages, labels });
  const liveById = new Map(toStageItems(allLive.filter((p) => lookIds.includes(p.id)), { locale, uploaded, photos: heroImages, labels }).map((i) => [i.id, i]));
  const gift = giftFor(stageItems, liveById, {
    card: t("stage.giftCard"), cardNote: t("stage.giftCardNote"), bouquetNote: t("stage.giftBouquetNote"),
  });
  const firstSegment = segments.find((x) => x.id === items[0]?.segmentId);

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
      {items.length === 0 ? (
        <section className="section" style={{ paddingTop: 28 }}>
          <h1 className="serif segment-h1" style={{ margin: 0, color: "var(--purple-900)", fontWeight: 400 }}>{name}</h1>
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
        </section>
      ) : (
        <>
          <Stage
            items={stageItems}
            ghost={name}
            title={name}
            countLabel={t("stage.count", { count: stageItems.length })}
            segmentLabel={firstSegment ? (isBn && firstSegment.nameBn) || firstSegment.name : t("occasion.kicker")}
            expressCutoffMin={commerce.expressCutoffMin}
            nav={<OccasionChips ids={occasionsInUse(allLive)} current={occasion} locale={locale} variant="line" allHref={`/shop/${firstSegment?.id ?? "flowers"}`} />}
          />
          {gift && <GiftLook kicker={`02 · ${t("stage.giftKicker")}`} title={t("stage.giftTitle")} pieces={gift} />}
        </>
      )}
    </>
  );
}

const CARD_IMAGE = "/gift/sanguine-card.webp";

/**
 * "Complete the gift": the first bouquet here that has a board game picked for it in Admin
 * ("Complete the look"), with the Sanguine card between them. Null when nothing is picked:
 * the scene only shows real pairings.
 */
function giftFor(
  items: StageItem[],
  liveById: ReadonlyMap<string, StageItem>,
  labels: { card: string; cardNote: string; bouquetNote: string },
): GiftPiece[] | null {
  for (const bouquet of items) {
    if (!bouquet.dhakaOnly) continue;
    const partner = bouquet.lookIds.map((id) => liveById.get(id)).find((p): p is StageItem => !!p && !p.dhakaOnly);
    if (!partner) continue;
    return [
      { key: bouquet.slug, name: bouquet.name, note: labels.bouquetNote, href: `/product/${bouquet.slug}`, cutout: bouquet.cutout, photo: bouquet.photo },
      { key: "card", name: labels.card, note: labels.cardNote, href: null, cutout: null, photo: CARD_IMAGE, flat: true },
      { key: partner.slug, name: partner.name, note: partner.meta, href: `/product/${partner.slug}`, cutout: partner.cutout, photo: partner.photo },
    ];
  }
  return null;
}
