"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

export default function AccountError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations();
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
        {t("accountError.kicker")}
      </div>
      <h1 className="serif" style={{ fontSize: 28, color: "var(--purple-900)", fontWeight: 500, margin: 0 }}>
        {t("accountError.title")}
      </h1>
      <p style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.7, margin: 0 }}>
        {t("accountError.body")}
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
          {t("accountError.retry")}
        </button>
        <Link href="/" className="btn btn-ghost btn-sm">
          {t("accountError.backToShop")}
        </Link>
      </div>
    </div>
  );
}
