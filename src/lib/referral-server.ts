import { randomInt } from "crypto";
import { and, asc, eq, ne, inArray, sql } from "drizzle-orm";
import { db, schema } from "./db";
import { normalizeBdWhatsApp } from "./utils";
import { REFERRAL_BDT, REFERRAL_MIN_ORDER_BDT, normalizeReferralCode } from "./referral";

/**
 * The server half of the referral rules in referral.ts. Codes and credits belong to an
 * email address (0026): guests get a code in their order confirmation, and a credit comes
 * off the next quote for that email without anyone signing in.
 */

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Db = typeof db | Tx;

const lower = (email: string) => email.trim().toLowerCase();
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";   // no I, O, 0 or 1: easy to read out
const CODE_TRIES = 5;

/** This email's code, made the first time it is asked for. `preferred` keeps an account's existing code. */
export async function codeForEmail(email: string, preferred?: string | null): Promise<string> {
  const e = lower(email);
  const find = async () => (await db.select({ code: schema.referralCodes.code }).from(schema.referralCodes)
    .where(sql`lower(${schema.referralCodes.email}) = ${e}`).limit(1))[0]?.code;
  const existing = await find();
  if (existing) return existing;
  const candidates = [normalizeReferralCode(preferred)].filter((c): c is string => Boolean(c));
  for (let i = 0; i < CODE_TRIES; i++) {
    candidates.push("SSG-" + Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join(""));
  }
  for (const code of candidates) {
    await db.insert(schema.referralCodes).values({ code, email: e }).onConflictDoNothing();
    const mine = await find();   // ours, or one made a moment ago by a parallel request
    if (mine) return mine;
  }
  throw new Error("Could not make a referral code.");
}

/** The email a code belongs to; null when unknown. */
async function referrerFor(code: string, q: Db = db): Promise<string | null> {
  const [row] = await q.select({ email: schema.referralCodes.email }).from(schema.referralCodes)
    .where(eq(schema.referralCodes.code, code)).limit(1);
  return row ? lower(row.email) : null;
}

/** Whether this email, account or phone has ordered before (test and cancelled orders do not count). */
async function hasOrderedBefore(who: { email: string; customerId: string | null; phone: string | null }): Promise<boolean> {
  const email = lower(who.email);
  const phone = normalizeBdWhatsApp(who.phone ?? "").slice(-10);
  const sameBuyer = sql.join([
    sql`lower(${schema.orders.guestEmail}) = ${email}`,
    who.customerId ? sql`${schema.orders.customerId} = ${who.customerId}` : null,
    phone.length === 10 ? sql`right(regexp_replace(coalesce(${schema.orders.guestPhone}, ''), '\\D', '', 'g'), 10) = ${phone}` : null,
  ].filter((x): x is NonNullable<typeof x> => x !== null), sql` or `);
  const [order] = await db.select({ id: schema.orders.id }).from(schema.orders)
    .where(and(sql`(${sameBuyer})`, eq(schema.orders.isTest, false), ne(schema.orders.status, "cancelled"))).limit(1);
  if (order) return true;
  const [referred] = await db.select({ id: schema.referralCredits.id }).from(schema.referralCredits)
    .where(sql`lower(${schema.referralCredits.referredEmail}) = ${email}`).limit(1);
  return Boolean(referred);
}

export type ReferralCheck = { ok: true; code: string | null } | { ok: false; error: string };

/** For the pre-order form: an empty code is fine; a code must be real, someone else's, and for a first order. */
export async function checkReferralCode(raw: string | null | undefined, who: { email: string; customerId: string | null; phone: string | null }): Promise<ReferralCheck> {
  if (!raw?.trim()) return { ok: true, code: null };
  const code = normalizeReferralCode(raw);
  const referrer = code ? await referrerFor(code) : null;
  if (!code || !referrer) return { ok: false, error: "We could not find that referral code. Please check it, or leave it empty." };
  if (referrer === lower(who.email)) return { ok: false, error: "That is your own referral code: share it with friends instead." };
  if (await hasOrderedBefore(who)) return { ok: false, error: "Referral codes are for a first order. Please leave the code empty." };
  return { ok: true, code };
}

/**
 * The referral discount for a quote: a friend's code on a first order, otherwise the oldest
 * credit this email has earned that no other open quote is holding. Nothing under the minimum.
 */
