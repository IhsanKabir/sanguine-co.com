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
