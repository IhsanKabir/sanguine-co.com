import { headers } from "next/headers";
import { and, eq, gt, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { captureError } from "@/lib/monitoring";

/**
 * Spam guard for public forms that send an email to whatever address is
 * typed (preorder requests). The per-email limit in the action stops one
 * address being flooded; this adds a per-network limit so a script cannot
 * walk through many addresses, which would hurt the shop's sender reputation.
 *
 * Attempts are counted in `events` (it already stores the IP), so no new
 * table is needed. Mobile networks in Bangladesh put many customers behind
 * one address, so the limit is generous.
 */

const GUARD_EVENT_PREFIX = "form_attempt:";
export const FORM_ATTEMPTS_PER_HOUR = 20;
const WINDOW_MS = 60 * 60 * 1000;

export async function clientIp(): Promise<string | null> {
  const h = await headers();
  return (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || null;
}

/**
 * Record one attempt on `form` and say whether this network is over the
 * limit. Fails open: if the count cannot be read, the customer is let
 * through, because a lost sale costs more than a missed spam check.
 */
export async function isFormRateLimited(form: string, max: number = FORM_ATTEMPTS_PER_HOUR): Promise<boolean> {
  try {
    const ip = await clientIp();
    if (!ip) return false;
    const type = GUARD_EVENT_PREFIX + form;
    const [row] = await db.select({ n: sql<number>`count(*)::int` })
      .from(schema.events)
      .where(and(
        eq(schema.events.type, type),
        eq(schema.events.ip, ip),
        gt(schema.events.createdAt, new Date(Date.now() - WINDOW_MS)),
      ));
    if (Number(row?.n ?? 0) >= max) return true;
    await db.insert(schema.events).values({ type, ip });
    return false;
  } catch (e) {
    captureError(e, { where: "request-guard.isFormRateLimited", form });
    return false;
  }
}
