/**
 * A product name for display. Names typed all in capitals ("THE 100 LYCHEE BOUQUET") are shown in
 * title case beside the others; any other name is shown exactly as typed. Bangla has no capitals,
 * so it is never changed.
 */
export function displayName(name: string): string {
  const letters = name.replace(/[^A-Za-z]/g, "");
  if (letters.length < 3 || letters !== letters.toUpperCase()) return name;
  return name.toLowerCase().replace(/([a-z])/g, (c) => c.toUpperCase());
}
