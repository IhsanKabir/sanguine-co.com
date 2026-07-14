import { test, expect, devices } from "@playwright/test";
import { skipWithoutDb, KNOWN_PRODUCT_SLUG, KNOWN_SEGMENT_ID } from "./helpers";

/**
 * Phase-4 mobile pins (IMPROVEMENT-PLAN.md): viewport/touch behavior that
 * broke silently before — horizontal overflow, the invisible quick-view
 * overlay hijacking card taps, and PDP thumbs with no resolvable size.
 */
test.use({ ...devices["iPhone 12"], defaultBrowserType: "chromium" });

test.describe("mobile · 390px touch profile", () => {
  test("home has no horizontal overflow", async ({ page }) => {
    await page.goto("/en");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("tapping the bottom of a product card navigates to the PDP @db", async ({ page }) => {
    skipWithoutDb();
    await page.goto(`/en/shop/${KNOWN_SEGMENT_ID}`);
    // Dismiss the cookie banner first — it overlays the lower viewport (and
    // the first failure screenshot showed the tap landing on it, which is
    // the layer-stacking class of bug this suite exists to catch). Wait for
    // it to actually leave before computing tap coordinates.
    const consent = page.getByRole("button", { name: /essential only/i });
    await consent.click({ timeout: 10_000 }).catch(() => {});
    await consent.waitFor({ state: "hidden", timeout: 5_000 }).catch(() => {});
    const cover = page.locator(".card-cover").first();
    await cover.scrollIntoViewIfNeeded();
    const box = await cover.boundingBox();
    expect(box).not.toBeNull();
    // The invisible .qv-overlay used to swallow taps on this exact strip.
    await page.touchscreen.tap(box!.x + box!.width / 2, box!.y + box!.height - 12);
    await expect(page).toHaveURL(/\/product\//, { timeout: 20_000 });
  });

  test("PDP renders without overflow and thumbs stay thumbnail-sized @db", async ({ page }) => {
    skipWithoutDb();
    await page.goto(`/en/product/${KNOWN_PRODUCT_SLUG}`);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    const thumb = page.locator(".pdp-thumb").first();
    if (await thumb.count() > 0) {
      const tb = await thumb.boundingBox();
      // Pre-fix these blew up to full-width squares (or collapsed to 0).
      expect(tb!.width).toBeGreaterThan(20);
      expect(tb!.width).toBeLessThanOrEqual(80);
    }
  });
});
