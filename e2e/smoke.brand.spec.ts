import { test, expect, type Locator } from "@playwright/test";
import { priceLine } from "../src/app/api/og/price-line";

/**
 * The logo (brand/README.md): সাঙ্গুইন hangs from a gold line and SANGUINE
 * stands on it. Wide screens show both scripts; phones show the page's own
 * language. Also the link preview's price line, which used to read "BDT 0"
 * for made-to-order flowers.
 */

const loadedSrc = (img: Locator) =>
  img.evaluate((el) => {
    const i = el as HTMLImageElement;
    return i.complete && i.naturalWidth > 0 ? i.currentSrc : "";
  });

test.describe("link preview price line", () => {
  test("a hidden price reads Price on request, never BDT 0", () => {
    expect(priceLine({ kind: "quote" }, true)).toBe("Made to order · Price on request");
    expect(priceLine({ kind: "quote" }, false)).toBe("Price on request");
  });

  test("fixed and estimated prices keep the lakh grouping", () => {
    expect(priceLine({ kind: "fixed", amountBdt: 125000 }, false)).toBe("BDT 1,25,000");
    expect(priceLine({ kind: "estimate", minBdt: 1500, maxBdt: 1500 }, true)).toBe("Made to order · BDT 1,500");
    expect(priceLine({ kind: "estimate", minBdt: 1500, maxBdt: 2500 }, true)).toBe("Made to order · BDT 1,500–2,500");
  });
});

test.describe("logo in the header", () => {
  test("links home and names the brand in each language", async ({ page }) => {
    await page.goto("/en");
    const en = page.locator(".nav-brand img");
    await expect(en).toHaveAttribute("alt", "Sanguine");
    await expect(page.locator(".nav-brand")).toHaveAttribute("href", "/en");
    await expect.poll(() => loadedSrc(en)).toContain("/brand/sanguine-lockup.svg");

    await page.goto("/bn");
    const bn = page.locator(".nav-brand img");
    await expect(bn).toHaveAttribute("alt", "সাঙ্গুইন");
    await expect.poll(() => loadedSrc(bn)).toContain("/brand/sanguine-lockup.svg");
  });
});

test.describe("logo on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("shows only the page's own language", async ({ page }) => {
    await page.goto("/en");
    await expect.poll(() => loadedSrc(page.locator(".nav-brand img"))).toContain("/brand/sanguine-en.svg");
    await page.goto("/bn");
    await expect.poll(() => loadedSrc(page.locator(".nav-brand img"))).toContain("/brand/sanguine-bn.svg");
  });
});

test.describe("logo files and icons", () => {
  test("are served with the right types", async ({ request }) => {
    const files: Array<[string, string]> = [
      ["/brand/sanguine-lockup.svg", "image/svg+xml"],
      ["/brand/sanguine-lockup-cream.svg", "image/svg+xml"],
      ["/brand/sanguine-en.svg", "image/svg+xml"],
      ["/brand/sanguine-bn.svg", "image/svg+xml"],
      ["/brand/sanguine-lockup-email.png", "image/png"],
      ["/favicon-source.svg", "image/svg+xml"],
      ["/icon-192.png", "image/png"],
      ["/icon-512.png", "image/png"],
      ["/apple-touch-icon.png", "image/png"],
      ["/logo.png", "image/png"],
    ];
    for (const [path, type] of files) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(200);
      expect(res.headers()["content-type"], path).toContain(type);
    }
  });

  test("the web app manifest lists the 192 and 512 icons", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.status()).toBe(200);
    const manifest = (await res.json()) as { icons: Array<{ src: string; sizes: string }> };
    expect(manifest.icons.map((i) => i.sizes)).toEqual(expect.arrayContaining(["192x192", "512x512"]));
  });
});
