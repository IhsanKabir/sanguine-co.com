import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getProductBySlug, getProductImages, getSegmentBySlug } from "@/lib/queries";
import { captureError } from "@/lib/monitoring";

/**
 * Dynamic Open Graph card — EXECUTION-PLAN Phase 2.3.
 *
 *   /api/og              → generic maison card (1200×630 PNG)
 *   /api/og?slug=<slug>  → product card; unknown slug falls back to the
 *                          generic card (acceptance criteria: never 404)
 *
 * Why this exists: most products have no real photography yet (Composition
 * art is the visual identity at launch), so PDPs shared on WhatsApp /
 * Facebook — the primary BD channels — previously rendered with no card at
 * all. This route guarantees every shared link gets a branded 1200×630 card
 * in the maison register, overlaying the hero photo when one exists.
 *
 * Node runtime (not edge): we reuse the Drizzle catalogue queries, which
 * need a TCP Postgres connection, and read the bundled fonts from disk.
 * Vercel cold-start latency is mitigated by long CDN cache headers below
 * (plan risk R-2.A) rather than build-time pre-rendering.
 */
export const runtime = "nodejs";

// ── Palette ──────────────────────────────────────────────────────────────
// Hex equivalents of the OKLCH tokens in styles.css:1-15 (satori, the SVG
// renderer behind ImageResponse, does not parse oklch()). If the palette
// shifts, re-derive these from :root rather than eyeballing.
const PLUM_950 = "#1f0039";
const PLUM_900 = "#3a045e";
const VIOLET_HOUR = "#3a1c55";
const PLUM_200 = "#d3cbef";
const PLUM_400 = "#aea1d9";
const PLUM_700 = "#73599e";
const MAUVE = "#9274c3";
const GOLD = "#ca9740";
const CREAM = "#f5efe6";

const WIDTH = 1200;
const HEIGHT = 630;
const PHOTO_WIDTH = 460;

const TAGLINE = "Garments, flora & small ceremonies for the violet hour.";

// Display labels for the product `tag` enum ('new'|'sale'|'limited'|'staff-pick').
const TAG_LABELS: Record<string, string> = {
  new: "NEW",
  sale: "SALE",
  limited: "LIMITED",
  "staff-pick": "STAFF PICK",
};

// ── Fonts ────────────────────────────────────────────────────────────────
// Bundled OFL-licensed static TTFs (see _fonts/LICENSE.txt). Bundling beats
// fetching from Google Fonts at request time: no runtime egress dependency,
// deterministic cold starts. `outputFileTracingIncludes` in next.config.mjs
// makes sure Vercel packs them into the function.
//
// No Bengali face is bundled (Noto Serif Bengali alone is ~600 KB), so the
// card always renders the product's English name and a "BDT" prefix instead
// of ৳. The og:title/og:description meta on the PDP stay fully localised —
// only the image text is EN. Revisit if Bangla-script cards become a brand
// requirement.
const FONT_DIR = path.join(process.cwd(), "src", "app", "api", "og", "_fonts");

type FontSet = { serif: Buffer; serifItalic: Buffer; sans: Buffer };
let fontsPromise: Promise<FontSet> | null = null;

function loadFonts(): Promise<FontSet> {
  // Module-level cache: fonts are read from disk once per lambda instance.
  // The cache is cleared on rejection — otherwise one bad cold-start (e.g.
  // mis-traced font files) would pin a rejected promise and 500 every
  // subsequent request on that instance instead of retrying the disk read.
  fontsPromise ??= Promise.all([
    readFile(path.join(FONT_DIR, "CormorantGaramond-SemiBold.ttf")),
    readFile(path.join(FONT_DIR, "CormorantGaramond-MediumItalic.ttf")),
    readFile(path.join(FONT_DIR, "Inter-Regular.ttf")),
  ])
    .then(([serif, serifItalic, sans]) => ({ serif, serifItalic, sans }))
    .catch((err) => {
      fontsPromise = null;
      throw err;
    });
  return fontsPromise;
}

// ── Shared visual pieces ─────────────────────────────────────────────────

/**
 * Three layered tide-lines along the bottom edge — a static echo of the
 * HeroTide parallax that anchors the storefront register.
 */
function TideWaves() {
  return (
    <svg
      width={WIDTH}
      height={200}
      viewBox="0 0 1200 200"
      style={{ position: "absolute", bottom: 0, left: 0 }}
    >
      <path
        d="M0 110 C 200 70, 400 150, 600 110 S 1000 70, 1200 110 L1200 200 L0 200 Z"
        fill={MAUVE}
        fillOpacity={0.16}
      />
      <path
        d="M0 145 C 250 105, 450 185, 700 145 S 1050 105, 1200 145 L1200 200 L0 200 Z"
        fill={PLUM_700}
        fillOpacity={0.28}
      />
      <path
        d="M0 175 C 300 148, 500 202, 800 175 S 1100 148, 1200 175 L1200 200 L0 200 Z"
        fill={GOLD}
        fillOpacity={0.12}
      />
    </svg>
  );
}

