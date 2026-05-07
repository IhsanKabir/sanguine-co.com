"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AccountError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[account] page error:", error.message, error.digest);
  }, [error]);

  return (
    <div style={{
      maxWidth: 560, margin: "80px auto", padding: "0 32px",
      display: "flex", flexDirection: "column", gap: 20,
    }}>
      <div style={{
        fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase",
        fontFamily: "var(--mono)", color: "var(--gold-text)",
      }}>
        Account
      </div>
      <h1 className="serif" style={{ fontSize: 28, color: "var(--purple-900)", fontWeight: 500, margin: 0 }}>
        Something went wrong
      </h1>
      <p style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.7, margin: 0 }}>
        We could not load your account right now. This is usually a temporary issue.
        {error.digest && (
          <span style={{ display: "block", fontFamily: "var(--mono)", fontSize: 11, marginTop: 8, color: "var(--line)" }}>
            ref: {error.digest}
          </span>
        )}
      </p>
      <div style={{ display: "flex", gap: 12 }}>
        <button
          onClick={reset}
          className="btn btn-primary btn-sm"
        >
          Try again
        </button>
        <Link href="/" className="btn btn-ghost btn-sm">
          Back to shop
        </Link>
      </div>
    </div>
  );
}
