import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "cdn.sanity.io" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  experimental: {
    optimizePackageImports: ["next-intl"],
  },
  // The OG card route reads its bundled TTFs from disk at runtime; make sure
  // Vercel's file tracing packs them into the function even though they are
  // only referenced through a computed path.join().
  outputFileTracingIncludes: {
    "/api/og": ["./src/app/api/og/_fonts/*.ttf"],
  },
  // Order confirmation/tracking URLs carry ?t= access tokens — the referrer
  // policy keeps them from leaking to external destinations a customer might
  // click through to (couriers, WhatsApp web, etc.).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

// Sentry build-time options. Source maps are uploaded only when both
// SENTRY_AUTH_TOKEN and the org/project vars are set; otherwise this is a no-op
// at build time and Sentry runtime is disabled by the missing DSN.
const sentryBuildOptions = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: false,
};

// One-line build-time signal so we can confirm in Vercel logs whether source
// maps are being uploaded. Silent failure here was costing us symbolicated
// stack traces — explicit log makes the misconfiguration visible.
if (process.env.NODE_ENV !== "test") {
  const hasToken = Boolean(process.env.SENTRY_AUTH_TOKEN);
  const hasOrg = Boolean(process.env.SENTRY_ORG);
  const hasProject = Boolean(process.env.SENTRY_PROJECT);
  if (hasToken && hasOrg && hasProject) {
    console.log(`[sentry] Source maps will be uploaded for ${process.env.SENTRY_ORG}/${process.env.SENTRY_PROJECT}.`);
  } else {
    console.log(
      `[sentry] Source maps skipped — missing: ${[
        !hasToken && "SENTRY_AUTH_TOKEN",
        !hasOrg && "SENTRY_ORG",
        !hasProject && "SENTRY_PROJECT",
      ].filter(Boolean).join(", ")}.`,
    );
  }
}

export default withSentryConfig(withNextIntl(nextConfig), sentryBuildOptions);
