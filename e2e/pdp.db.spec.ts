import { test, expect } from "@playwright/test";
import { skipWithoutDb, KNOWN_PRODUCT_SLUG } from "./helpers";

/**
 * Catalogue-backed checks — local only (the CI runner has no database).
 */
test.describe("PDP @db", () => {
  test("product page renders with Product JSON-LD and the OG card", async ({ page }) => {
    skipWithoutDb();
    const res = await page.goto(`/en/product/${KNOWN_PRODUCT_SLUG}`);
    expect(res?.status()).toBe(200);
    await expect(page.locator("h1").first()).toBeVisible();

    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const hasProduct = blocks.some((b) => {
      try {
        const parsed = JSON.parse(b);
        const list = Array.isArray(parsed) ? parsed : [parsed];
        return list.some((x) => x["@type"] === "Product");
      } catch {
        return false;
      }
    });
    expect(hasProduct).toBe(true);

    const og = page.locator('meta[property="og:image"]').first();
    expect(await og.getAttribute("content")).toContain(`/api/og?slug=${KNOWN_PRODUCT_SLUG}`);
  });

  test("cart page renders for a fresh visitor", async ({ page }) => {
    // Cart is localStorage-backed (no DB), but lives here with a real
    // navigation flow; keep it deterministic — fresh context = empty cart.
    // The page has no <h1> (heading lives in client components), so assert
    // the layout's <main> landmark instead.
    const res = await page.goto("/en/cart");
    expect(res?.status()).toBe(200);
    await expect(page.locator("main#main")).toBeVisible();
  });
});
