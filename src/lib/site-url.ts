/**
 * Single source of truth for the storefront's absolute base URL.
 *
 * Every canonical tag, hreflang alternate, og:image URL, sitemap entry and
 * customer-email link is built from this value. Before this module existed
 * the same `process.env.NEXT_PUBLIC_SITE_URL || <fallback>` expression was
 * copy-pasted in 17 files — and the Vercel env var was found set to
 * `http://saanguine.vercel.app` (wrong scheme AND a host that 404s), so
 * every one of those surfaces silently shipped dead links in production.
 *
 * Resolution order — deliberately trusts Vercel over hand-typed config:
 *   1. VERCEL_PROJECT_PRODUCTION_URL — auto-set by Vercel to the project's
 *      real production domain (bare host, no scheme). Can't drift: when the
 *      custom domain (saanguine.com) lands it updates by itself.
 *   2. NEXT_PUBLIC_SITE_URL — manual override for setups Vercel can't know
 *      about (external proxy domain) and for local dev. Normalised: scheme
 *      forced to https (localhost excepted), trailing slashes stripped,
 *      malformed values rejected instead of propagated.
 *   3. Hardcoded soft-launch URL — keeps local dev and CI building.
 *
 * A mismatch between 1 and 2 is logged loudly at module load (visible in
 * Vercel build + function logs) so a stale manual value gets noticed and
 * deleted instead of lying dormant.
 */

const FALLBACK = "https://saanguine-the-retail-shop.vercel.app";

function normalize(raw: string | undefined): string | null {
  if (!raw) return null;
  let candidate = raw.trim().replace(/\/+$/, "");
  if (!candidate) return null;
  if (!/^https?:\/\//i.test(candidate)) candidate = `https://${candidate}`;
  try {
    const url = new URL(candidate);
    // Local dev may legitimately run plain http; production never should —
    // an http base poisons canonicals and makes some scrapers reject
    // og:image URLs outright.
    const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    const protocol = isLocal ? url.protocol : "https:";
    return `${protocol}//${url.host}`;
  } catch {
    return null;
  }
}

const fromVercel = normalize(process.env.VERCEL_PROJECT_PRODUCTION_URL);
const fromEnv = normalize(process.env.NEXT_PUBLIC_SITE_URL);

export const SITE_URL: string = fromVercel ?? fromEnv ?? FALLBACK;

// One-time, server-side visibility. A silently-wrong base URL is exactly how
// the dead-host bug went unnoticed — make disagreement and rejection loud.
if (fromVercel && fromEnv && fromVercel !== fromEnv) {
  console.warn(
    `[site-url] NEXT_PUBLIC_SITE_URL ("${process.env.NEXT_PUBLIC_SITE_URL}") disagrees with the Vercel production domain — using "${fromVercel}". Delete or correct the env var.`,
  );
} else if (process.env.NEXT_PUBLIC_SITE_URL && !fromEnv) {
  console.warn(
    `[site-url] NEXT_PUBLIC_SITE_URL is malformed ("${process.env.NEXT_PUBLIC_SITE_URL}") — using "${SITE_URL}".`,
  );
}
