import { createHash, randomInt, timingSafeEqual } from "crypto";
import { and, eq, gt, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { isSmsConfigured, normalisePhone, sendSms } from "@/lib/sms/ssl-wireless";
import type { CommerceSettings } from "@/lib/commerce";

/**
 * One-time SMS code before a cash-on-delivery order (step D).
 *
 * Refused COD parcels cost a courier fee each way; a code proves the
 * number belongs to whoever is ordering. Rules:
 *  - required for COD orders whose total is at least the Admin → Settings
 *    minimum, when the check is switched on AND SMS is configured;
 *  - 6 digits, valid 10 minutes, 5 wrong tries per code;
 *  - at most 3 codes per phone per 15 minutes and 10 per IP per hour;
 *  - if the SMS can't be sent, the checkout goes through unverified and
 *    the order's timeline says so — a gateway outage must not stop sales.
 */

export const CODE_TTL_MIN = 10;
export const MAX_ATTEMPTS = 5;
const PHONE_SENDS_PER_15_MIN = 3;
const IP_SENDS_PER_HOUR = 10;

const hashCode = (id: string, code: string) => createHash("sha256").update(`${id}:${code}`).digest("hex");

/** Does this COD order need a code? */
export function phoneCheckRequired(settings: CommerceSettings, totalBdt: number): boolean {
  return settings.codPhoneCheck && totalBdt >= settings.codPhoneCheckMinBdt && isSmsConfigured();
}

export type SendResult =
  | { ok: true; id: string; sent: true; last4: string }
  | { ok: true; id: string; sent: false }                 // SMS failed: checkout continues unverified
  | { ok: false; error: string };

export async function sendPhoneCode(rawPhone: string, locale: "en" | "bn", ip: string | null): Promise<SendResult> {
  const phone = normalisePhone(rawPhone);
  if (!phone) return { ok: false, error: "Enter a valid Bangladeshi mobile number (01XXXXXXXXX)." };

  const [{ byPhone }] = await db.select({ byPhone: sql<number>`count(*)::int` })
    .from(schema.phoneVerifications)
    .where(and(eq(schema.phoneVerifications.phone, phone),
      gt(schema.phoneVerifications.createdAt, new Date(Date.now() - 15 * 60_000))));
  if (byPhone >= PHONE_SENDS_PER_15_MIN) {
    return { ok: false, error: "Too many codes sent to this number. Please wait 15 minutes and try again." };
  }
  if (ip) {
    const [{ byIp }] = await db.select({ byIp: sql<number>`count(*)::int` })
      .from(schema.phoneVerifications)
      .where(and(eq(schema.phoneVerifications.ip, ip),
        gt(schema.phoneVerifications.createdAt, new Date(Date.now() - 60 * 60_000))));
    if (byIp >= IP_SENDS_PER_HOUR) {
      return { ok: false, error: "Too many codes requested. Please try again in an hour." };
    }
  }

  const code = String(randomInt(100000, 1000000));
  const [row] = await db.insert(schema.phoneVerifications).values({
    phone,
    codeHash: "pending",
    ip,
    expiresAt: new Date(Date.now() + CODE_TTL_MIN * 60_000),
  }).returning({ id: schema.phoneVerifications.id });
  await db.update(schema.phoneVerifications).set({ codeHash: hashCode(row.id, code) })
    .where(eq(schema.phoneVerifications.id, row.id));

  const text = locale === "bn"
    ? `সাঙ্গুইন: আপনার অর্ডার কোড ${code}। ${CODE_TTL_MIN} মিনিটের মধ্যে ব্যবহার করুন।`
    : `Sanguine: your order code is ${code}. It expires in ${CODE_TTL_MIN} minutes.`;
  const sent = await sendSms(phone, text);
  if (!sent.ok) {
    await db.update(schema.phoneVerifications).set({ status: "send_failed" })
      .where(eq(schema.phoneVerifications.id, row.id));
    return { ok: true, id: row.id, sent: false };
  }
  return { ok: true, id: row.id, sent: true, last4: phone.slice(-4) };
}

export type CheckResult =
  | { ok: true; verified: boolean; reason?: string }       // verified=false only when the SMS failed
  | { ok: false; error: string; retry: boolean };          // retry=false: a new code is needed

/**
 * Check the code a checkout submitted. A correct code marks the row verified
 * and stays valid until it expires, so a checkout that fails for another
 * reason (stock, coupon) can be resubmitted without a new code.
 */
export async function checkPhoneCode(id: string | null | undefined, code: string | null | undefined, rawPhone: string): Promise<CheckResult> {
  if (!id) return { ok: false, error: "Please confirm your phone number with the code we send.", retry: false };
  const phone = normalisePhone(rawPhone);
  const [row] = await db.select().from(schema.phoneVerifications)
    .where(eq(schema.phoneVerifications.id, id)).limit(1);
  if (!row || !phone || row.phone !== phone) {
    return { ok: false, error: "That code was sent to a different number. Please request a new code.", retry: false };
  }
  if (row.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "That code has expired. Please request a new one.", retry: false };
  }
  if (row.status === "send_failed") return { ok: true, verified: false, reason: "SMS could not be sent" };
  if (row.verifiedAt) return { ok: true, verified: true };
  // Take one attempt BEFORE comparing, conditionally, so guesses fired in
  // parallel can't each read "attempts < 5" and slip past the limit.
  const [taken] = await db.update(schema.phoneVerifications)
    .set({ attempts: sql`${schema.phoneVerifications.attempts} + 1` })
    .where(and(eq(schema.phoneVerifications.id, row.id), sql`${schema.phoneVerifications.attempts} < ${MAX_ATTEMPTS}`))
    .returning({ attempts: schema.phoneVerifications.attempts });
  if (!taken) return { ok: false, error: "Too many wrong tries. Please request a new code.", retry: false };

  const given = Buffer.from(hashCode(row.id, (code ?? "").trim()));
  const want = Buffer.from(row.codeHash);
  if (given.length !== want.length || !timingSafeEqual(given, want)) {
    const left = MAX_ATTEMPTS - taken.attempts;
    return left > 0
      ? { ok: false, error: `That code is not right. ${left} ${left === 1 ? "try" : "tries"} left.`, retry: true }
      : { ok: false, error: "Too many wrong tries. Please request a new code.", retry: false };
  }

  await db.update(schema.phoneVerifications).set({ verifiedAt: new Date() })
    .where(eq(schema.phoneVerifications.id, row.id));
  return { ok: true, verified: true };
}
