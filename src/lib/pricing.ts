import { formatBdt } from "./utils";
import { dhakaTomorrow } from "./delivery";

/**
 * Quotation-driven pricing (IMPROVEMENT-PLAN Phase 1, owner decisions 2026-07-13).
 *
 * A piece is either:
 *  - fixed : regular stocked product with a real price (priceBdt >= 1), or
 *  - estimate: preorder-only with an owner-researched range (priceMinBdt–priceMaxBdt),
 *  - quote : preorder-only with no estimate yet: "price on quotation".
 *
 * The customer prepays a DEPOSIT = pct × the eventually-quoted per-unit price.
 * The pct comes from the product override or the global commerce setting.
 * Pure module: safe in server and client components; DB reads live in
 * `lib/commerce.ts`.
 */

// The advance when the piece goes out today or tomorrow (owner, 26 Nov 2026). Admin → Settings
// holds the live value; later dates are capped by LATER_DATE_DEPOSIT_CAP_PCT.
export const DEFAULT_PREORDER_DEPOSIT_PCT = 30;
/**
 * Digital Commerce Operation Guidelines 2021, clause 3.2.10 (gazette of 4 July 2021): when a
 * product cannot be handed to the delivery person within 48 hours of payment, no more than 10%
 * of its price may be taken in advance. There is no exemption for flowers.
 */
export const LATER_DATE_DEPOSIT_CAP_PCT = 10;
// Fallback only: the window customers see is the Admin → Settings value
// (products may override it). /legal/returns and the marquee read that value.
export const DEFAULT_RETURN_WINDOW_DAYS = 3;

// Shipping rules. These are only the DEFAULTS: the live values are saved in
// Admin → Settings (site_settings.commerce) and read through
// getCommerceSettings() on the server / useShippingRules() in the browser.
export const FREE_SHIPPING_THRESHOLD_BDT = 5000;
export const FLAT_SHIPPING_DHAKA_BDT = 80;
export const FLAT_SHIPPING_OUTSIDE_BDT = 150;

export type ShippingRules = {
  freeShippingThresholdBdt: number;
  shippingDhakaBdt: number;
  shippingOutsideBdt: number;
};

export const DEFAULT_SHIPPING_RULES: ShippingRules = {
  freeShippingThresholdBdt: FREE_SHIPPING_THRESHOLD_BDT,
  shippingDhakaBdt: FLAT_SHIPPING_DHAKA_BDT,
  shippingOutsideBdt: FLAT_SHIPPING_OUTSIDE_BDT,
};

/**
 * The one shipping calculation. The cart, the drawer and checkout show it;
 * createCodOrder charges it: same function, so the quote and the charge
 * cannot disagree. A threshold of 0 disables free shipping.
 */
export function shippingFor(rules: ShippingRules, city: string, subtotalBdt: number): number {
  if (rules.freeShippingThresholdBdt > 0 && subtotalBdt >= rules.freeShippingThresholdBdt) return 0;
  return city.toLowerCase().includes("dhaka") ? rules.shippingDhakaBdt : rules.shippingOutsideBdt;
}

/** True when the subtotal already qualifies for free shipping. */
export function qualifiesForFreeShipping(rules: ShippingRules, subtotalBdt: number): boolean {
  return rules.freeShippingThresholdBdt > 0 && subtotalBdt >= rules.freeShippingThresholdBdt;
}

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
 * The numeric part of a price display: "" for quote-only pieces so callers
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

/** When a piece is due: what decides whether it goes out within 48 hours of the advance. */
export interface DeliveryTiming {
  /** "YYYY-MM-DD" in Dhaka, as stored on the request; null when none was chosen. */
  targetDate: string | null;
  /** Same-day express (flowers only): always within 48 hours. */
  express: boolean;
  /** A bouquet: made on the day, so it goes out today, tomorrow, or as soon as the advance
   *  arrives. Any other made-to-order piece takes longer, whatever date is picked. */
  bouquet: boolean;
}

/** True when the piece is handed to delivery within 48 hours of the advance being paid. */
export function deliversWithin48h(t: DeliveryTiming, now: Date): boolean {
  if (!t.bouquet) return false;
  if (t.express || !t.targetDate) return true;
  // Today or tomorrow in Dhaka (any moment of those two days is under 48 hours away), or a day
  // already gone: the bouquet is then made as soon as the advance arrives.
  return t.targetDate <= dhakaTomorrow(now);
}

/** The advance share: the Admin percentage, capped at 10% for a later date (clause 3.2.10). */
export function depositPctFor(basePct: number, within48h: boolean): number {
  return within48h ? basePct : Math.min(basePct, LATER_DATE_DEPOSIT_CAP_PCT);
}

/** Deposit for a quote, whole BDT, rounded down so it never goes over its share of the price. */
export function depositForQuote(quotedUnitBdt: number, pct: number): number {
  return Math.max(1, Math.floor((quotedUnitBdt * pct) / 100));
}

export function effectiveReturnWindowDays(
  productDays: number | null | undefined,
  globalDays: number | null | undefined,
): number {
  return productDays ?? globalDays ?? DEFAULT_RETURN_WINDOW_DAYS;
}

/**
 * schema.org offer fields for a product: never emits a zero price. Returns
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
