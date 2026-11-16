/**
 * Referral rules (owner, 16 Nov 2026). Pure module: safe in client components.
 *
 * A customer shares their code (Account page, or written on the bouquet card).
 *  - The friend types it on the pre-order form: REFERRAL_BDT off their first order.
 *  - When the friend's order is delivered, the customer who shared the code earns
 *    REFERRAL_BDT off their own next order, taken off the quote automatically.
 * Both apply only to orders of at least REFERRAL_MIN_ORDER_BDT, one discount per order.
 * The server side (checks and credits) is in referral-server.ts.
 */
export const REFERRAL_BDT = 200;
export const REFERRAL_MIN_ORDER_BDT = 1500;

/** Codes look like SSG-ABC234 (actions/profile.ts). "abc234" and "ssg abc234" are accepted too. */
const CODE = /^SSG-[A-HJ-NP-Z2-9]{6}$/;   // the alphabet codes are issued in: no I, O, 0 or 1

export function normalizeReferralCode(raw: string | null | undefined): string | null {
  const s = (raw ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!s) return null;
  const code = `SSG-${s.startsWith("SSG") ? s.slice(3) : s}`;
  return CODE.test(code) ? code : null;
}

/**
 * A pre-order's money, the one formula the quote email, the WhatsApp quote, the admin
 * panel and the conversion all use: the bouquet(s), less the referral discount, plus
 * the same-day fee; the deposit up front, the rest on delivery.
 */
export function preorderMoney(r: {
  quotedPriceBdt: number;
  quantity: number;
  expressFeeBdt?: number | null;
  referralDiscountBdt?: number | null;
  depositBdt?: number | null;
}) {
  const goods = r.quotedPriceBdt * r.quantity;
  const discount = Math.min(Math.max(0, r.referralDiscountBdt ?? 0), goods);
  const express = r.expressFeeBdt ?? 0;
  const total = goods - discount + express;
  const deposit = Math.min(Math.max(0, r.depositBdt ?? 0), total);
  return { goods, discount, express, total, deposit, rest: total - deposit };
}
