/**
 * Where the shop can honestly promise delivery.
 *
 * Bouquets are made fresh and cannot travel by parcel courier, so flowers
 * are delivered in Dhaka only (owner decision, 12 Nov 2026). Every other
 * category ships across Bangladesh. Copy that makes a delivery promise picks
 * its wording from the scope of the categories that are open:
 *
 *   "dhaka"      : every open category is Dhaka only
 *   "mixed"      : some are Dhaka only, some ship nationwide
 *   "nationwide" : nothing open is Dhaka only
 */
export const DHAKA_ONLY_SEGMENT_IDS: readonly string[] = ["flowers"];

export type DeliveryScope = "dhaka" | "mixed" | "nationwide";

export function isDhakaOnlySegment(segmentId: string | null | undefined): boolean {
  return Boolean(segmentId) && DHAKA_ONLY_SEGMENT_IDS.includes(segmentId as string);
}

export function deliveryScope(segments: ReadonlyArray<{ id: string }>): DeliveryScope {
  if (segments.length === 0) return "nationwide";
  const dhakaOnly = segments.filter((s) => isDhakaOnlySegment(s.id)).length;
  if (dhakaOnly === 0) return "nationwide";
  return dhakaOnly === segments.length ? "dhaka" : "mixed";
}

/**
 * Message key for a scope. `variants` lists the scopes that have their own
 * wording under `<key>Dhaka` / `<key>Mixed`; any other scope uses the base key.
 */
export function scopedKey(key: string, scope: DeliveryScope, variants: ReadonlyArray<"dhaka" | "mixed">): string {
  if (scope === "dhaka" && variants.includes("dhaka")) return `${key}Dhaka`;
  if (scope === "mixed" && variants.includes("mixed")) return `${key}Mixed`;
  return key;
}

/** True for "Dhaka" in English or Bangla, however the customer typed it. */
export function isDhakaCity(city: string | null | undefined): boolean {
  const c = (city ?? "").trim().toLowerCase();
  return c.includes("dhaka") || c.includes("ঢাকা");
}
