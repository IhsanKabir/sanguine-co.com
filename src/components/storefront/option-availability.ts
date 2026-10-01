/**
 * Which colours / sizes can be bought, from the per-option stock map
 * ({ "colour|size": n }, '' for an absent side). A null map means the piece
 * is not counted per option: every option is available and the product's
 * single stock number applies (checked again at checkout either way).
 */
export type OptionStock = Record<string, number> | null | undefined;

export function stockOf(map: OptionStock, color: string, size: string): number | null {
  if (!map) return null;
  return map[`${color}|${size}`] ?? 0;   // an option with no row is not stocked
}

/** A size is sold out for the chosen colour (or, with no colour chosen yet, in every colour). */
export function sizeSoldOut(map: OptionStock, colors: string[], color: string, size: string): boolean {
  if (!map) return false;
  const inColours = colors.length === 0 ? [""] : color ? [color] : colors;
  return inColours.every((c) => (stockOf(map, c, size) ?? 0) <= 0);
}

/** A colour is sold out in every size. */
export function colorSoldOut(map: OptionStock, sizes: string[], color: string): boolean {
  if (!map) return false;
  return (sizes.length === 0 ? [""] : sizes).every((s) => (stockOf(map, color, s) ?? 0) <= 0);
}
