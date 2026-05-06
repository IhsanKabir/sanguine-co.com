"use client";

import { useState } from "react";

type Props = {
  code: string;
  locale: "en" | "bn";
};

export default function ReferralCard({ code, locale }: Props) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setError(null);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy to clipboard.");
    }
  };

  const bodyText =
    locale === "bn"
      ? "Give a friend ৳500 off their first order. When they place an order using your code, you receive ৳500 credit on your next purchase."
      : "Give a friend ৳500 off their first order. When they place an order using your code, you receive ৳500 credit on your next purchase.";

  return (
    <section style={{ marginTop: 48, paddingTop: 40, borderTop: "1px solid var(--line)" }}>
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 10,
            letterSpacing: ".18em",
            color: "var(--gold-text)",
            textTransform: "uppercase",
            fontFamily: "var(--mono)",
            marginBottom: 4,
          }}
        >
          Refer &amp; Earn
        </div>
        <h2
          className="serif"
          style={{ fontSize: 28, color: "var(--purple-900)", fontWeight: 500, margin: 0 }}
        >
          Share the Maison
        </h2>
      </div>

      <div
        style={{
          background: "var(--cream)",
          border: "1px solid var(--line)",
          padding: 28,
          borderRadius: 2,
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        <p
          style={{
            fontSize: 13,
            color: "var(--ink-soft)",
            margin: 0,
            lineHeight: 1.6,
            maxWidth: 560,
          }}
        >
          {bodyText}
        </p>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            aria-label="Your referral code"
            style={{
              fontFamily: "var(--mono)",
              fontSize: 22,
              color: "var(--purple-900)",
              border: "1px solid var(--line)",
              padding: "12px 20px",
              background: "white",
              letterSpacing: ".2em",
              borderRadius: 2,
              userSelect: "all",
            }}
          >
            {code}
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onCopy}
            aria-live="polite"
            style={{ minWidth: 130 }}
          >
            {copied ? "✓ Copied!" : "Copy code"}
          </button>
        </div>

        {error && (
          <p style={{ color: "var(--err)", fontSize: 12, margin: 0 }}>{error}</p>
        )}
      </div>
    </section>
  );
}
