import { test, expect } from "@playwright/test";

/**
 * Storefront skeleton renders in both locales without a database:
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
    // none, so the banner must appear on the first interaction (it waits for
    // a scroll, tap or key press so it never covers the first screen).
    const stored = await page.evaluate(() => localStorage.getItem("ssg-cookie-consent-v1"));
    expect(stored).toBeNull();
    // Retry: a scroll before hydration has no listener to hear it yet.
    await expect(async () => {
      await page.mouse.wheel(0, 200);
      await expect(page.locator(".cookie-banner")).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 30_000 });
  });
});
