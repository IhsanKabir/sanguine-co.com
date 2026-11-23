/**
 * Loyalty tiers by lifetime spend (orders' totals plus deposits paid), lowest first. Shown on
 * the account page and used by the express fee rules (Admin, Settings, Same-day express).
 */
export const TIERS = [
  { min: 0, name: "Member", color: "var(--purple-400)" },
  { min: 10_000, name: "Insider", color: "var(--mauve)" },
  { min: 50_000, name: "Circle", color: "var(--gold)" },
  { min: 150_000, name: "Inner Circle", color: "oklch(0.78 0.15 78)" },
] as const;

export type Tier = (typeof TIERS)[number];
export type TierName = Tier["name"];
export const TIER_NAMES = TIERS.map((t) => t.name) as [TierName, ...TierName[]];

/** The tier a lifetime spend reaches. */
export function tierFor(spendBdt: number): Tier {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (spendBdt >= TIERS[i].min) return TIERS[i];
  }
  return TIERS[0];
}

/** 0 for Member up to 3 for Inner Circle; -1 for a name that is not a tier. */
export function tierRank(name: string): number {
  return TIERS.findIndex((t) => t.name === name);
}
