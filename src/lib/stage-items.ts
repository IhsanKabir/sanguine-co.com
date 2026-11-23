import { cutoutFor, type Cutout } from "@/lib/cutouts";
import { isDhakaOnlySegment } from "@/lib/delivery-scope";
import { priceDisplay, priceDisplayText } from "@/lib/pricing";
import { displayName } from "@/lib/product-name";

/** One product as the shop's stage shows it (components/storefront/Stage.tsx). Plain data. */
export interface StageItem {
  id: string;
  slug: string;
  name: string;
  /** "Made to order" for pre-order-only pieces, otherwise the price line. */
  meta: string;
  /** The cut-out, when there is one; otherwise the first photo stands in, shown round. */
  cutout: Cutout | null;
  photo: string | null;
  colors: string[];
  sizes: string[];
  /** Pre-order is open, so the panel offers the form in place. */
  canPreorder: boolean;
  /** Flowers: delivered in Dhaka only (same-day line and fixed city). */
  dhakaOnly: boolean;
  /** Pieces picked in Admin as "Complete the look" for this one. */
  lookIds: string[];
  /** Its category's name, for pages that mix categories (search, wishlist). */
  segmentName?: string;
}

type Product = Parameters<typeof priceDisplay>[0] & {
  id: string;
  slug: string;
  name: string;
  nameBn: string | null;
  segmentId: string | null;
  colors: unknown;
  sizes: unknown;
  preorderEnabled: boolean | null;
  preorderOnly: boolean | null;
  lookProductIds: unknown;
};

interface Labels {
  madeToOrder: string;
  priceOnQuote: string;
}

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

export function toStageItems(
  products: readonly Product[],
  opts: {
    locale: string;
    uploaded: Readonly<Record<string, Cutout>>;
    photos: ReadonlyMap<string, { url: string }>;
    labels: Labels;
    /** Category names by id: set on pages that mix categories, so each panel names its own. */
    segmentNames?: ReadonlyMap<string, string>;
  },
): StageItem[] {
  const bn = opts.locale === "bn";
  return products.map((p) => {
    const display = priceDisplay(p);
    const price = display.kind === "quote" ? opts.labels.priceOnQuote : priceDisplayText(display, bn ? "bn" : "en");
    return {
      id: p.id,
      slug: p.slug,
      name: (bn && p.nameBn) || displayName(p.name),
      meta: p.preorderOnly ? opts.labels.madeToOrder : price,
      cutout: cutoutFor(p, opts.uploaded),
      photo: opts.photos.get(p.id)?.url ?? null,
      colors: strings(p.colors),
      sizes: strings(p.sizes),
      canPreorder: !!p.preorderEnabled,
      dhakaOnly: isDhakaOnlySegment(p.segmentId),
      lookIds: strings(p.lookProductIds),
      segmentName: (p.segmentId && opts.segmentNames?.get(p.segmentId)) || undefined,
    };
  });
}
