"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import type { Product } from "@/lib/schema";
import { Link } from "@/i18n/routing";
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
};

export default function ShopGrid({
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
}: Props) {
  const params = useSearchParams();

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
    if (typeof minPrice === "number" && !isNaN(minPrice)) {
      items = items.filter((p) => p.priceBdt >= minPrice);
    }
    if (typeof maxPrice === "number" && !isNaN(maxPrice)) {
      items = items.filter((p) => p.priceBdt <= maxPrice);
    }
    if (colors.length > 0) {
      items = items.filter((p) => (p.colors as string[] | null)?.some((c) => colors.includes(c)));
    }
    if (sizes.length > 0) {
      items = items.filter((p) => (p.sizes as string[] | null)?.some((s) => sizes.includes(s)));
    }

    switch (sort) {
      case "price-asc":
        return [...items].sort((a, b) => a.priceBdt - b.priceBdt);
      case "price-desc":
        return [...items].sort((a, b) => b.priceBdt - a.priceBdt);
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
          availableColors={availableColors}
          availableSizes={availableSizes}
          availableTags={availableTags}
          priceMin={priceMin ?? 0}
          priceMax={priceMax ?? 0}
          shownCount={filteredItems.length}
          totalCount={allItems.length}
        />
      )}
      {filteredItems.length > 0 ? (
        <div className="grid grid-4">
          {filteredItems.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              segmentTag={segmentTag}
              heroImage={heroImages[p.id] ?? null}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state" style={{ marginBottom: showPreorder ? 24 : 0 }}>
          <h3>{isFiltered ? "No pieces match these filters" : "No pieces in stock just now"}</h3>
          {isFiltered ? (
            <p style={{ color: "var(--ink-soft)" }}>
              Try widening the filters &mdash;{" "}
              <Link href={`/shop/${segmentSlug}`} style={{ color: "var(--purple-900)" }}>
                see everything
              </Link>
              .
            </p>
          ) : !showPreorder ? (
            <p style={{ color: "var(--ink-soft)" }}>Check back soon.</p>
          ) : null}
        </div>
      )}
    </>
  );
}
