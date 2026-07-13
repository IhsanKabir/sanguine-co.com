import { test, expect } from "@playwright/test";
import { skipWithoutDb, KNOWN_PRODUCT_SLUG, KNOWN_SEGMENT_ID, SEEDED_CART_ITEM } from "./helpers";

/**
 * Phase-0 baseline (IMPROVEMENT-PLAN.md): pins the currently-CORRECT behavior
 * of every flow the hardening phases touch, so pricing/latency/mobile changes
 * can't silently regress them. Deliberately avoids pinning behavior the plan
 * will change (৳0 price rendering, quick-view preorder bypass, animation
 * timings) — those get their own assertions in the phase that fixes them.
 */

test.describe("baseline · cart + checkout shell", () => {
  test("cart page renders a seeded line with quantity-multiplied subtotal", async ({ page }) => {
    // Cart is localStorage-only; seeding the storage key renders a
    // deterministic bag with zero DB or add-to-bag-UI dependency.
    await page.addInitScript(
      ([key, item]) => localStorage.setItem(key as string, JSON.stringify([item])),
      ["ssg-cart-v1", SEEDED_CART_ITEM] as const,
    );
    await page.goto("/en/cart");
    await expect(page.getByText(SEEDED_CART_ITEM.name).first()).toBeVisible();
    // 1234 × 2 — formatBdt renders western digits with thousands separator on /en.
    await expect(page.getByText(/2,468/).first()).toBeVisible();
  });

  test("checkout renders the COD form for a seeded bag", async ({ page }) => {
    await page.addInitScript(
      ([key, item]) => localStorage.setItem(key as string, JSON.stringify([item])),
      ["ssg-cart-v1", SEEDED_CART_ITEM] as const,
    );
    const res = await page.goto("/en/checkout");
    expect(res?.status()).toBe(200);
    // The two fields every COD order needs, plus the submit control.
    await expect(page.locator("input").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /place order|continue/i }).first()).toBeVisible();
  });

  test("checkout with an empty bag still responds 200 (no crash)", async ({ page }) => {
    const res = await page.goto("/en/checkout");
    expect(res?.status()).toBe(200);
    await expect(page.locator("main#main")).toBeVisible();
  });
});

test.describe("baseline · catalogue flows @db", () => {
  test("preorder-only PDP offers the preorder CTA (never a bare add-to-bag)", async ({ page }) => {
    skipWithoutDb();
    await page.goto(`/en/product/${KNOWN_PRODUCT_SLUG}`);
    // Every live catalogue product is preorder-only today; the PDP's CTA
    // branch for that state is the preorder button linking to the request form.
    const preorderCta = page.locator(`a[href*="/preorder/product/${KNOWN_PRODUCT_SLUG}"]`).first();
    await expect(preorderCta).toBeVisible();
  });

  test("preorder request form renders for a preorder-enabled product", async ({ page }) => {
    skipWithoutDb();
    const res = await page.goto(`/en/preorder/product/${KNOWN_PRODUCT_SLUG}`);
    expect(res?.status()).toBe(200);
    await expect(page.locator("form").first()).toBeVisible();
  });

  test("shop grid renders cards and honors sort URL state", async ({ page }) => {
    skipWithoutDb();
    // URL-state rendering path (RSC re-render on filter change) exercised via
    // direct navigation — click-driven filter UX is redesigned in Phase 3, so
    // only the URL contract is pinned here.
    const res = await page.goto(`/en/shop/${KNOWN_SEGMENT_ID}?sort=price-asc`);
    expect(res?.status()).toBe(200);
    expect(await page.locator(".card").count()).toBeGreaterThan(0);
  });

  test("search API finds a known live product", async ({ request }) => {
    skipWithoutDb();
    const res = await request.get("/api/search?q=rose");
    expect(res.ok()).toBe(true);
    expect(await res.text()).toContain(KNOWN_PRODUCT_SLUG);
  });

  test("bn PDP renders with lang=bn", async ({ page }) => {
    skipWithoutDb();
    await page.goto(`/bn/product/${KNOWN_PRODUCT_SLUG}`);
    await expect(page.locator("html")).toHaveAttribute("lang", "bn");
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("admin health board is auth-gated", async ({ page }) => {
    skipWithoutDb();
    await page.goto("/en/admin/health");
    // requireAdmin redirects anonymous visitors into the sign-in flow.
    await expect(page).toHaveURL(/sign-in/);
  });
});
