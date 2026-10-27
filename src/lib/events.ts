"use server";

import { db, schema } from "@/lib/db";
import { headers, cookies } from "next/headers";
import { randomUUID } from "crypto";

export type EventType =
  | "session_start"
  | "page_view"
  | "product_view"
  | "search"
  | "add_to_cart"
  | "wishlist_toggle"
  | "checkout_start"
  | "order_placed"
  | "order_paid"
  | "admin_action";

const SESSION_COOKIE = "ssg_sid";
const SESSION_DAYS = 30;

/**
 * Get-or-create a server-side session id stored in an httpOnly cookie.
 * Used to stitch a single visitor's events together without leaking PII.
 */
async function getSessionId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(SESSION_COOKIE)?.value;
  if (existing && existing.length > 8) return existing;
  const fresh = randomUUID();
  // We can't write cookies from server actions during a query; we set it
  // best-effort via cookies().set() which is allowed in server actions
  // and route handlers but silently noops in Server Components.
  try {
    jar.set(SESSION_COOKIE, fresh, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_DAYS * 24 * 60 * 60,
      path: "/",
    });
  } catch { /* server component context: cookie set silently dropped */ }
  return fresh;
}

type TrackInput = {
  type: EventType;
  productId?: string;
  customerId?: string;
  payload?: Record<string, unknown>;
  /** Optional: passed when called from a request handler that already has the path. */
  path?: string;
};

/**
 * Track a behavior event. Server-side only. Fire-and-forget: never throws.
 * Failures are logged but do not block the calling action.
 */
export async function trackEvent(input: TrackInput): Promise<void> {
  try {
    const h = await headers();
    const sessionId = await getSessionId();
    await db.insert(schema.events).values({
      type: input.type,
      sessionId,
      customerId: input.customerId,
      productId: input.productId,
      payload: input.payload ?? {},
      ua: h.get("user-agent")?.slice(0, 400) ?? null,
      referrer: h.get("referer")?.slice(0, 400) ?? null,
      path: input.path ?? null,
      ip: (h.get("x-forwarded-for") || h.get("x-real-ip") || "").split(",")[0].trim() || null,
    });
  } catch (e) {
    console.warn("[events] failed:", e instanceof Error ? e.message : e);
  }
}