/** Italic-serif wordmark with the small gold MAISON sup — mirrors `.nav-brand`. */
function Wordmark({ size = 40 }: { size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline" }}>
      <span
        style={{
          fontFamily: "Cormorant Garamond",
          fontStyle: "italic",
          fontWeight: 500,
          fontSize: size,
          color: CREAM,
          letterSpacing: 1,
        }}
      >
        Saanguine
      </span>
      <span
        style={{
          fontFamily: "Inter",
          fontSize: Math.round(size * 0.28),
          letterSpacing: 4,
          color: GOLD,
          marginLeft: 12,
        }}
      >
        MAISON
      </span>
    </div>
  );
}

const rootStyle = {
  width: WIDTH,
  height: HEIGHT,
  display: "flex" as const,
  position: "relative" as const,
  background: `linear-gradient(160deg, ${PLUM_950} 0%, ${PLUM_900} 58%, ${VIOLET_HOUR} 100%)`,
  fontFamily: "Inter",
};

// ── Cards ────────────────────────────────────────────────────────────────

/** Generic maison card: wordmark + tagline. Used for `/api/og` and unknown slugs. */
function MaisonCard() {
  return (
    <div style={{ ...rootStyle, alignItems: "center", justifyContent: "center" }}>
      <TideWaves />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginTop: -36,
        }}
      >
        <span style={{ fontSize: 22, letterSpacing: 8, color: GOLD }}>MAISON</span>
        <span
          style={{
            fontFamily: "Cormorant Garamond",
            fontStyle: "italic",
            fontWeight: 500,
            fontSize: 124,
            color: CREAM,
            marginTop: 8,
          }}
        >
          Saanguine
        </span>
        <div style={{ width: 72, height: 2, background: GOLD, marginTop: 22 }} />
        <span
          style={{
            fontSize: 26,
            color: PLUM_200,
            marginTop: 26,
            maxWidth: 720,
            textAlign: "center",
            lineHeight: 1.4,
          }}
        >
          {TAGLINE}
        </span>
      </div>
    </div>
  );
}

type ProductCardData = {
  name: string;
  segmentName: string | null;
  priceBdt: number;
  wasBdt: number | null;
  tag: string | null;
  photoUrl: string | null;
};

/** Format whole-BDT amounts with the same en-IN lakh grouping as formatBdt. */
function formatAmount(n: number): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
}

// Admin uploads are capped at 8 MB; anything larger is not ours to render.
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const PHOTO_TIMEOUT_MS = 5_000;

/**
 * Fetch the hero photo ourselves and inline it as a data URI instead of
 * handing satori the URL. Satori's internal fetch has no timeout — a slow
 * Supabase response would hang the render for every scraper — and its
 * failure would throw mid-stream and 500 the card. This way a slow or
 * broken photo degrades to the photo-less card layout instead.
 * The URL itself is trusted: recordProductImage validates the Supabase
 * Storage prefix at write time, so this never fetches user-supplied hosts.
 */
async function fetchPhotoDataUri(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(PHOTO_TIMEOUT_MS) });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "image/jpeg";
    if (!type.startsWith("image/")) return null;
    const length = Number(res.headers.get("content-length") ?? 0);
    if (length > MAX_PHOTO_BYTES) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > MAX_PHOTO_BYTES) return null;
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch (err) {
    captureError(err, { route: "/api/og", photoUrl: url });
    return null;
  }
}

/** Long names get a smaller display size so they stay inside the column. */
function nameFontSize(name: string): number {
  if (name.length <= 26) return 68;
  if (name.length <= 52) return 54;
  return 44;
}

