/**
 * Delivery-date estimate, from the figures /legal/shipping publishes:
 * stock orders are dispatched within ONE working day, then the courier
 * typically takes up to 2 working days inside Dhaka and up to 4 to a
 * divisional city. Friday is the weekly holiday and is skipped; public
 * holidays are not modelled, which is why every surface labels the result
 * an estimate. Pure module — safe in server and client components.
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
