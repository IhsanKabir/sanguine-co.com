"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Last-resort error screen: shown when the root layout itself fails, so it
 * cannot use the site's fonts, translations or styles. Reports the error to
 * Sentry, which otherwise never sees React rendering errors.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#f5eee4", color: "#1e1a1d", fontFamily: "Georgia, serif", textAlign: "center", padding: 24 }}>
        <main>
          <p style={{ fontStyle: "italic", fontSize: 32, color: "#3d1250", margin: "0 0 16px" }}>Sanguine</p>
          <h1 style={{ fontSize: 22, fontWeight: 400, margin: "0 0 8px" }}>Something went wrong.</h1>
          <p style={{ fontSize: 15, margin: "0 0 24px" }}>Please try again. If it keeps happening, write to concierge@sanguine-co.com.</p>
          <button
            type="button"
            onClick={reset}
            style={{ background: "#3d1250", color: "#f5eee4", border: "none", padding: "12px 22px", fontSize: 14, cursor: "pointer" }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
