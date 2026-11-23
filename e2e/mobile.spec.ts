import { test, expect, devices } from "@playwright/test";
import { skipWithoutDb, KNOWN_PRODUCT_SLUG, KNOWN_SEGMENT_ID } from "./helpers";

/**
 * Phase-4 mobile pins (IMPROVEMENT-PLAN.md): viewport/touch behavior that
 * broke silently before: horizontal overflow, layers covering the shop
 * stage sheet, and PDP thumbs with no resolvable size.
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

  test("tapping a bouquet opens its sheet, and Pre-order is not covered @db", async ({ page }) => {
    skipWithoutDb();
    await page.goto(`/en/shop/${KNOWN_SEGMENT_ID}`);
    const item = page.locator(".stage-item").first();
    await item.scrollIntoViewIfNeeded();
    const box = await item.boundingBox();
    expect(box).not.toBeNull();
    await page.touchscreen.tap(box!.x + box!.width / 2, box!.y + box!.height / 2);
    const cta = page.locator(".stage-panel .stage-cta");
    await expect(cta).toBeVisible({ timeout: 20_000 });
    // The cookie notice and the chat buttons used to sit over the sheet (main is its own
    // layer): the button must be the top element where a thumb lands on it. Polled, because
    // the opening motion and the scroll to the stage take a moment to settle.
    await expect.poll(async () => {
      const ctaBox = await cta.boundingBox();
      if (!ctaBox) return false;
      return page.evaluate(([x, y]) => !!document.elementFromPoint(x, y)?.closest(".stage-cta"),
        [ctaBox.x + ctaBox.width / 2, ctaBox.y + ctaBox.height / 2]);
    }, { timeout: 10_000 }).toBe(true);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
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
