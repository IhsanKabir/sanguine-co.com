import { sql } from "drizzle-orm";
import { schema } from "@/lib/db";

/**
 * What counts as revenue — ONE definition for the dashboard, analytics and
 * reports (they used to sum every order, cancelled ones included).
 *
 * - An order counts unless it is cancelled, or an online order whose payment
 *   never completed (pending_payment).
 * - Its value is total + prepaid deposit, MINUS the refunds actually issued
 *   (refunds table), so full and partial refunds both come off. A 'refunded'
 *   order therefore nets to what was kept.
 *
 * Status breakdowns ("orders by status") deliberately do NOT use this filter:
 * they describe every order, not money earned.
 */
export const NON_REVENUE_STATUSES = ["cancelled", "pending_payment"] as const;

/** SQL condition: this order row counts towards revenue. */
export const countsAsRevenue = sql`${schema.orders.status} not in ('cancelled', 'pending_payment')`;

/** SQL expression: this order's revenue after refunds (BDT). */
export const netOrderRevenue = sql`(
  ${schema.orders.totalBdt} + ${schema.orders.depositPaidBdt}
  - coalesce((select sum(r.amount_bdt) from refunds r where r.order_id = ${schema.orders.id}), 0)
)`;
