import { db, schema } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth-utils";
import { captureError } from "@/lib/monitoring";

export type OrderEventType =
  | "created"
  | "status_changed"
  | "courier_booked"
  | "refund_issued"
  | "note_added"
  | "email_sent"
  | "sms_sent"
  | "payment_received"
  | "courier_status";   // a new status reported by the courier sync (payload: courier, status, outcome)

/**
 * Log a material event against an order. Append-only — never throws on a
 * write failure (event-log gaps are recoverable; a crashed user action is not).
 *
 * Snapshots the actor's email at write time so the timeline still shows
 * "by alice@…" even if the admin user is later deleted.
 */
export async function logOrderEvent(input: {
  orderId: string;
  type: OrderEventType;
  payload?: Record<string, unknown>;
  /** If omitted, attempts to read the current Supabase Auth session. Pass null for system events. */
  actor?: { id: string; email?: string | null } | null;
}): Promise<void> {
  try {
    let actor = input.actor;
    if (actor === undefined) {
      const u = await getCurrentUser().catch(() => null);
      actor = u ? { id: u.id, email: u.email } : null;
    }
    await db.insert(schema.orderEvents).values({
      orderId: input.orderId,
      type: input.type,
      payload: input.payload ?? {},
      actorId: actor?.id ?? null,
      actorEmail: actor?.email ?? null,
    });
  } catch (e) {
    captureError(e, { where: "logOrderEvent", orderId: input.orderId, type: input.type });
  }
}

/** Fetch the timeline for an order, newest first. */
export async function listOrderEvents(orderId: string) {
  return db.select().from(schema.orderEvents)
    .where(eq(schema.orderEvents.orderId, orderId))
    .orderBy(desc(schema.orderEvents.createdAt));
}
