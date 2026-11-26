// Checks the advance (deposit) rules: npx tsx scripts/check-deposit.ts
//
// Digital Commerce Operation Guidelines 2021, clause 3.2.10 (gazette of 4 July 2021): when a
// product cannot be handed to the delivery person within 48 hours of payment, no more than 10%
// of its price may be taken in advance. The owner's choice (26 Nov 2026): the Admin percentage
// (30%) when the bouquet goes out today or tomorrow, 10% for a later date.
import assert from "node:assert/strict";
import {
  DEFAULT_PREORDER_DEPOSIT_PCT,
  LATER_DATE_DEPOSIT_CAP_PCT,
  deliversWithin48h,
  depositForQuote,
  depositPctFor,
} from "../src/lib/pricing";
import { dhakaTomorrow } from "../src/lib/delivery";

/** A moment given in Dhaka time (UTC+6). */
const dhaka = (y: number, m: number, d: number, h: number, min = 0) => new Date(Date.UTC(y, m - 1, d, h - 6, min));

const now = dhaka(2026, 11, 26, 10); // Thursday 26 November, 10:00 in Dhaka

// Tomorrow, in Dhaka's calendar.
assert.equal(dhakaTomorrow(now), "2026-11-27");
assert.equal(dhakaTomorrow(dhaka(2026, 11, 30, 23, 30)), "2026-12-01", "across a month end, late at night");
assert.equal(dhakaTomorrow(dhaka(2026, 11, 27, 1)), "2026-11-28", "just after midnight in Dhaka (still the 26th in UTC)");

// When does the piece go out within 48 hours of the advance?
const bouquet = { express: false, bouquet: true };
const bespoke = { express: false, bouquet: false };
assert.equal(deliversWithin48h({ ...bouquet, express: true, targetDate: "2026-11-26" }, now), true, "same-day express");
assert.equal(deliversWithin48h({ ...bouquet, targetDate: "2026-11-26" }, now), true, "a date of today");
assert.equal(deliversWithin48h({ ...bouquet, targetDate: "2026-11-27" }, now), true, "a date of tomorrow");
assert.equal(deliversWithin48h({ ...bouquet, targetDate: "2026-11-28" }, now), false, "the day after tomorrow");
assert.equal(deliversWithin48h({ ...bouquet, targetDate: "2027-02-14" }, now), false, "Valentine's Day, booked early");
assert.equal(deliversWithin48h({ ...bouquet, targetDate: null }, now), true, "a bouquet with no date goes out as soon as the advance arrives");
assert.equal(deliversWithin48h({ ...bouquet, targetDate: "2026-11-25" }, now), true, "a bouquet whose day has gone by is made as soon as the advance arrives");
assert.equal(deliversWithin48h({ ...bouquet, express: true, targetDate: "2026-11-24" }, now), true, "a late quote for a same-day bouquet");
assert.equal(deliversWithin48h({ ...bespoke, targetDate: null }, now), false, "a bespoke piece with no date is made later");
assert.equal(deliversWithin48h({ ...bespoke, targetDate: "2026-11-27" }, now), false, "any other made-to-order piece takes longer, even if tomorrow is picked");
assert.equal(deliversWithin48h({ ...bespoke, targetDate: "2026-11-20" }, now), false, "nor when its date has gone by");
// Just before midnight, the day after tomorrow is still a later date; a minute after, it is tomorrow.
assert.equal(deliversWithin48h({ ...bouquet, targetDate: "2026-11-28" }, dhaka(2026, 11, 26, 23, 59)), false);
assert.equal(deliversWithin48h({ ...bouquet, targetDate: "2026-11-28" }, dhaka(2026, 11, 27, 0, 1)), true);

// The share of the price taken in advance.
assert.equal(DEFAULT_PREORDER_DEPOSIT_PCT, 30, "the owner's choice");
assert.equal(LATER_DATE_DEPOSIT_CAP_PCT, 10, "clause 3.2.10");
assert.equal(depositPctFor(30, true), 30, "today or tomorrow: the Admin percentage");
assert.equal(depositPctFor(30, false), 10, "a later date: capped at 10%");
assert.equal(depositPctFor(5, false), 5, "a lower Admin percentage is never raised");
assert.equal(depositPctFor(10, false), 10);
assert.equal(depositPctFor(100, false), 10, "even a full prepayment setting is capped for a later date");

// The advance in taka never goes over its share, so a capped advance is never above 10%.
assert.equal(depositForQuote(1500, 30), 450);
assert.equal(depositForQuote(1500, 10), 150);
assert.equal(depositForQuote(1555, 10), 155, "rounds down: ৳156 would be 10.03%");
assert.equal(depositForQuote(2195, 30), 658, "rounds down to whole taka");
assert.equal(depositForQuote(5, 10), 1, "never zero");
for (const price of [999, 1450, 1555, 1999, 2950, 3955, 6001]) {
  assert.ok(depositForQuote(price, LATER_DATE_DEPOSIT_CAP_PCT) <= price * 0.1, `৳${price}: within 10%`);
}

console.log("deposit checks passed");
