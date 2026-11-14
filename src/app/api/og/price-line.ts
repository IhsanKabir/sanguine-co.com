import type { PriceDisplay } from "@/lib/pricing";

/** Format whole-BDT amounts with the same en-IN lakh grouping as formatBdt. */
export function formatAmount(n: number): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
}

/**
 * The price line on a product's link preview, by the shop's own rules
 * (priceDisplay): a hidden price reads "Price on request", never "BDT 0",
 * and a made-to-order piece says so, as its shop card does ("Made to order",
 * pdp.preorderOnly). English only: the card has no Bangla font.
 */
export function priceLine(price: PriceDisplay, preorderOnly: boolean): string {
  const amount =
    price.kind === "fixed"
      ? `BDT ${formatAmount(price.amountBdt)}`
      : price.kind === "estimate"
        ? price.minBdt === price.maxBdt
          ? `BDT ${formatAmount(price.minBdt)}`
          : `BDT ${formatAmount(price.minBdt)}–${formatAmount(price.maxBdt)}`
        : "Price on request";
  return preorderOnly ? `Made to order · ${amount}` : amount;
}
