import { test, expect } from "@playwright/test";

/**
 * Storefront skeleton renders in both locales without a database —
 * the canary for "the deploy is fundamentally broken".
 */
test.describe("home smoke", () => {
  test("en home renders hero and topbar with correct lang", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("h1").first()).toBeVisible();
    await expect(page.locator(".topbar").first()).toBeVisible();
  });

  test("bn home renders with lang=bn (SSR, not client-patched)", async ({ page }) => {
    await page.goto("/bn");
    await expect(page.locator("html")).toHaveAttribute("lang", "bn");
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("cookie consent banner appears for a fresh visitor", async ({ page }) => {
    await page.goto("/en");
    // The consent UI persists its choice under this key; a fresh context has
    // none, so the banner must be in the DOM.
    const stored = await page.evaluate(() => localStorage.getItem("ssg-cookie-consent-v1"));
    expect(stored).toBeNull();
    await expect(page.locator("text=/cookie/i").first()).toBeVisible();
  });
});
