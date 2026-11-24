/**
 * Meta (Facebook) Pixel: tells Meta when an ad visitor looks around and when
 * they send a pre-order, so ads can be judged by real orders and shown again
 * to people who visited. Loaded only after the visitor taps "Accept all" on
 * the cookie banner (see MetaPixel.tsx), and only when an ID is configured.
 */

type FbqArgs = [command: "init" | "track" | "consent", ...rest: unknown[]];
type Fbq = ((...args: FbqArgs) => void) & { queue?: unknown[]; loaded?: boolean };

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

/** A pixel ID is a run of digits; anything else in the setting is ignored. */
export function metaPixelId(raw: string | undefined = process.env.NEXT_PUBLIC_META_PIXEL_ID): string | null {
  const id = raw?.trim();
  return id && /^\d{6,20}$/.test(id) ? id : null;
}

/** Standard events this site sends. */
export type PixelEvent = "PageView" | "Lead";

export interface LeadDetails {
  /** What was asked for: a product name, or the bespoke segment. */
  contentName: string;
  contentCategory: "product" | "bespoke";
}

/** Sends an event if the pixel is loaded (consent given); otherwise does nothing. */
export function trackPixel(event: PixelEvent, details?: LeadDetails): void {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  try {
    if (details) {
      window.fbq("track", event, { content_name: details.contentName, content_category: details.contentCategory });
    } else {
      window.fbq("track", event);
    }
  } catch {
    /* a blocked or broken pixel must never break the page */
  }
}

/** Meta's loader, as published, written as a function so no inline script is needed. */
export function loadMetaPixel(id: string): void {
  if (typeof window === "undefined" || window.fbq) return;
  const queue: unknown[] = [];
  const fbq = ((...args: unknown[]) => {
    const self = fbq as Fbq & { callMethod?: (...a: unknown[]) => void };
    if (self.callMethod) self.callMethod(...args);
    else queue.push(args);
  }) as Fbq & { push?: Fbq; version?: string };
  fbq.queue = queue;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  window.fbq = fbq;
  window._fbq = fbq;
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);
  fbq("init", id);
}
