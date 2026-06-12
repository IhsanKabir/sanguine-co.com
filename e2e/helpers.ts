import { test } from "@playwright/test";

/**
 * Specs that need real catalogue rows call this first. Locally `.env`
 * provides DATABASE_URL so they run; on the GitHub runner they skip —
 * the smoke tier must never depend on secrets it doesn't have.
 */
export function skipWithoutDb(): void {
  test.skip(!process.env.DATABASE_URL, "needs a configured database (local only)");
}

/** Slug that the seed data ships and the soft-launch catalogue keeps live. */
export const KNOWN_PRODUCT_SLUG = "the-100-rose-special";
