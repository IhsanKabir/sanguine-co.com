import { db, schema } from "@/lib/db";
import { sendEmail } from "@/lib/email/brevo";
import { sendSms } from "@/lib/sms/ssl-wireless";
import { captureError } from "@/lib/monitoring";

/**
 * Alerts to the shop owner: a new order or a new preorder request must never
 * sit unseen, because flower prices are quoted by hand and the reply time is
 * the product.
 *
 * Two channels, both best effort:
 *   - email to OWNER_ALERT_EMAIL (falls back to PREORDER_ADMIN_EMAIL, then
 *     BREVO_FROM_EMAIL, which forwards to the owner's inbox)
 *   - SMS to OWNER_ALERT_PHONE, when set
 *
 * Every attempt is written to `events` as type "owner_alert", so Admin →
 * Health can show when alerts stop arriving.
 */

export type OwnerAlertKind = "order" | "preorder";

export type OwnerAlert = {
  kind: OwnerAlertKind;
  subject: string;
  html: string;
  /** One short line; kept under one SMS segment by the callers. */
  sms: string;
};

export const OWNER_ALERT_EVENT = "owner_alert";

export function ownerAlertEmail(): string | null {
  return process.env.OWNER_ALERT_EMAIL?.trim()
    || process.env.PREORDER_ADMIN_EMAIL?.trim()
    || process.env.BREVO_FROM_EMAIL?.trim()
    || null;
}

export function ownerAlertPhone(): string | null {
  return process.env.OWNER_ALERT_PHONE?.trim() || null;
}

// A single GSM SMS segment is 160 characters; names are clipped to stay in it.
const SMS_NAME_MAX = 24;
const clip = (s: string, max: number) => (s.length > max ? s.slice(0, max - 1) + "." : s);

export function preorderAlertSms(what: string, customerName: string, customerPhone: string | null): string {
  const who = [clip(customerName, SMS_NAME_MAX), customerPhone].filter(Boolean).join(" ");
  return `Sanguine: new request for ${clip(what, 40)} from ${who}. Send the price now: Admin > Pre-orders.`;
}

export function orderAlertSms(number: string, total: string, customerName: string, customerPhone: string | null): string {
  const who = [clip(customerName, SMS_NAME_MAX), customerPhone].filter(Boolean).join(" ");
  return `Sanguine: new order ${number}, ${total}, from ${who}. See Admin > Orders.`;
}

type Channel = "email" | "sms";

async function recordAttempt(kind: OwnerAlertKind, channel: Channel, ok: boolean, error: string | null): Promise<void> {
  try {
    await db.insert(schema.events).values({
      type: OWNER_ALERT_EVENT,
      payload: { kind, channel, ok, error },
    });
  } catch (e) {
    captureError(e, { where: "owner-alert.recordAttempt", kind, channel });
  }
}

/** Send the alert on every configured channel. Never throws. */
export async function sendOwnerAlert(alert: OwnerAlert): Promise<void> {
  const email = ownerAlertEmail();
  const phone = ownerAlertPhone();

  if (!email && !phone) {
    await recordAttempt(alert.kind, "email", false, "no-recipient-configured");
    return;
  }

  const tasks: Promise<void>[] = [];
  if (email) {
    tasks.push(
      sendEmail({ to: email, subject: alert.subject, html: alert.html })
        .then((r) => recordAttempt(alert.kind, "email", r.ok, r.error ?? null)),
    );
  }
  if (phone) {
    tasks.push(
      sendSms(phone, alert.sms)
        .then((r) => recordAttempt(alert.kind, "sms", r.ok, r.error ?? null)),
    );
  }
  const results = await Promise.allSettled(tasks);
  for (const r of results) {
    if (r.status === "rejected") captureError(r.reason, { where: "owner-alert.sendOwnerAlert", kind: alert.kind });
  }
}
