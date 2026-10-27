/**
 * Sentry SDK init for the browser. Loaded before any other client code.
 * No-op if NEXT_PUBLIC_SENTRY_DSN is unset.
 *
 * Note: client DSN is NEXT_PUBLIC_-prefixed so it's available at build time
 * and shipped to the browser. This is intentional: the DSN is not a secret;
 * it identifies the project, not the auth.
 */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Browser performance + Core Web Vitals capture.
  tracesSampleRate: 0.2,         // 20%: keep cost low while still useful
  replaysSessionSampleRate: 0,   // No session replay by default: privacy first
  replaysOnErrorSampleRate: 1.0, // ...but if something errors, capture the replay

  beforeSend(event) {
    // Drop common noisy errors that aren't actionable.
    const msg = event.message ?? event.exception?.values?.[0]?.value ?? "";
    if (/ResizeObserver|Non-Error promise rejection captured|Loading chunk \d+ failed/i.test(msg)) {
      return null;
    }
    return event;
  },

  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "production",
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
