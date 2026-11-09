"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Product } from "@/lib/schema";
import { Link } from "@/i18n/routing";
import { priceSortValue } from "@/lib/pricing";
import { sameOption } from "@/lib/option-labels";
import ProductCard from "./ProductCard";
import SegmentFilters from "./SegmentFilters";

type HeroImages = Record<string, { url: string; alt: string | null; hoverUrl?: string }>;

const VALID_SORTS = ["featured", "price-asc", "price-desc", "rating", "newest"] as const;
type SortKey = typeof VALID_SORTS[number];

type Props = {
  allItems: Product[];
  heroImages: HeroImages;
  availableColors: string[];
  availableSizes: string[];
  availableTags: string[];
  priceMin: number;
  priceMax: number;
  segmentTag: string;
  segmentSlug: string;
  showPreorder: boolean;
  /** Where "see everything" leads when filters hide every item. Defaults to the segment page. */
  resetHref?: string;
  /** Query params the filters must keep when cleared (the search page's `q`). */
  preserveParams?: string[];
};

/** Cards above the fold on a phone (2-column grid): loaded eagerly at high
 *  priority, since the first one is the shop page LCP element. */
const PRIORITY_CARDS = 2;

const NO_PARAMS = new URLSearchParams();

/**
 * useSearchParams makes Next client-render everything under the nearest
 * Suspense boundary on a static page, which left the shop HTML with no
 * product images (LCP load delay ~2.7 s). The fallback is therefore the
 * real grid, unfiltered, so the photos are in the server HTML; the live
 * grid swaps in after hydration and applies any filters in the URL.
 */
export default function ShopGrid(props: Props) {
  return (
    <Suspense fallback={<ShopGridView {...props} params={NO_PARAMS} />}>
      <ShopGridLive {...props} />
    </Suspense>
  );
}

function ShopGridLive(props: Props) {
  const params = useSearchParams();
  return <ShopGridView {...props} params={params} />;
}

function ShopGridView({
  allItems,
  heroImages,
  availableColors,
  availableSizes,
  availableTags,
  priceMin,
  priceMax,
  segmentTag,
  segmentSlug,
  showPreorder,
  resetHref,
  preserveParams,
  params,
}: Props & { params: Pick<URLSearchParams, "get" | "toString"> }) {
  const t = useTranslations();

  const minPrice = params.get("min") ? parseInt(params.get("min")!, 10) : undefined;
  const maxPrice = params.get("max") ? parseInt(params.get("max")!, 10) : undefined;
  const tag = params.get("tag") || undefined;
  const colors = useMemo(
    () => (params.get("color") ?? "").split(",").filter(Boolean),
    [params],
  );
  const sizes = useMemo(
    () => (params.get("size") ?? "").split(",").filter(Boolean),
    [params],
  );
  const sort: SortKey = (VALID_SORTS as readonly string[]).includes(params.get("sort") ?? "")
    ? (params.get("sort") as SortKey)
    : "featured";

  const filteredItems = useMemo(() => {
    let items = [...allItems];
    if (tag) items = items.filter((p) => p.tag === tag);
    // Effective price (fixed / estimate ceiling): quote-only pieces have no
    // comparable price, so a max-price filter excludes them by design.
    if (typeof minPrice === "number" && !isNaN(minPrice)) {
      items = items.filter((p) => priceSortValue(p) >= minPrice);
    }
    if (typeof maxPrice === "number" && !isNaN(maxPrice)) {
      items = items.filter((p) => priceSortValue(p) <= maxPrice);
    }
    if (colors.length > 0) {
      items = items.filter((p) => (p.colors as string[] | null)?.some((c) => colors.some((f) => sameOption(f, c))));
    }
    if (sizes.length > 0) {
      items = items.filter((p) => (p.sizes as string[] | null)?.some((s) => sizes.some((f) => sameOption(f, s))));
    }

    switch (sort) {
      case "price-asc":
        return [...items].sort((a, b) => priceSortValue(a) - priceSortValue(b));
      case "price-desc":
        return [...items].sort((a, b) => priceSortValue(b) - priceSortValue(a));
      case "rating":
        return [...items].sort((a, b) => Number(b.rating ?? 0) - Number(a.rating ?? 0));
      case "newest":
        return [...items].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
      default:
        return items;
    }
  }, [allItems, tag, minPrice, maxPrice, colors, sizes, sort]);

  const isFiltered = !!(
    tag ||
    colors.length ||
    sizes.length ||
    (typeof minPrice === "number" && !isNaN(minPrice)) ||
    (typeof maxPrice === "number" && !isNaN(maxPrice)) ||
    (sort && sort !== "featured")
  );

  return (
    <>
      {allItems.length > 0 && (
        <SegmentFilters
          segmentSlug={segmentSlug}
          preserveParams={preserveParams}
          availableColors={availableColors}
          availableSizes={availableSizes}
          availableTags={availableTags}
          priceMin={priceMin ?? 0}
          priceMax={priceMax ?? 0}
          query={params.toString()}
          shownCount={filteredItems.length}
          totalCount={allItems.length}
        />
      )}
      {filteredItems.length > 0 ? (
        <div className="grid grid-4">
          {filteredItems.map((p, i) => (
            <ProductCard
              key={p.id}
              priority={i < PRIORITY_CARDS}
              headingLevel={2}
              product={p}
              segmentTag={segmentTag}
              heroImage={heroImages[p.id] ?? null}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state" style={{ marginBottom: showPreorder ? 24 : 0 }}>
          <h3>{isFiltered ? t("shopGrid.noMatch") : t("shopGrid.noneInStock")}</h3>
          {isFiltered ? (
            <p style={{ color: "var(--ink-soft)" }}>
              {t.rich("shopGrid.widen", {
                a: (chunks) => (
                  <Link href={resetHref ?? `/shop/${segmentSlug}`} style={{ color: "var(--purple-900)", textDecoration: "underline" }}>
                    {chunks}
                  </Link>
                ),
              })}
            </p>
          ) : !showPreorder ? (
            <p style={{ color: "var(--ink-soft)" }}>{t("shopGrid.checkBack")}</p>
          ) : null}
        </div>
      )}
    </>
  );
}
