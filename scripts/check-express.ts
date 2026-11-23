// Checks the same-day express rules: npx tsx scripts/check-express.ts
import assert from "node:assert/strict";
import { expressCheck, isExpressOrder } from "../src/lib/express";
import { quoteWhatsAppText } from "../src/lib/quote-message";
import { isExpressOpen, expressCutoffLabel, dhakaToday, DEFAULT_EXPRESS_FEE_BDT, DEFAULT_EXPRESS_CUTOFF_MIN } from "../src/lib/delivery";
import { decideExpressFee, type ExpressFeeRules } from "../src/lib/express-fee";
import { tierFor } from "../src/lib/loyalty";

const CUT = DEFAULT_EXPRESS_CUTOFF_MIN;   // 2 PM
const FEE = DEFAULT_EXPRESS_FEE_BDT;

const at = (h: number) => new Date(Date.UTC(2026, 10, 15, h - 6, 30)); // Dhaka is UTC+6

assert.equal(isExpressOpen(at(13), CUT), true, "open at 13:30");
assert.equal(isExpressOpen(at(14), CUT), false, "closed at 14:30");
assert.equal(isExpressOpen(at(6), CUT), true, "open early morning");
assert.deepEqual(expressCheck(true, "flowers", true, at(10), CUT, FEE), { ok: true, feeBdt: FEE });
assert.equal(expressCheck(true, "flowers", true, at(15), CUT, FEE).ok, false, "after the cutoff");
assert.equal(expressCheck(true, "flowers", false, at(10), CUT, FEE).ok, false, "needs an address");
assert.equal(expressCheck(true, "clothing", true, at(10), CUT, FEE).ok, false, "flowers only");
assert.deepEqual(expressCheck(false, "flowers", false, at(15), CUT, FEE), { ok: true, feeBdt: null });
assert.equal(expressCutoffLabel("en", CUT), "2 PM");
assert.equal(expressCutoffLabel("bn", CUT), "দুপুর ২টা");
assert.equal(expressCutoffLabel("en", 16 * 60 + 30), "4:30 PM", "the owner can set any quarter hour");
assert.equal(expressCutoffLabel("bn", 16 * 60 + 30), "বিকেল ৪টা ৩০ মিনিট");
assert.equal(expressCutoffLabel("en", 11 * 60), "11 AM");
assert.equal(isExpressOpen(at(15), 16 * 60), true, "a later cutoff keeps express open at 15:30");
assert.match((expressCheck(true, "flowers", true, at(17), 16 * 60, FEE) as { error: string }).error, /closes at 4 PM/);
assert.equal(dhakaToday(at(1)), "2026-11-15");
assert.equal(isExpressOrder({ number: "SSG-PO-ABC", notes: "Bespoke pre-order · request x · SAME-DAY EXPRESS (200 BDT)" }), true);
assert.equal(isExpressOrder({ number: "SSG-1234", notes: "please SAME-DAY EXPRESS" }), false, "customer notes cannot ask for on-demand");
const msg = quoteWhatsAppText({ customerName: "A", productName: "Lily", quantity: 1, quotedPriceBdt: 2000, depositBdt: 600, targetDate: null, expressFeeBdt: 200 });
assert.match(msg, /Price: ৳2,200, including ৳200 for same-day express./);
assert.match(msg, /remaining ৳1,600 is paid in cash/, "the balance matches what the courier collects");
// A free express is still express: 0, never null.
assert.deepEqual(expressCheck(true, "flowers", true, at(10), CUT, 0), { ok: true, feeBdt: 0 });
const freeMsg = quoteWhatsAppText({ customerName: "A", productName: "Lily", quantity: 1, quotedPriceBdt: 2000, depositBdt: 600, targetDate: null, expressFeeBdt: 0 });
assert.match(freeMsg, /Same-day express is free for you/);

// The owner's fee rules (23 Nov 2026): a personal setting wins; otherwise free from the Nth
// order on, or for the tier and above; otherwise the standard fee.
const rules: ExpressFeeRules = { feeBdt: 250, freeFromOrder: 2, freeFromTier: "Inner Circle" };
const first = { priorOrders: 0, spendBdt: 0 };
assert.deepEqual(decideExpressFee(rules, null, first), { feeBdt: 250, reason: "standard" }, "first order pays");
assert.deepEqual(decideExpressFee(rules, null, { priorOrders: 1, spendBdt: 3000 }), { feeBdt: 0, reason: "order" }, "second order free");
assert.deepEqual(decideExpressFee(rules, null, { priorOrders: 7, spendBdt: 3000 }), { feeBdt: 0, reason: "order" }, "every order after too");
assert.deepEqual(decideExpressFee({ ...rules, freeFromOrder: null }, null, { priorOrders: 0, spendBdt: 150_000 }), { feeBdt: 0, reason: "tier" }, "top tier free");
assert.deepEqual(decideExpressFee({ ...rules, freeFromOrder: null }, null, { priorOrders: 3, spendBdt: 149_999 }), { feeBdt: 250, reason: "standard" }, "just under the tier pays");
assert.deepEqual(decideExpressFee({ ...rules, freeFromOrder: null, freeFromTier: "Insider" }, null, { priorOrders: 1, spendBdt: 60_000 }), { feeBdt: 0, reason: "tier" }, "a higher tier counts");
assert.deepEqual(decideExpressFee(rules, 400, { priorOrders: 9, spendBdt: 900_000 }), { feeBdt: 400, reason: "personal" }, "a personal fee wins, even above a free rule");
assert.deepEqual(decideExpressFee(rules, 0, first), { feeBdt: 0, reason: "personal" }, "personal free on a first order");
assert.deepEqual(decideExpressFee({ feeBdt: 200, freeFromOrder: null, freeFromTier: null }, null, { priorOrders: 20, spendBdt: 500_000 }), { feeBdt: 200, reason: "standard" }, "no rules: always the fee");
assert.equal(tierFor(50_000).name, "Circle");
assert.equal(tierFor(9_999).name, "Member");
console.log("express rules: all checks pass");
