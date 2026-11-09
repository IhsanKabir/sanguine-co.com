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
