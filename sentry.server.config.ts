/**
 * Sentry SDK initialisation for the Node.js runtime (server components,
 * server actions, route handlers running in Vercel Functions).
 *
 * If SENTRY_DSN is unset, Sentry initialises as a no-op: safe to ship before
 * the Sentry project exists. Add SENTRY_DSN to Vercel env vars to activate.
 */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: !!process.env.SENTRY_DSN,

  // Conservative sample rates: luxury maison traffic is low; 100% is fine
  // and gives us full visibility on the rare error.
  tracesSampleRate: 1.0,

  // Don't send PII automatically; we handle that explicitly in error boundaries.
  sendDefaultPii: false,

  // Drop known noise: Drizzle/Supabase connection blips during cold start.
  beforeSend(event) {
    const msg = event.message ?? event.exception?.values?.[0]?.value ?? "";
    if (/EMAXCONNSESSION|prepared statement|connection terminated/i.test(msg)) return null;
    return event;
  },

  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
  release: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12),
});
