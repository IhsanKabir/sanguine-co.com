import { test, expect } from "@playwright/test";

/** SEO plumbing that has silently broken before — keep it pinned. */
test.describe("SEO smoke", () => {
  test("robots.txt explicitly allows /api/og despite the /api disallow", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toContain("Allow: /api/og");
    expect(text).toContain("Disallow: /api");
    expect(text).toContain("Sitemap:");
  });

  test("home emits parseable JSON-LD and a canonical", async ({ page }) => {
    await page.goto("/en");
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) {
      // JSON.parse throws → test fails: malformed structured data is exactly
      // what this spec exists to catch.
      const parsed = JSON.parse(block);
      expect(parsed).toBeTruthy();
    }
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveCount(1);
    expect(await canonical.getAttribute("href")).toContain("/en");
  });

  test("home og:image points at the OG card route", async ({ page }) => {
    await page.goto("/en");
    const og = page.locator('meta[property="og:image"]').first();
    expect(await og.getAttribute("content")).toContain("/api/og");
  });
});
