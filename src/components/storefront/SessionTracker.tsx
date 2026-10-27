"use client";

import { useEffect, useState } from "react";
import { usePathname } from "@/i18n/routing";
import { track } from "@/lib/actions/track";
import { readConsent } from "./CookieConsent";

const KEY = "ssg-session-fired";

/**
 * Fires `session_start` once per browser session (sessionStorage)
 * and `page_view` on every route change. Mounted in the locale layout.
 *
 * Gated on the user's cookie-consent choice: if they have not consented
 * (or have explicitly declined), no events are sent. PDPO 2025 compliance.
 */
export default function SessionTracker() {
  const pathname = usePathname();
  const [consented, setConsented] = useState(false);

  // Re-check consent on mount and whenever the cookie banner saves a choice
  // (CookieConsent dispatches a synthetic StorageEvent when the user chooses).
  useEffect(() => {
    const update = () => setConsented(readConsent()?.choice === "accept");
    update();
    window.addEventListener("storage", update);
    return () => window.removeEventListener("storage", update);
  }, []);

  useEffect(() => {
    if (!consented) return;
    try {
      if (!sessionStorage.getItem(KEY)) {
        track({ type: "session_start", path: pathname }).catch(() => {});
        sessionStorage.setItem(KEY, "1");
      }
    } catch { /* private mode etc. */ }
    // session_start: fire once on first mount after consent
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consented]);

  useEffect(() => {
    if (!consented) return;
    track({ type: "page_view", path: pathname }).catch(() => {});
  }, [pathname, consented]);

  return null;
}
