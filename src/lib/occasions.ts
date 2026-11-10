/**
 * Shop by occasion. A fixed list (not admin-editable) so every occasion has a
 * reviewed Bangla name and a stable URL (/occasion/<id>). Products carry the
 * ids in products.occasions (0023). Pure module: safe in client components.
 */
export const OCCASIONS = [
  { id: "birthday", en: "Birthday", bn: "জন্মদিন" },
  { id: "anniversary", en: "Anniversary", bn: "বিবাহবার্ষিকী" },
  { id: "love", en: "Love", bn: "ভালোবাসা" },
  { id: "congratulations", en: "Congratulations", bn: "অভিনন্দন" },
  { id: "sorry", en: "Sorry", bn: "দুঃখিত" },
  { id: "get-well", en: "Get well", bn: "দ্রুত সুস্থতা কামনায়" },
  { id: "eid", en: "Eid", bn: "ঈদ" },
  { id: "wedding", en: "Wedding", bn: "বিয়ে" },
] as const;

export type OccasionId = (typeof OCCASIONS)[number]["id"];

export const OCCASION_IDS = OCCASIONS.map((o) => o.id) as [OccasionId, ...OccasionId[]];

export function findOccasion(id: string): (typeof OCCASIONS)[number] | undefined {
  return OCCASIONS.find((o) => o.id === id);
}

export function occasionLabel(id: string, locale: string): string {
  const o = findOccasion(id);
  if (!o) return id;
  return locale === "bn" ? o.bn : o.en;
}

/** Occasions in list order that at least one of the given products carries. */
export function occasionsInUse(items: { occasions: unknown }[]): OccasionId[] {
  const used = new Set(items.flatMap((p) => (Array.isArray(p.occasions) ? p.occasions : [])));
  return OCCASION_IDS.filter((id) => used.has(id));
}
