"use client";

import { useState, useTransition } from "react";
import { resendVerificationEmail } from "@/lib/actions/auth";

export default function EmailVerificationBanner({ email }: { email: string }) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onResend = () => {
    setError(null);
    startTransition(async () => {
      const r = await resendVerificationEmail();
      if (r.ok) setSent(true);
      else setError(r.error);
    });
  };

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      flexWrap: "wrap", gap: 12,
      background: "oklch(0.97 0.04 78)", border: "1px solid oklch(0.82 0.10 78)",
      borderRadius: 2, padding: "14px 20px", marginBottom: 24,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 15 }}>✉</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: "oklch(0.38 0.12 60)" }}>
            Please verify your email address
          </div>
          <div style={{ fontSize: 12, color: "oklch(0.50 0.08 60)", marginTop: 2 }}>
            We sent a confirmation link to <b>{email}</b>. Check your inbox.
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {error && <span style={{ fontSize: 12, color: "var(--err)" }}>{error}</span>}
        {sent ? (
          <span style={{ fontSize: 12, color: "oklch(0.42 0.14 145)", fontFamily: "var(--mono)" }}>✓ Sent</span>
        ) : (
          <button
            type="button"
            onClick={onResend}
            disabled={pending}
            style={{
              background: "oklch(0.38 0.12 60)", color: "white",
              border: "none", borderRadius: 2, padding: "7px 16px",
              fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase",
              cursor: "pointer", fontFamily: "var(--sans)", opacity: pending ? 0.6 : 1,
            }}
          >
            {pending ? "Sending…" : "Resend link"}
          </button>
        )}
      </div>
    </div>
  );
}
