import { test, expect } from "@playwright/test";
import { skipWithoutDb, KNOWN_PRODUCT_SLUG } from "./helpers";

/**
 * /api/og acceptance (EXECUTION-PLAN 2.3): always a 1200×630 PNG, never a
 * 404 — share scrapers must get a card whatever they ask for.
 */
test.describe("OG card route", () => {
  test("generic maison card renders as PNG", async ({ request }) => {
    const res = await request.get("/api/og");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("image/png");
    const body = await res.body();
    // PNG signature + IHDR dimensions at fixed offsets.
    expect(body.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(body.readUInt32BE(16)).toBe(1200);
    expect(body.readUInt32BE(20)).toBe(630);
  });

  test("unknown slug falls back to the maison card, not 404", async ({ request }) => {
    const res = await request.get("/api/og?slug=definitely-not-a-product");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("image/png");
  });

  test("malformed slug is rejected before touching the DB and still renders", async ({ request }) => {
    const res = await request.get("/api/og?slug=" + encodeURIComponent("<script>alert(1)</script>"));
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("image/png");
  });

  test("live product renders its card @db", async ({ request }) => {
    skipWithoutDb();
    const res = await request.get(`/api/og?slug=${KNOWN_PRODUCT_SLUG}`);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("image/png");
    const body = await res.body();
    expect(body.readUInt32BE(16)).toBe(1200);
    expect(body.readUInt32BE(20)).toBe(630);
  });
});
