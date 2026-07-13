import { formatBdt } from "./utils";

/**
 * Quotation-driven pricing (IMPROVEMENT-PLAN Phase 1, owner decisions 2026-07-13).
 *
 * A piece is either:
 *  - fixed  — regular stocked product with a real price (priceBdt >= 1), or
 *  - estimate — preorder-only with an owner-researched range (priceMinBdt–priceMaxBdt),
 *  - quote  — preorder-only with no estimate yet: "price on quotation".
 *
 * The customer prepays a DEPOSIT = pct × the eventually-quoted per-unit price.
 * The pct comes from the product override or the global commerce setting.
 * Pure module — safe in server and client components; DB reads live in
 * `lib/commerce.ts`.
 */

export const DEFAULT_PREORDER_DEPOSIT_PCT = 20;
export const DEFAULT_RETURN_WINDOW_DAYS = 7;

export type PriceFields = {
  priceBdt: number;
  priceMinBdt?: number | null;
  priceMaxBdt?: number | null;
  preorderOnly: boolean;
};

export type PriceDisplay =
  | { kind: "fixed"; amountBdt: number }
  | { kind: "estimate"; minBdt: number; maxBdt: number } // minBdt === maxBdt renders as one value
  | { kind: "quote" };

export function priceDisplay(p: PriceFields): PriceDisplay {
  if (!p.preorderOnly && p.priceBdt > 0) return { kind: "fixed", amountBdt: p.priceBdt };
  const lo = p.priceMinBdt ?? p.priceMaxBdt ?? null;
  const hi = p.priceMaxBdt ?? p.priceMinBdt ?? null;
  if (lo !== null && hi !== null && lo > 0) return { kind: "estimate", minBdt: lo, maxBdt: hi };
  // Legacy preorder-only rows that carry a real fixed price are an estimate of one value.
  if (p.priceBdt > 0) return { kind: "estimate", minBdt: p.priceBdt, maxBdt: p.priceBdt };
  return { kind: "quote" };
}

/**
 * The numeric part of a price display — "" for quote-only pieces so callers
 * must render their own localized "Price on quotation" label.
 */
export function priceDisplayText(d: PriceDisplay, locale: "en" | "bn" = "en"): string {
  if (d.kind === "fixed") return formatBdt(d.amountBdt, locale);
  if (d.kind === "estimate") {
    return d.minBdt === d.maxBdt
      ? formatBdt(d.minBdt, locale)
      : `${formatBdt(d.minBdt, locale)}–${formatBdt(d.maxBdt, locale)}`;
  }
  return "";
}

/** Grid sorting: estimates sort by their ceiling; quote-only pieces sort last. */
export function priceSortValue(p: PriceFields): number {
  const d = priceDisplay(p);
  if (d.kind === "fixed") return d.amountBdt;
  if (d.kind === "estimate") return d.maxBdt;
  return Number.MAX_SAFE_INTEGER;
}

export function effectiveDepositPct(
  productPct: number | null | undefined,
  globalPct: number | null | undefined,
): number {
  const pct = productPct ?? globalPct ?? DEFAULT_PREORDER_DEPOSIT_PCT;
  return Math.min(100, Math.max(1, Math.round(pct)));
}

/** Deposit for a per-unit quote, whole BDT. */
export function depositForQuote(quotedUnitBdt: number, pct: number): number {
  return Math.max(1, Math.round((quotedUnitBdt * pct) / 100));
}

export function effectiveReturnWindowDays(
  productDays: number | null | undefined,
  globalDays: number | null | undefined,
): number {
  return productDays ?? globalDays ?? DEFAULT_RETURN_WINDOW_DAYS;
}

/**
 * schema.org offer fields for a product — never emits a zero price. Returns
 * null when the piece is quote-only (a priced Offer would be a lie; the PDP
 * omits `offers` entirely in that case).
 */
export function schemaOrgOffer(
  p: PriceFields & { stock: number },
): { price?: string; lowPrice?: string; highPrice?: string; availability: string; type: "Offer" | "AggregateOffer" } | null {
  const d = priceDisplay(p);
  const availability = p.preorderOnly
    ? "https://schema.org/PreOrder"
    : p.stock > 0
      ? "https://schema.org/InStock"
      : "https://schema.org/OutOfStock";
  if (d.kind === "fixed") return { type: "Offer", price: String(d.amountBdt), availability };
  if (d.kind === "estimate") {
    if (d.minBdt === d.maxBdt) return { type: "Offer", price: String(d.minBdt), availability };
    return { type: "AggregateOffer", lowPrice: String(d.minBdt), highPrice: String(d.maxBdt), availability };
  }
  return null;
}
