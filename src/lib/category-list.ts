type NamedSegment = { name: string; nameBn: string | null };

/**
 * The open categories as one natural phrase for brand copy: "Flowers",
 * "Flowers and perfume", "Flowers, perfume and books" (or the Bangla
 * equivalent). Copy that names categories must go through this so it only
 * ever mentions what customers can actually shop; unhiding a segment in
 * admin updates the homepage without a copy change.
 */
export function categoryList(segments: NamedSegment[], locale: "en" | "bn"): string {
  const names = segments
    .map((s) => (locale === "bn" ? s.nameBn || s.name : s.name).trim())
    .filter(Boolean)
    .map((n, i) => (locale === "en" && i > 0 ? n.toLowerCase() : n));
  if (names.length === 0) return locale === "bn" ? "বাছাই করা উপহার" : "Considered gifts";
  return new Intl.ListFormat(locale === "bn" ? "bn" : "en", { style: "long", type: "conjunction" })
    .format(names)
    .replace(", and ", " and ")
    .replace(" এবং ", " ও ");
}