export async function referralDiscountForQuote(req: {
  id: string; customerEmail: string; referralCode: string | null;
}, goodsBdt: number): Promise<{ discountBdt: number; creditId: string | null }> {
  const none = { discountBdt: 0, creditId: null };
  if (goodsBdt < REFERRAL_MIN_ORDER_BDT) return none;
  const email = lower(req.customerEmail);
  if (req.referralCode) {
    // One discounted order per friend: not if they were credited already, nor if another
    // of their requests holds (or used) a friend's-code discount.
    const [credited] = await db.select({ id: schema.referralCredits.id }).from(schema.referralCredits)
      .where(sql`lower(${schema.referralCredits.referredEmail}) = ${email}`).limit(1);
    const [other] = await db.select({ id: schema.preorderRequests.id }).from(schema.preorderRequests)
      .where(and(
        sql`lower(${schema.preorderRequests.customerEmail}) = ${email}`,
        sql`${schema.preorderRequests.referralDiscountBdt} > 0`,
        sql`${schema.preorderRequests.referralCreditId} is null`,
        inArray(schema.preorderRequests.status, ["quoted", "confirmed", "converted"]),
        ne(schema.preorderRequests.id, req.id),
      )).limit(1);
    return credited || other ? none : { discountBdt: REFERRAL_BDT, creditId: null };
  }
  const credits = await db.select({ id: schema.referralCredits.id, amountBdt: schema.referralCredits.amountBdt })
    .from(schema.referralCredits)
    .where(and(sql`lower(${schema.referralCredits.referrerEmail}) = ${email}`, eq(schema.referralCredits.status, "earned")))
    .orderBy(asc(schema.referralCredits.createdAt));
  if (credits.length === 0) return none;
  const held = await db.select({ creditId: schema.preorderRequests.referralCreditId }).from(schema.preorderRequests)
    .where(and(
      inArray(schema.preorderRequests.referralCreditId, credits.map((c) => c.id)),
      inArray(schema.preorderRequests.status, ["quoted", "confirmed"]),
      ne(schema.preorderRequests.id, req.id),
    ));
  const free = credits.find((c) => !held.some((h) => h.creditId === c.id));
  return free ? { discountBdt: Math.min(free.amountBdt, goodsBdt), creditId: free.id } : none;
}

/**
 * At conversion, inside its transaction: the customer's own credit becomes used (throws if it
 * was spent meanwhile, so the order is never made at a price that no longer holds), and a
 * friend's code records the referrer's reward, pending until this order is delivered.
 */
export async function settleReferralAtConversion(tx: Tx, req: {
  id: string; customerEmail: string; referralCode: string | null; referralCreditId: string | null; referralDiscountBdt: number | null;
}, orderId: string): Promise<void> {
  if (!req.referralDiscountBdt) return;
  if (req.referralCreditId) {
    const used = await tx.update(schema.referralCredits)
      .set({ status: "used", usedOrderId: orderId, updatedAt: new Date() })
      .where(and(eq(schema.referralCredits.id, req.referralCreditId), eq(schema.referralCredits.status, "earned")))
      .returning({ id: schema.referralCredits.id });
    if (used.length === 0) throw new Error("REFERRAL_CREDIT_GONE");
    return;
  }
  const referrer = req.referralCode ? await referrerFor(req.referralCode, tx) : null;
  if (!referrer) return;
  const made = await tx.insert(schema.referralCredits).values({
    referrerEmail: referrer,
    referredEmail: lower(req.customerEmail),
    preorderId: req.id,
    orderId,
    amountBdt: REFERRAL_BDT,
  }).onConflictDoNothing().returning({ id: schema.referralCredits.id });
  // This friend was referred already: the discount on this quote no longer holds.
  if (made.length === 0) throw new Error("REFERRAL_CODE_USED");
}

/** Called on every order status change (order-status.ts). */
export async function onOrderStatusForReferrals(orderId: string, to: string): Promise<void> {
  const now = new Date();
  if (to === "delivered") {
    await db.update(schema.referralCredits).set({ status: "earned", updatedAt: now })
      .where(and(eq(schema.referralCredits.orderId, orderId), eq(schema.referralCredits.status, "pending")));
    return;
  }
  if (to === "cancelled" || to === "refunded" || to === "returned") {
    // The friend's order did not go through (or came back): no reward, unless already spent.
    await db.update(schema.referralCredits).set({ status: "void", updatedAt: now })
      .where(and(eq(schema.referralCredits.orderId, orderId), inArray(schema.referralCredits.status, ["pending", "earned"])));
    // A credit spent on this order goes back to its owner.
    await db.update(schema.referralCredits).set({ status: "earned", usedOrderId: null, updatedAt: now })
      .where(and(eq(schema.referralCredits.usedOrderId, orderId), eq(schema.referralCredits.status, "used")));
  }
}

/** For the Account page: credit ready to use, and friends whose orders are on the way. */
export async function referralBalance(email: string): Promise<{ earnedBdt: number; pending: number }> {
  try {
    const rows = await db.select({ status: schema.referralCredits.status, amountBdt: schema.referralCredits.amountBdt })
      .from(schema.referralCredits).where(sql`lower(${schema.referralCredits.referrerEmail}) = ${lower(email)}`);
    return {
      earnedBdt: rows.filter((r) => r.status === "earned").reduce((s, r) => s + r.amountBdt, 0),
      pending: rows.filter((r) => r.status === "pending").length,
    };
  } catch {
    return { earnedBdt: 0, pending: 0 };
  }
}
