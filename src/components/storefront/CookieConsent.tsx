"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import { CONSENT_KEY as KEY } from "@/lib/consent-key";

type Choice = { choice: "accept" | "decline"; at: number };

/**
 * Returns the user's consent choice, or null if they have not yet decided.
 * Other components (e.g. SessionTracker) gate analytics on this.
 */
export function readConsent(): Choice | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Choice;
  } catch {
    return null;
  }
}

export default function CookieConsent() {
  const locale = useLocale();
  const isBn = locale === "bn";
  // Rendered on the server so it is part of first paint (it used to appear
  // after hydration, late enough to hurt Speed Index). CONSENT_BOOT_SCRIPT
  // in the layout hides it via html.cc-done for visitors who already chose.
  const [dismissed, setDismissed] = useState(false);

  const persist = (choice: "accept" | "decline") => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ choice, at: Date.now() } satisfies Choice));
      // Notify other tabs / listeners (e.g. SessionTracker)
      window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
    } catch {}
    document.documentElement.classList.add("cc-done");
    setDismissed(true);
  };

  if (dismissed) return null;
  return (
    <div className="cookie-banner" role="dialog" aria-label={isBn ? "কুকি পছন্দ" : "Cookie preferences"}>
      <div className="cb-text">
        {isBn ? (
          <>আপনার ব্যাগ মনে রাখতে ও ভিজিট গুনতে আমরা কুকি ব্যবহার করি। কোনো বিজ্ঞাপন নেই। <Link href="/legal/privacy">গোপনীয়তা নীতি</Link></>
        ) : (
          <>We use cookies to keep your bag and count visits. No ads. <Link href="/legal/privacy">Privacy policy</Link></>
        )}
      </div>
      <div className="cb-actions">
        <button className="btn btn-ghost btn-sm" onClick={() => persist("decline")}>
          {isBn ? "কেবল প্রয়োজনীয়" : "Essential only"}
        </button>
        <button className="btn btn-primary btn-sm" onClick={() => persist("accept")}>
          {isBn ? "সব গ্রহণ" : "Accept all"}
        </button>
      </div>
    </div>
  );
}
