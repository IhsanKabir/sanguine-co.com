/**
 * Display labels for product option values. The stored value (cart, orders,
 * URL filters) stays exactly as entered in admin; only what the shopper
 * reads is localised. Pure module: safe in server and client components.
 */

type Locale = "en" | "bn";

const COLOR_BN: Record<string, string> = {
  red: "লাল",
  pink: "গোলাপি",
  yellow: "হলুদ",
  white: "সাদা",
  black: "কালো",
  orange: "কমলা",
  purple: "বেগুনি",
  lavender: "ল্যাভেন্ডার",
  blue: "নীল",
  navy: "নেভি",
  green: "সবুজ",
  brown: "বাদামি",
  maroon: "মেরুন",
  peach: "পিচ",
  cream: "ক্রিম",
  beige: "বেইজ",
  gold: "সোনালি",
  silver: "রুপালি",
  grey: "ধূসর",
  gray: "ধূসর",
  multicolor: "বহুরঙা",
  multicolors: "বহুরঙা",
  multicolour: "বহুরঙা",
  multicolours: "বহুরঙা",
  mixed: "মিশ্র",
};

/** "PINK" / "pink" / "Pink" read as "Pink" in English, "গোলাপি" in Bangla. */
export function colorLabel(value: string, locale: Locale): string {
  const key = value.trim().toLowerCase();
  if (locale === "bn" && COLOR_BN[key]) return COLOR_BN[key];
  return key.replace(/\b\p{L}/gu, (ch) => ch.toUpperCase());
}

/** Numeric sizes (stem counts like "20") get Bangla digits; "XL" stays. */
export function sizeLabel(value: string, locale: Locale): string {
  return locale === "bn" && /^\d+$/.test(value.trim())
    ? Number(value).toLocaleString("bn-BD", { useGrouping: false })
    : value;
}

/** Colour values that differ only by case are the same choice. */
export function sameOption(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Distinct option values across products: case variants ("PINK", "Pink")
 *  collapse to the first seen, sorted naturally so "5" comes before "10". */
export function uniqueOptions(values: string[]): string[] {
  const seen = new Map<string, string>();
  for (const v of values) {
    const key = v.trim().toLowerCase();
    if (key && !seen.has(key)) seen.set(key, v);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, "en", { numeric: true, sensitivity: "base" }));
}