function ProductCard({ p }: { p: ProductCardData }) {
  const hasPhoto = Boolean(p.photoUrl);
  const columnWidth = hasPhoto ? WIDTH - PHOTO_WIDTH : WIDTH;
  // Names beyond ~88 chars would overflow even at the smallest size; clamp.
  const name = p.name.length > 88 ? `${p.name.slice(0, 87).trimEnd()}…` : p.name;
  const tagLabel = p.tag ? TAG_LABELS[p.tag] ?? p.tag.toUpperCase() : null;

  return (
    <div style={rootStyle}>
      <TideWaves />
      {hasPhoto && (
        // eslint-disable-next-line @next/next/no-img-element -- satori canvas, not the DOM
        <img
          src={p.photoUrl!}
          alt=""
          width={PHOTO_WIDTH}
          height={HEIGHT}
          style={{
            position: "absolute",
            top: 0,
            left: columnWidth,
            width: PHOTO_WIDTH,
            height: HEIGHT,
            objectFit: "cover",
          }}
        />
      )}
      {hasPhoto && (
        // Seam: blend the photo's left edge into the plum field so the card
        // reads as one composition, plus a gentle full-photo tint.
        <div
          style={{
            position: "absolute",
            top: 0,
            left: columnWidth,
            width: PHOTO_WIDTH,
            height: HEIGHT,
            background: `linear-gradient(90deg, ${PLUM_950} 0%, rgba(31,0,57,0.42) 18%, rgba(31,0,57,0.14) 45%, rgba(31,0,57,0.14) 100%)`,
          }}
        />
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: columnWidth,
          height: HEIGHT,
          padding: "56px 64px",
        }}
      >
        <span style={{ fontSize: 19, letterSpacing: 5, color: GOLD }}>
          {p.segmentName
            ? `SAANGUINE MAISON · ${p.segmentName.toUpperCase()}`
            : "SAANGUINE MAISON"}
        </span>

        <div style={{ display: "flex", flexDirection: "column", maxWidth: hasPhoto ? 600 : 900 }}>
          <span
            style={{
              fontFamily: "Cormorant Garamond",
              fontWeight: 600,
              fontSize: nameFontSize(name),
              color: CREAM,
              lineHeight: 1.08,
            }}
          >
            {name}
          </span>
          <div style={{ width: 64, height: 2, background: GOLD, marginTop: 24 }} />
          <div style={{ display: "flex", alignItems: "center", marginTop: 22 }}>
            <span style={{ fontSize: 28, color: PLUM_200 }}>
              {`BDT ${formatAmount(p.priceBdt)}`}
            </span>
            {p.wasBdt != null && p.wasBdt > p.priceBdt && (
              <span
                style={{
                  fontSize: 22,
                  color: PLUM_400,
                  textDecoration: "line-through",
                  marginLeft: 18,
                }}
              >
                {`BDT ${formatAmount(p.wasBdt)}`}
              </span>
            )}
            {tagLabel && (
              <span
                style={{
                  fontSize: 15,
                  letterSpacing: 3,
                  color: GOLD,
                  border: `1px solid ${GOLD}`,
                  borderRadius: 999,
                  padding: "7px 16px",
                  marginLeft: 22,
                }}
              >
                {tagLabel}
              </span>
            )}
          </div>
        </div>

        <Wordmark />
      </div>
    </div>
  );
}

// ── Route handler ────────────────────────────────────────────────────────

// Slugs are kebab-case in the catalogue; anything else is treated as unknown
// (→ generic card) without touching the database. The 80-char cap matches
// the searchProducts query cap. Note: unique-slug enumeration still costs
// one DB lookup per CDN miss — acceptable under the soft-launch posture
// where real IP rate limiting is an accepted deferral (GAP-ANALYSIS §13.1
// M-2); revisit alongside that item.
const SLUG_RE = /^[a-z0-9-]{1,80}$/;

// Cards change only when the catalogue does; let the CDN absorb crawler
// traffic. A day of s-maxage + a week of stale-while-revalidate means a
// price edit propagates within 24h without any cold-render storms.
// Dev skips caching — Next's own dev default is no-cache, and a custom
// header here would override it and serve stale cards while iterating.
const CACHE_CONTROL =
  process.env.NODE_ENV === "development"
    ? "no-store"
    : "public, max-age=600, s-maxage=86400, stale-while-revalidate=604800";

export async function GET(request: Request) {
  try {
    const fonts = await loadFonts();
    const imageOptions = {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        { name: "Cormorant Garamond", data: fonts.serif, weight: 600 as const, style: "normal" as const },
        { name: "Cormorant Garamond", data: fonts.serifItalic, weight: 500 as const, style: "italic" as const },
        { name: "Inter", data: fonts.sans, weight: 400 as const, style: "normal" as const },
      ],
      headers: { "Cache-Control": CACHE_CONTROL },
    };

    const slugParam = new URL(request.url).searchParams.get("slug")?.trim().toLowerCase() ?? "";

    if (SLUG_RE.test(slugParam)) {
      // Catalogue lookups fail soft: a DB blip degrades to the generic card
      // instead of a broken share preview.
      const p = await getProductBySlug(slugParam).catch((err) => {
        captureError(err, { route: "/api/og", slug: slugParam });
        return null;
      });
      if (p) {
        const [photos, segment] = await Promise.all([
          getProductImages(p.id).catch(() => []),
          p.segmentId ? getSegmentBySlug(p.segmentId).catch(() => null) : Promise.resolve(null),
        ]);
        const photoUrl = photos[0]?.url
          ? await fetchPhotoDataUri(photos[0].url)
          : null;
        return new ImageResponse(
          (
            <ProductCard
              p={{
                name: p.name,
                segmentName: segment?.name ?? null,
                priceBdt: p.priceBdt,
                wasBdt: p.wasBdt,
                tag: p.tag,
                photoUrl,
              }}
            />
          ),
          imageOptions,
        );
      }
    }

    return new ImageResponse(<MaisonCard />, imageOptions);
  } catch (err) {
    captureError(err, { route: "/api/og" });
    return new Response("OG render failed", { status: 500 });
  }
}
