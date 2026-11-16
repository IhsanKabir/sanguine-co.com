"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * The browser half of Cloudflare Turnstile (lib/turnstile.ts). Invisible: the check runs in
 * the background while the visitor fills the form. Usage:
 *   const bot = useTurnstile();
 *   ...<form>{bot.slot}...
 *   on submit: const turnstileToken = await bot.getToken(); send it; then bot.reset().
 * Without NEXT_PUBLIC_TURNSTILE_SITE_KEY it does nothing and getToken() returns null.
 */
type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window { turnstile?: TurnstileApi }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const WAIT_MS = 6000;   // how long a submit waits for a check still running
const POLL_MS = 100;

let loading: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { loading = null; reject(new Error("Turnstile did not load")); };
    document.head.appendChild(s);
  });
  return loading;
}

export function useTurnstile() {
  const box = useRef<HTMLDivElement>(null);
  const id = useRef<string | null>(null);
  const token = useRef<string | null>(null);

  useEffect(() => {
    if (!SITE_KEY) return;
    let gone = false;
    loadScript().then(() => {
      if (gone || !box.current || !window.turnstile) return;
      id.current = window.turnstile.render(box.current, {
        sitekey: SITE_KEY,
        callback: (t: string) => { token.current = t; },
        "expired-callback": () => { token.current = null; },
        "error-callback": () => { token.current = null; },
        "refresh-expired": "auto",
      });
    }).catch(() => { /* blocked or offline: the server's message offers WhatsApp */ });
    return () => {
      gone = true;
      if (id.current && window.turnstile) window.turnstile.remove(id.current);
      id.current = null;
    };
  }, []);

  /** The current token; waits briefly if the check is still running. */
  const getToken = useCallback(async (): Promise<string | null> => {
    if (!SITE_KEY) return null;
    for (let waited = 0; !token.current && waited < WAIT_MS; waited += POLL_MS) {
      await new Promise((r) => setTimeout(r, POLL_MS));
    }
    return token.current;
  }, []);

  /** A token works once: call after every send, so the next one gets a fresh check. */
  const reset = useCallback(() => {
    token.current = null;
    if (id.current && window.turnstile) window.turnstile.reset(id.current);
  }, []);

  return { slot: <div ref={box} aria-hidden="true" />, getToken, reset };
}
