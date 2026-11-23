import { test, expect } from "@playwright/test";
import { skipWithoutDb, KNOWN_PRODUCT_SLUG, KNOWN_SEGMENT_ID, SEEDED_CART_ITEM } from "./helpers";

/**
 * Phase-0 baseline (IMPROVEMENT-PLAN.md): pins the currently-CORRECT behavior
 * of every flow the hardening phases touch, so pricing/latency/mobile changes
 * can't silently regress them. Deliberately avoids pinning behavior the plan
 * will change (৳0 price rendering, quick-view preorder bypass, animation
 * timings): those get their own assertions in the phase that fixes them.
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
    // 1234 × 2: formatBdt renders western digits with thousands separator on /en.
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
  test("preorder-only PDP opens the pre-order form in place (never a bare add-to-bag)", async ({ page }) => {
    skipWithoutDb();
    await page.goto(`/en/product/${KNOWN_PRODUCT_SLUG}`);
    // Every live catalogue product is preorder-only today: the panel's Pre-order
    // opens the request form right there, with no add-to-bag anywhere.
    await expect(page.locator(".pdp-panel").getByRole("button", { name: /add to bag/i })).toHaveCount(0);
    await page.locator(".pdp-panel .stage-cta").click();
    await expect(page.locator(".pdp-panel form")).toBeVisible({ timeout: 30_000 });
  });

  test("preorder request form renders for a preorder-enabled product", async ({ page }) => {
    skipWithoutDb();
    const res = await page.goto(`/en/preorder/product/${KNOWN_PRODUCT_SLUG}`);
    expect(res?.status()).toBe(200);
    await expect(page.locator("form").first()).toBeVisible();
  });

  test("the private usual price never reaches the page source", async ({ request }) => {
    skipWithoutDb();
    // Client components serialize every product field into the HTML, so a
    // non-null preorderPriceBdt here would publish the owner's private price.
    for (const path of [`/en/shop/${KNOWN_SEGMENT_ID}`, `/en/product/${KNOWN_PRODUCT_SLUG}`, "/en/wishlist"]) {
      const html = await (await request.get(path)).text();
      expect(html, path).not.toMatch(/preorderPriceBdt[^,}]{0,6}[0-9]/);
    }
  });

  test("shop stage opens a product in place, and Escape, Back and a shared link all work", async ({ page }) => {
    skipWithoutDb();
    const res = await page.goto(`/en/shop/${KNOWN_SEGMENT_ID}`);
    expect(res?.status()).toBe(200);
    // Every product is a real link to its page (crawlers, no JavaScript, new tabs).
    const item = page.locator(`.stage-item[href="/en/product/${KNOWN_PRODUCT_SLUG}"]`);
    await expect(item).toBeVisible();
    await item.click();
    await expect(page).toHaveURL(new RegExp(`[?&]b=${KNOWN_PRODUCT_SLUG}`));
    const panel = page.locator(".stage-panel");
    await expect(panel.getByRole("heading", { level: 2 })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(panel).toHaveCount(0);
    await expect(page).not.toHaveURL(/[?&]b=/);
    // Back closes an open panel instead of leaving the shop.
    await item.click();
    await expect(panel).toBeVisible();
    await page.goBack();
    await expect(panel).toHaveCount(0);
    await expect(page).toHaveURL(new RegExp(`/en/shop/${KNOWN_SEGMENT_ID}$`));
    // A shared link opens straight onto the product.
    await page.goto(`/en/shop/${KNOWN_SEGMENT_ID}?b=${KNOWN_PRODUCT_SLUG}`);
    await expect(panel).toBeVisible();
  });

  test("search API finds a known live product", async ({ request }) => {
    skipWithoutDb();
    const res = await request.get("/api/search?q=rose");
    expect(res.ok()).toBe(true);
    expect(await res.text()).toContain(KNOWN_PRODUCT_SLUG);
  });

  test("Enter in the header search opens the full results page", async ({ page }) => {
    skipWithoutDb();
    await page.goto("/en");
    await page.getByRole("button", { name: "Search Sanguine…" }).first().click();
    const input = page.locator(".nav-search input");
    await input.fill("rose");
    await expect(page.locator(".search-row").first()).toBeVisible();
    // A bouquet's price is hidden: the dropdown says so, and never shows ৳0.
    await expect(page.locator(".search-row .pr").first()).not.toContainText("0");
    await input.press("Enter");
    // The address changes once the results page has loaded (in-app navigation): a cold dev
    // server can take longer than the default 5 s to build it.
    await expect(page).toHaveURL(/\/en\/search\?q=rose/, { timeout: 30_000 });
    await expect(page.locator(`a[href="/en/product/${KNOWN_PRODUCT_SLUG}"]`).first()).toBeVisible();
  });

  test("the search API never sends a hidden price as 0", async ({ request }) => {
    skipWithoutDb();
    const body = await (await request.get("/api/search?q=rose")).json() as { results: Record<string, unknown>[] };
    expect(body.results.length).toBeGreaterThan(0);
    for (const r of body.results) {
      expect(r).not.toHaveProperty("priceBdt");
      expect(r).toHaveProperty("display");
    }
  });

  test("the heart in the shop panel saves a bouquet to the wishlist page", async ({ page }) => {
    skipWithoutDb();
    await page.goto(`/en/shop/${KNOWN_SEGMENT_ID}?b=${KNOWN_PRODUCT_SLUG}`);
    const heart = page.locator(".stage-panel .stage-heart");
    await expect(heart).toBeVisible({ timeout: 30_000 });
    await heart.click();
    await expect(heart).toHaveAttribute("aria-pressed", "true");
    await page.goto("/en/wishlist");
    await expect(page.locator(`.stage-item[href="/en/product/${KNOWN_PRODUCT_SLUG}"]`)).toBeVisible({ timeout: 30_000 });
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

test.describe("shop by occasion", () => {
  test("an unknown occasion is a 404, never an empty page", async ({ request }) => {
    const res = await request.get("/en/occasion/not-an-occasion");
    expect(res.status()).toBe(404);
  });

  test("a known occasion page renders in both languages @db", async ({ page }) => {
    skipWithoutDb();
    for (const [locale, heading] of [["en", "Birthday"], ["bn", "জন্মদিন"]] as const) {
      const res = await page.goto(`/${locale}/occasion/birthday`);
      expect(res?.status()).toBe(200);
      await expect(page.locator("h1")).toHaveText(heading);
    }
  });
});
