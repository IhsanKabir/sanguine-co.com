"use client";

import { useState, useTransition } from "react";
import { updateNotificationPrefs } from "@/lib/actions/profile";

type Props = {
  initialEmail: boolean;
  initialSms: boolean;
};

type Row = {
  key: "orderEmail" | "newArrivals" | "smsAlerts";
  label: string;
  description: string;
  alwaysOn?: boolean;
  controls?: "email" | "sms";
};

const ROWS: Row[] = [
  {
    key: "orderEmail",
    label: "Order updates by email",
    description: "Always receive dispatch and delivery confirmation",
    alwaysOn: true,
  },
  {
    key: "newArrivals",
    label: "New arrivals & seasonal notes",
    description: "Curated editorial drops and new collections",
    controls: "email",
  },
  {
    key: "smsAlerts",
    label: "SMS delivery alerts",
    description: "Courier dispatch and delivery ping",
    controls: "sms",
  },
];

export default function NotificationPrefs({ initialEmail, initialSms }: Props) {
  const [notifyEmail, setNotifyEmail] = useState(initialEmail);
  const [notifySms, setNotifySms] = useState(initialSms);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  const persist = (next: { notifyEmail: boolean; notifySms: boolean }) => {
    startTransition(async () => {
      try {
        const r = await updateNotificationPrefs(next);
        if (r.ok) {
          const t = Date.now();
          setSavedAt(t);
          setTimeout(() => {
            setSavedAt((curr) => (curr === t ? null : curr));
          }, 2000);
        }
      } catch {
        /* no-op */
      }
    });
  };

  const onToggleEmail = (checked: boolean) => {
    setNotifyEmail(checked);
    persist({ notifyEmail: checked, notifySms });
  };

  const onToggleSms = (checked: boolean) => {
    setNotifySms(checked);
    persist({ notifyEmail, notifySms: checked });
  };

  const showToast = savedAt !== null;

  return (
    <section
      style={{
        marginTop: 48,
        paddingTop: 40,
        borderTop: "1px solid var(--line)",
        position: "relative",
      }}
    >
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
          Communications
        </div>
        <h2
          className="serif"
          style={{ fontSize: 28, color: "var(--purple-900)", fontWeight: 500, margin: 0 }}
        >
          Notifications
        </h2>
      </div>

      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: 0,
          border: "1px solid var(--line)",
          borderRadius: 2,
        }}
      >
        {ROWS.map((row, idx) => {
          const isAlways = row.alwaysOn === true;
          const checked =
            isAlways
              ? true
              : row.controls === "email"
                ? notifyEmail
                : notifySms;
          const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            if (isAlways) return;
            if (row.controls === "email") onToggleEmail(e.target.checked);
            else onToggleSms(e.target.checked);
          };

          return (
            <li
              key={row.key}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 24,
                padding: "16px 18px",
                borderTop: idx === 0 ? "none" : "1px solid var(--line)",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--purple-900)",
                    fontFamily: "var(--sans)",
                    marginBottom: 2,
                  }}
                >
                  {row.label}
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>
                  {row.description}
                </div>
              </div>
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  cursor: isAlways ? "not-allowed" : "pointer",
                  opacity: isAlways ? 0.55 : 1,
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={isAlways || pending}
                  onChange={onChange}
                  style={{
                    accentColor: "var(--mauve)",
                    width: 18,
                    height: 18,
                    cursor: "inherit",
                  }}
                />
              </label>
            </li>
          );
        })}
      </ul>

      <div
        aria-live="polite"
        style={{
          position: "absolute",
          top: 40,
          right: 0,
          fontSize: 10,
          letterSpacing: ".18em",
          textTransform: "uppercase",
          fontFamily: "var(--mono)",
          color: "var(--gold-text)",
          background: "var(--cream)",
          padding: "6px 12px",
          border: "1px solid var(--line)",
          borderRadius: 2,
          opacity: showToast ? 1 : 0,
          transform: showToast ? "translateY(0)" : "translateY(-4px)",
          transition: "opacity 300ms ease, transform 300ms ease",
          pointerEvents: "none",
        }}
      >
        ✓ Saved
      </div>
    </section>
  );
}
