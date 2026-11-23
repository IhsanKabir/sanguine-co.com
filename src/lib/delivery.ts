/**
 * Delivery-date estimate, from the figures /legal/shipping publishes:
 * inside Dhaka a stock order arrives within 48 hours (owner, 2026-11-10);
 * elsewhere it is dispatched within ONE working day and the courier
 * typically takes up to 4 working days to a divisional city. Friday is the weekly holiday and is skipped; public
 * holidays are not modelled, which is why every surface labels the result
 * an estimate. Pure module: safe in server and client components.
 */

export const DISPATCH_WORKING_DAYS = 1;
export const TRANSIT_WORKING_DAYS_OUTSIDE = 4;

const FRIDAY = 5;

export function addWorkingDays(from: Date, days: number): Date {
  const d = new Date(from);
  let left = days;
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== FRIDAY) left--;
  }
  return d;
}

export const DHAKA_DELIVERY_HOURS = 48;

/** Latest typical arrival for an order placed at `now`. */
export function estimatedArrival(now: Date, insideDhaka: boolean): Date {
  if (insideDhaka) return new Date(now.getTime() + DHAKA_DELIVERY_HOURS * 60 * 60 * 1000);
  return addWorkingDays(now, DISPATCH_WORKING_DAYS + TRANSIT_WORKING_DAYS_OUTSIDE);
}

/** "Thu, 9 Oct" / "বৃহঃ, ৯ অক্টো" */
export function formatArrival(d: Date, locale: "en" | "bn"): string {
  return d.toLocaleDateString(locale === "bn" ? "bn-BD" : "en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/**
 * Same-day express for flowers in Dhaka (owner, 2026-11-15). Bouquets usually
 * go out the same day anyway; express makes it a promise for a fee, collected
 * in advance with the deposit. The fee and its free rules are set in Admin,
 * Settings (lib/commerce.ts, lib/express-fee.ts); this is the starting fee.
 */
export const DEFAULT_EXPRESS_FEE_BDT = 200;
/** Highest standard express fee Admin accepts (a guard against a typo like 20000). */
export const MAX_EXPRESS_FEE_BDT = 5_000;
/** Express requests close at this hour, Dhaka time (24-hour clock). */
/**
 * The same-day cutoff, in minutes after midnight in Dhaka. Set in Admin, Settings
 * (commerce.expressCutoffMin, 16 Nov 2026); this is the default and the fallback.
 */
export const DEFAULT_EXPRESS_CUTOFF_MIN = 14 * 60;
export const EXPRESS_CUTOFF_EARLIEST_MIN = 8 * 60;
export const EXPRESS_CUTOFF_LATEST_MIN = 22 * 60;
export const EXPRESS_CUTOFF_STEP_MIN = 15;

/** Minutes after midnight, now, in Dhaka. */
export function dhakaMinutes(d: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

/** True while a same-day express request can still be placed today. */
export function isExpressOpen(now: Date, cutoffMin: number): boolean {
  return dhakaMinutes(now) < cutoffMin;
}

/** Minutes left today before the cutoff; 0 once it has passed. */
export function minutesToCutoff(now: Date, cutoffMin: number): number {
  return Math.max(0, cutoffMin - dhakaMinutes(now));
}

/** The part of the day a Bangla time is said with: সকাল ১০টা, দুপুর ২টা, বিকেল ৪টা. */
function bnDayPart(h: number): string {
  if (h < 12) return "সকাল";
  if (h < 15) return "দুপুর";
  if (h < 18) return "বিকেল";
  if (h < 20) return "সন্ধ্যা";
  return "রাত";
}

/** The cutoff in the page language: "2 PM", "2:30 PM" / "দুপুর ২টা", "দুপুর ২টা ৩০ মিনিট". */
export function expressCutoffLabel(locale: "en" | "bn", cutoffMin: number): string {
  const h24 = Math.floor(cutoffMin / 60), m = cutoffMin % 60, h = h24 % 12 || 12;
  if (locale === "bn") {
    const bn = (n: number) => n.toLocaleString("bn-BD");
    return `${bnDayPart(h24)} ${bn(h)}টা${m ? ` ${bn(m)} মিনিট` : ""}`;
  }
  return `${h}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h24 < 12 ? "AM" : "PM"}`;
}

/** Today's date in Dhaka, "YYYY-MM-DD". */
export function dhakaToday(now: Date): string {
  return dhakaDay(now);
}

/** Furthest ahead a customer can schedule a delivery. */
export const MAX_SCHEDULE_DAYS = 60;
export const GIFT_MESSAGE_MAX = 200;

/** "YYYY-MM-DD" for a moment, in Dhaka time. */
function dhakaDay(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(d);
}

/**
 * Bounds for a chosen delivery date: from tomorrow (Dhaka time) so there is
 * time to make the bouquet, up to MAX_SCHEDULE_DAYS ahead.
 */
export function deliveryDateBounds(now: Date): { min: string; max: string } {
  const day = 24 * 60 * 60 * 1000;
  return { min: dhakaDay(new Date(now.getTime() + day)), max: dhakaDay(new Date(now.getTime() + MAX_SCHEDULE_DAYS * day)) };
}

export function isValidDeliveryDate(value: string, now: Date): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const { min, max } = deliveryDateBounds(now);
  return value >= min && value <= max;
}

/**
 * Admin's free-text preorder estimate ("1-3 DAYS", "2 days") read in the page
 * language: "1 to 3 days" / "১ থেকে ৩ দিন". Text in any other shape is shown
 * as typed. One admin field serves both languages.
 */
export function localizeEstimate(text: string, locale: "en" | "bn"): string {
  const n = (v: string) => (locale === "bn" ? Number(v).toLocaleString("bn-BD", { useGrouping: false }) : v);
  const range = text.trim().match(/^(\d+)\s*(?:-|–|to)\s*(\d+)\s*days?$/i);
  if (range) return locale === "bn" ? `${n(range[1])} থেকে ${n(range[2])} দিন` : `${range[1]} to ${range[2]} days`;
  const single = text.trim().match(/^(\d+)\s*(days?)$/i);
  if (single) return locale === "bn" ? `${n(single[1])} দিন` : `${single[1]} ${Number(single[1]) === 1 ? "day" : "days"}`;
  return text;
}
