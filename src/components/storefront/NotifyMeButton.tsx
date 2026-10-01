"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { subscribeBackInStock } from "@/lib/actions/stock-notify";

type Props = {
  productId: string;
  productName: string;
  defaultEmail?: string;
};

export default function NotifyMeButton({ productId, productName, defaultEmail = "" }: Props) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(defaultEmail);
  const [done, setDone] = useState<null | "subscribed" | "already">(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const result = await subscribeBackInStock({ productId, email: email.trim() });
        if (result.ok) setDone(result.alreadyRegistered ? "already" : "subscribed");
        else setError(t("notify.error"));
      } catch {
        setError(t("notify.error"));
      }
    });
  };

  return (
    <div style={{ marginTop: 14 }}>
      {!open && !done && (
        <button
          type="button"
          className="btn btn-ghost btn-block"
          onClick={() => setOpen(true)}
          style={{ borderColor: "var(--purple-900)", color: "var(--purple-900)" }}
        >
          {t.rich("notify.cta", { name: productName, i: (chunks) => <i style={{ fontSize: 13 }}>{chunks}</i> })}
        </button>
      )}

      {open && !done && (
        <form onSubmit={onSubmit} style={{ padding: 14, background: "#fcfaf6", border: "1px solid var(--line)" }}>
          <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "0 0 10px", lineHeight: 1.6 }}>
            {t("notify.intro")}
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("common.emailPlaceholder")}
              autoComplete="email"
              style={{ flex: 1, padding: "10px 12px", border: "1px solid var(--line)", fontSize: 13 }}
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
              {pending ? t("notify.saving") : t("notify.submit")}
            </button>
          </div>
          {error && <p style={{ color: "var(--err)", fontSize: 12, marginTop: 8 }}>{error}</p>}
        </form>
      )}

      {done && (
        <div style={{ padding: 14, background: "#eef7ee", border: "1px solid #4caf50", fontSize: 13, color: "#2e4f33" }}>
          {done === "subscribed"
            ? t.rich("notify.subscribed", { email, b: (chunks) => <b>{chunks}</b> })
            : t("notify.already")}
        </div>
      )}
    </div>
  );
}
