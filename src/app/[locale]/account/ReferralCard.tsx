"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

type Props = {
  code: string;
  locale: "en" | "bn";
};

export default function ReferralCard({ code }: Props) {
  const t = useTranslations();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setError(null);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(t("referral.copyError"));
    }
  };

  const bodyText = t("referral.body");

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
          {t("referral.kicker")}
        </div>
        <h2
          className="serif"
          style={{ fontSize: 28, color: "var(--purple-900)", fontWeight: 500, margin: 0 }}
        >
          {t("referral.title")}
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
            aria-label={t("referral.codeLabel")}
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
            {copied ? t("referral.copied") : t("referral.copy")}
          </button>
        </div>

        {error && (
          <p style={{ color: "var(--err)", fontSize: 12, margin: 0 }}>{error}</p>
        )}
      </div>
    </section>
  );
}
