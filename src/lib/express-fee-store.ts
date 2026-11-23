import { and, eq, notInArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "./db";
import { getCommerceSettings, expressRulesOf } from "./commerce";
import { decideExpressFee, type ExpressFeeDecision, type ExpressHistory } from "./express-fee";
import { MAX_EXPRESS_FEE_BDT } from "./delivery";

/**
 * Personal express fees set in Admin, Customers (site_settings.express_overrides): a map of
 * lower-cased email to the fee in taka (0 = free). Kept by email so guests count too, and in
 * site_settings so no new table is needed.
 */
export const EXPRESS_OVERRIDES_KEY = "express_overrides";
/** A personal fee may be higher than the standard one (owner's choice), but not absurdly so. */
export const MAX_PERSONAL_EXPRESS_FEE_BDT = MAX_EXPRESS_FEE_BDT;

const overridesSchema = z.record(z.string(), z.number().int().min(0).max(MAX_PERSONAL_EXPRESS_FEE_BDT));
export type ExpressOverrides = z.infer<typeof overridesSchema>;

/** Orders that do not count towards the free-from-the-Nth-order rule or towards spend. */
const NOT_COUNTED = ["cancelled", "refunded", "pending_payment"];

const key = (email: string) => email.trim().toLowerCase();

export async function readExpressOverrides(): Promise<ExpressOverrides> {
  const [row] = await db.select().from(schema.siteSettings)
    .where(eq(schema.siteSettings.key, EXPRESS_OVERRIDES_KEY)).limit(1);
  const parsed = overridesSchema.safeParse(row?.value ?? {});
  return parsed.success ? parsed.data : {};
}

export async function personalExpressFee(email: string | null): Promise<number | null> {
  if (!email) return null;
  const fee = (await readExpressOverrides())[key(email)];
  return fee === undefined ? null : fee;
}

/** Orders before this one and lifetime spend, matched by email or signed-in account. */
export async function expressHistory(email: string | null, customerId: string | null): Promise<ExpressHistory> {
  const who = [
    email ? sql`lower(${schema.orders.guestEmail}) = ${key(email)}` : null,
    customerId ? eq(schema.orders.customerId, customerId) : null,
  ].filter((c): c is NonNullable<typeof c> => c !== null);
  if (who.length === 0) return { priorOrders: 0, spendBdt: 0 };
  const [row] = await db.select({
    n: sql<number>`count(*)::int`,
    spend: sql<number>`coalesce(sum(${schema.orders.totalBdt} + coalesce(${schema.orders.depositPaidBdt}, 0)), 0)::int`,
  }).from(schema.orders).where(and(or(...who), notInArray(schema.orders.status, NOT_COUNTED)));
  return { priorOrders: Number(row?.n ?? 0), spendBdt: Number(row?.spend ?? 0) };
}

/**
 * This customer's same-day express fee and why (personal, order rule, tier rule, standard).
 * The server's answer is the one charged; the storefront only shows it.
 */
export async function expressFeeFor(email: string | null, customerId: string | null): Promise<ExpressFeeDecision> {
  const [commerce, personal, history] = await Promise.all([
    getCommerceSettings(),
    personalExpressFee(email),
    expressHistory(email, customerId),
  ]);
  return decideExpressFee(expressRulesOf(commerce), personal, history);
}
