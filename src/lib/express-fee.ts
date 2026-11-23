import { tierFor, tierRank } from "./loyalty";

/** The owner's express fee rules (Admin, Settings, Same-day express). */
export interface ExpressFeeRules {
  /** The standard fee. */
  feeBdt: number;
  /** Free on every order from this one on (2 = from the second order); null = off. */
  freeFromOrder: number | null;
  /** Free for this tier and above; null = off. */
  freeFromTier: string | null;
}

/** What is known about the customer placing the request. */
export interface ExpressHistory {
  /** Orders placed before this one (not cancelled, refunded or awaiting payment). */
  priorOrders: number;
  /** Lifetime spend: order totals plus deposits paid. */
  spendBdt: number;
}

export type ExpressFeeReason = "personal" | "order" | "tier" | "standard";

export interface ExpressFeeDecision {
  feeBdt: number;
  reason: ExpressFeeReason;
}

/**
 * The fee for one customer. A personal setting made in Admin (Customers) always wins, higher
 * or lower (owner, 23 Nov 2026). Otherwise express is free when either free rule applies
 * (every order from the Nth, or the tier and above), and the standard fee when none does.
 * Pure: no database, so it can be tested on its own.
 */
export function decideExpressFee(rules: ExpressFeeRules, personalBdt: number | null, history: ExpressHistory): ExpressFeeDecision {
  if (personalBdt !== null) return { feeBdt: Math.max(0, personalBdt), reason: "personal" };
  const thisOrder = history.priorOrders + 1;
  if (rules.freeFromOrder !== null && thisOrder >= rules.freeFromOrder) return { feeBdt: 0, reason: "order" };
  if (rules.freeFromTier !== null) {
    const needed = tierRank(rules.freeFromTier);
    if (needed >= 0 && tierRank(tierFor(history.spendBdt).name) >= needed) return { feeBdt: 0, reason: "tier" };
  }
  return { feeBdt: rules.feeBdt, reason: "standard" };
}
