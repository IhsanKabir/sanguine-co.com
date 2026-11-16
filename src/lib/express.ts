import { EXPRESS_FEE_BDT, expressCutoffLabel, isExpressOpen } from "@/lib/delivery";
import { isDhakaOnlySegment } from "@/lib/delivery-scope";

/** Marks a same-day express order in its notes; the courier booking reads it. */
export const EXPRESS_ORDER_NOTE = "SAME-DAY EXPRESS";
/** Order numbers of converted preorders: written by the system, never by a customer. */
export const PREORDER_ORDER_PREFIX = "SSG-PO-";

/**
 * An express order is a converted preorder whose system-written notes carry
 * the marker. Checkout notes are typed by customers, so the number is checked
 * too: typing the marker into a normal order changes nothing.
 */
export function isExpressOrder(order: { number: string; notes: string | null }): boolean {
  return order.number.startsWith(PREORDER_ORDER_PREFIX) && Boolean(order.notes?.includes(EXPRESS_ORDER_NOTE));
}

/**
 * Same-day express rules: flowers only, before the cutoff, and with an
 * address (there is no time to ask for one). Pure, so it can be tested.
 */
export function expressCheck(wanted: boolean, segmentId: string | null, hasAddress: boolean, now: Date, cutoffMin: number):
  { ok: true; feeBdt: number | null } | { ok: false; error: string } {
  if (!wanted) return { ok: true, feeBdt: null };
  if (!isDhakaOnlySegment(segmentId)) return { ok: false, error: "Same-day express is for flowers in Dhaka." };
  if (!isExpressOpen(now, cutoffMin)) {
    return { ok: false, error: `Same-day express closes at ${expressCutoffLabel("en", cutoffMin)}. Please choose a delivery day instead.` };
  }
  if (!hasAddress) return { ok: false, error: "Please add the delivery address for same-day express." };
  return { ok: true, feeBdt: EXPRESS_FEE_BDT };
}
