"use client";

import { useEffect, useState } from "react";
import { usePathname } from "@/i18n/routing";
import { track } from "@/lib/actions/track";
import { readConsent } from "./CookieConsent";

const KEY = "ssg-session-fired";
// Captured on landing, before consent, because visitors usually accept the
// banner a page or two later, when the utm tags are gone from the URL. It
// stays in this tab's sessionStorage and is only sent once they accept.
const SOURCE_KEY = "ssg-visit-source";

/**
 * Where this visit came from, read in the browser. The server can't do this:
 * `track` is a server action, so its Referer header is always our own page.
 * utm_* tags (added to links we share) win over the referring site.
 */
function visitSource(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    const q = new URLSearchParams(window.location.search);
    for (const k of ["utm_source", "utm_medium", "utm_campaign"]) {
      const v = q.get(k);
      if (v) out[k] = v.slice(0, 80).toLowerCase();
    }
    if (document.referrer) {
      const host = new URL(document.referrer).hostname.replace(/^(www|m|l|lm|web)\./, "");
      if (host && host !== window.location.hostname.replace(/^www\./, "")) out.ref_host = host.slice(0, 120);
    }
  } catch {
    /* malformed referrer or URL: record nothing */
  }
  return out;
}

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
    try {
      if (!sessionStorage.getItem(SOURCE_KEY)) sessionStorage.setItem(SOURCE_KEY, JSON.stringify(visitSource()));
    } catch { /* private mode etc. */ }
    const update = () => setConsented(readConsent()?.choice === "accept");
    update();
    window.addEventListener("storage", update);
    return () => window.removeEventListener("storage", update);
  }, []);

  useEffect(() => {
    if (!consented) return;
    try {
      if (!sessionStorage.getItem(KEY)) {
        let source: Record<string, string> = {};
        try { source = JSON.parse(sessionStorage.getItem(SOURCE_KEY) || "{}"); } catch { /* ignore */ }
        track({ type: "session_start", path: pathname, payload: source }).catch(() => {});
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
