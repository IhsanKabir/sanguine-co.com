import { NextResponse } from "next/server";
import { searchProducts, getHeroImagesFor } from "@/lib/queries";
import { priceDisplay } from "@/lib/pricing";
import { cutoutFor } from "@/lib/cutouts";
import { getUploadedCutouts } from "@/lib/cutout-store";
import { trackEvent } from "@/lib/events";
import { captureError } from "@/lib/monitoring";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (q.length < 2) return NextResponse.json({ results: [] });
  try {
    const results = await searchProducts(q, 8);
    // First photo per hit, so the dropdown shows the piece rather than the drawn placeholder.
    const [photos, uploaded] = await Promise.all([
      getHeroImagesFor(results.map((p) => p.id)).catch(() => new Map()),
      getUploadedCutouts().catch(() => ({})),
    ]);
    // Fire-and-forget event with zero-result flag for "search insights" report
    trackEvent({
      type: "search",
      payload: { query: q, results: results.length, zero_result: results.length === 0 },
      path: "/api/search",
    }).catch(() => {});
    return NextResponse.json({
      results: results.map((p) => ({
        id: p.id,
        slug: p.slug,
        sku: p.sku,
        name: p.name,
        nameBn: p.nameBn,
        // The shown price follows the shop's rules (a hidden price is never sent as 0).
        display: priceDisplay(p),
        preorderOnly: !!p.preorderOnly,
        cat: p.segmentId,
        // The cut-out when there is one (it stands on the cream), else the first photo.
        img: cutoutFor(p, uploaded)?.small ?? photos.get(p.id)?.url ?? null,
        cut: !!cutoutFor(p, uploaded),
      })),
    });
  } catch (e) {
    // Log internally but do not leak DB error details to the client.
    captureError(e, { where: "api/search", q });
    return NextResponse.json({ results: [], error: "Search unavailable." }, { status: 500 });
  }
}
