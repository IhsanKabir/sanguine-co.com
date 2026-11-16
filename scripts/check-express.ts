// Checks the same-day express rules: npx tsx scripts/check-express.ts
import assert from "node:assert/strict";
import { expressCheck, isExpressOrder } from "../src/lib/express";
import { quoteWhatsAppText } from "../src/lib/quote-message";
import { isExpressOpen, expressCutoffLabel, dhakaToday, EXPRESS_FEE_BDT, DEFAULT_EXPRESS_CUTOFF_MIN } from "../src/lib/delivery";

const CUT = DEFAULT_EXPRESS_CUTOFF_MIN;   // 2 PM

const at = (h: number) => new Date(Date.UTC(2026, 10, 15, h - 6, 30)); // Dhaka is UTC+6

assert.equal(isExpressOpen(at(13), CUT), true, "open at 13:30");
assert.equal(isExpressOpen(at(14), CUT), false, "closed at 14:30");
assert.equal(isExpressOpen(at(6), CUT), true, "open early morning");
assert.deepEqual(expressCheck(true, "flowers", true, at(10), CUT), { ok: true, feeBdt: EXPRESS_FEE_BDT });
assert.equal(expressCheck(true, "flowers", true, at(15), CUT).ok, false, "after the cutoff");
assert.equal(expressCheck(true, "flowers", false, at(10), CUT).ok, false, "needs an address");
assert.equal(expressCheck(true, "clothing", true, at(10), CUT).ok, false, "flowers only");
assert.deepEqual(expressCheck(false, "flowers", false, at(15), CUT), { ok: true, feeBdt: null });
assert.equal(expressCutoffLabel("en", CUT), "2 PM");
assert.equal(expressCutoffLabel("bn", CUT), "দুপুর ২টা");
assert.equal(expressCutoffLabel("en", 16 * 60 + 30), "4:30 PM", "the owner can set any quarter hour");
assert.equal(expressCutoffLabel("bn", 16 * 60 + 30), "বিকেল ৪টা ৩০ মিনিট");
assert.equal(expressCutoffLabel("en", 11 * 60), "11 AM");
assert.equal(isExpressOpen(at(15), 16 * 60), true, "a later cutoff keeps express open at 15:30");
assert.match((expressCheck(true, "flowers", true, at(17), 16 * 60) as { error: string }).error, /closes at 4 PM/);
assert.equal(dhakaToday(at(1)), "2026-11-15");
assert.equal(isExpressOrder({ number: "SSG-PO-ABC", notes: "Bespoke pre-order · request x · SAME-DAY EXPRESS (200 BDT)" }), true);
assert.equal(isExpressOrder({ number: "SSG-1234", notes: "please SAME-DAY EXPRESS" }), false, "customer notes cannot ask for on-demand");
const msg = quoteWhatsAppText({ customerName: "A", productName: "Lily", quantity: 1, quotedPriceBdt: 2000, depositBdt: 600, targetDate: null, expressFeeBdt: 200 });
assert.match(msg, /Price: ৳2,200, including ৳200 for same-day express./);
assert.match(msg, /remaining ৳1,600 is paid in cash/, "the balance matches what the courier collects");
console.log("express rules: all checks pass");
