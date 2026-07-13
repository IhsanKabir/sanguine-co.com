import { test } from "@playwright/test";

/**
 * Specs that need real catalogue rows call this first. Locally `.env`
 * provides DATABASE_URL so they run; on the GitHub runner they skip —
 * the smoke tier must never depend on secrets it doesn't have. CI sets
 * E2E_SKIP_DB explicitly because it also sets a placeholder DATABASE_URL
 * (db.ts throws at module load without one), so the URL's presence alone
 * can't distinguish "real database" from "placeholder".
 */
export function skipWithoutDb(): void {
  test.skip(
    Boolean(process.env.E2E_SKIP_DB) || !process.env.DATABASE_URL,
    "needs a configured database (local only)",
  );
}

/** Slug that the seed data ships and the soft-launch catalogue keeps live. */
export const KNOWN_PRODUCT_SLUG = "the-100-rose-special";

/** The only non-hidden segment in the soft-launch catalogue. */
export const KNOWN_SEGMENT_ID = "flowers";

/**
 * A localStorage cart line matching cart-context's CartItem shape — lets
 * cart/checkout specs render a deterministic bag without depending on any
 * add-to-bag UI path (which varies by product preorder state).
 */
export const SEEDED_CART_ITEM = {
  productId: "e2e-seeded-product",
  slug: "e2e-seeded-product",
  sku: "SSG-E2E-1",
  name: "E2E Seeded Piece",
  priceBdt: 1234,
  cat: "flowers",
  qty: 2,
};
