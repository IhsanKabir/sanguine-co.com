"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "ssg-announcement-dismissed-v1";

type Props = {
  text: string;
  tone: "neutral" | "celebration";
  dismissible: boolean;
  /** Content signature — dismissals are stored per-signature so a new or
   *  edited announcement resurfaces for visitors who dismissed an old one. */
  signature: string;
  /** ISO bounds, re-checked client-side (see visibility note below). */
  startAt: string | null;
  endAt: string | null;
  /** Server's verdict at render time — the no-JS / pre-hydration state. */
  serverActive: boolean;
};

/**
 * Scheduled announcement bar (EXECUTION-PLAN 4.3).
 *
 * Visibility is decided twice: the server bakes its verdict into the SSG
 * HTML (`serverActive`), and this component re-evaluates the window + the
 * visitor's dismissal on mount. The re-check exists because storefront pages
 * are statically generated — a page built before a scheduled window opens
 * would otherwise show stale state until the next revalidation. For the
 * common always-on announcement the server verdict is already correct, so
 * there is no flash.
 */
export default function AnnouncementBar({
  text,
  tone,
  dismissible,
  signature,
  startAt,
  endAt,
  serverActive,
}: Props) {
  // Two-phase visibility avoids the React 19 hydration pitfall of seeding
  // useState from a server prop and correcting it in an effect: until the
  // effect runs we render exactly the server verdict (no flash, markup
  // matches the SSG HTML); after it runs, the client's own window +
  // dismissal evaluation is authoritative.
  const [clientVerdict, setClientVerdict] = useState<boolean | null>(null);

  useEffect(() => {
    const now = new Date();
    const inWindow =
      (!startAt || now >= new Date(startAt)) && (!endAt || now <= new Date(endAt));
    let dismissed = false;
    try {
      dismissed = dismissible && localStorage.getItem(DISMISS_KEY) === signature;
    } catch {
      // Storage unavailable (private mode) — treat as not dismissed.
    }
    setClientVerdict(inWindow && !dismissed);
  }, [startAt, endAt, dismissible, signature]);

  const visible = clientVerdict ?? serverActive;
  if (!visible) return null;

  const dismiss = () => {
    setClientVerdict(false);
    try {
      localStorage.setItem(DISMISS_KEY, signature);
    } catch {
      // Best effort — without storage the bar simply reappears next visit.
    }
  };

  return (
    <div
      className={`topbar${tone === "celebration" ? " topbar--celebration" : ""}`}
      role="status"
    >
      <span>{text}</span>
      {dismissible && (
        <button
          type="button"
          className="topbar-dismiss"
          aria-label="Dismiss announcement"
          onClick={dismiss}
          onKeyDown={(e) => {
            // Escape on the focused control mirrors the plan's a11y spec; a
            // document-level listener would hijack Escape from dialogs.
            if (e.key === "Escape") dismiss();
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}
