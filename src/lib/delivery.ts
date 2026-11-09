/**
 * Delivery-date estimate, from the figures /legal/shipping publishes:
 * stock orders are dispatched within ONE working day, then the courier
 * typically takes up to 2 working days inside Dhaka and up to 4 to a
 * divisional city. Friday is the weekly holiday and is skipped; public
 * holidays are not modelled, which is why every surface labels the result
 * an estimate. Pure module: safe in server and client components.
 */

export const DISPATCH_WORKING_DAYS = 1;
export const TRANSIT_WORKING_DAYS_DHAKA = 2;
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

/** Latest typical arrival for an order placed at `now`. */
export function estimatedArrival(now: Date, insideDhaka: boolean): Date {
  const transit = insideDhaka ? TRANSIT_WORKING_DAYS_DHAKA : TRANSIT_WORKING_DAYS_OUTSIDE;
  return addWorkingDays(now, DISPATCH_WORKING_DAYS + transit);
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
