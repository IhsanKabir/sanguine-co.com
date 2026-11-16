/**
 * Checks the referral rules (src/lib/referral.ts): code parsing and the one money formula
 * the quote, WhatsApp message, admin panel and conversion share.
 *   npx tsx scripts/check-referral.ts
 */
import assert from "node:assert/strict";
import { normalizeReferralCode, preorderMoney, REFERRAL_BDT } from "../src/lib/referral";

// Codes: typed loosely, stored one way.
assert.equal(normalizeReferralCode("SSG-ABC234"), "SSG-ABC234");
assert.equal(normalizeReferralCode(" ssg-abc234 "), "SSG-ABC234");
assert.equal(normalizeReferralCode("abc234"), "SSG-ABC234");
assert.equal(normalizeReferralCode("SSG ABC234"), "SSG-ABC234");
assert.equal(normalizeReferralCode(""), null);
assert.equal(normalizeReferralCode(null), null);
assert.equal(normalizeReferralCode("SSG-ABC10"), null, "0, 1 and short codes are never issued");
assert.equal(normalizeReferralCode("<script>"), null);

// No discount: unchanged from before referrals.
assert.deepEqual(preorderMoney({ quotedPriceBdt: 2000, quantity: 1, depositBdt: 400 }),
  { goods: 2000, discount: 0, express: 0, total: 2000, deposit: 400, rest: 1600 });

// Referral and express together: 2,000 - 200 + 200 = 2,000; deposit 360 + 200 express.
assert.deepEqual(preorderMoney({ quotedPriceBdt: 2000, quantity: 1, expressFeeBdt: 200, referralDiscountBdt: REFERRAL_BDT, depositBdt: 560 }),
  { goods: 2000, discount: 200, express: 200, total: 2000, deposit: 560, rest: 1440 });

// Two bouquets: the discount is per order, not per bouquet.
assert.equal(preorderMoney({ quotedPriceBdt: 1500, quantity: 2, referralDiscountBdt: 200 }).total, 2800);

// Never below zero, never a deposit above the total.
assert.equal(preorderMoney({ quotedPriceBdt: 100, quantity: 1, referralDiscountBdt: 200 }).total, 0);
assert.equal(preorderMoney({ quotedPriceBdt: 1000, quantity: 1, depositBdt: 5000 }).rest, 0);

console.log("referral checks passed");
