import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { getLiveProducts, getHeroImagesFor, getVisibleSegments } from "@/lib/queries";
import { toStageItems } from "@/lib/stage-items";
import { getUploadedCutouts } from "@/lib/cutout-store";
import { getCommerceSettings } from "@/lib/commerce";
import WishlistClient from "./WishlistClient";

export const dynamic = "force-dynamic";

// Wishlist content is per-visitor (localStorage). Indexable URL produces an
// empty page for Googlebot: wastes crawl budget and confuses page-type
// classification. Excluded from the sitemap as well.
export const metadata: Metadata = {
  title: "Wishlist",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ locale: string }> };

export default async function WishlistPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const isBn = locale === "bn";
  // Every piece on sale, ready for the stage; the visitor's saved ones are picked in the browser.
  const [products, segments, uploaded, commerce] = await Promise.all([
    getLiveProducts().catch(() => []),
    getVisibleSegments().catch(() => []),
    getUploadedCutouts().catch(() => ({})),
    getCommerceSettings(),
  ]);
  const photos = products.length > 0 ? await getHeroImagesFor(products.map((p) => p.id)).catch(() => new Map()) : new Map();
  const items = toStageItems(products, {
    locale, uploaded, photos,
    labels: { madeToOrder: t("pdp.preorderOnly"), priceOnQuote: t("pdp.priceOnQuote") },
    segmentNames: new Map(segments.map((s) => [s.id, (isBn && s.nameBn) || s.name])),
  });
  return <WishlistClient items={items} expressCutoffMin={commerce.expressCutoffMin} />;
}
