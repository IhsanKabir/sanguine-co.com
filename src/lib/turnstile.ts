import { clientIp } from "@/lib/request-guard";
import { captureError } from "@/lib/monitoring";

/**
 * Cloudflare Turnstile (invisible): proves a form came from a person, with no puzzle and no
 * extra step. The browser half is components/storefront/useTurnstile.tsx.
 *
 * Rules (owner: never a step for real customers, never stop a sale):
 *  - no keys set: every form works as before;
 *  - a missing or failed token: refused, with a WhatsApp way out in the message;
 *  - Cloudflare unreachable: let through and logged, so an outage there never blocks orders.
 */
const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const VERIFY_TIMEOUT_MS = 5000;

export const BOT_CHECK_ERROR = "We could not confirm this came from a person. Please wait a moment and send it again, or message us on WhatsApp.";

export function isTurnstileOn(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
}

export async function passesTurnstile(token: string | null | undefined, form: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret || !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) return true;
  if (!token) return false;
  try {
    const ip = await clientIp();
    const body = new URLSearchParams({ secret, response: token, ...(ip ? { remoteip: ip } : {}) });
    const res = await fetch(VERIFY_URL, { method: "POST", body, signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS) });
    if (!res.ok) throw new Error(`siteverify returned ${res.status}`);
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (err) {
    captureError(err, { where: "turnstile.verify", form });
    return true;
  }
}
