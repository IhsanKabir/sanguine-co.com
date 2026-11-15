/**
 * Cut-out pictures of products: the shop's own photos with the background removed
 * (social-studio/photos/*-cut.png), edges hardened (the faint haze the cutting tool leaves
 * is dropped), as transparent WebP in two sizes in /public/cutouts.
 * The home page's rail and shelf stand them on the page. A product without one shows
 * its normal photo on the shelf and is left out of the rail.
 *
 * To add one: export the cut-out at 900 and 450 px tall as "<slug>-900.webp" and
 * "<slug>-450.webp" into /public/cutouts, then add a line below with the 900 size.
 */
export interface Cutout {
  /** About 900 px tall: wide screens. */
  large: string;
  /** About 450 px tall: phones and the shelf. */
  small: string;
  /** Size of the large file, so the page reserves its space before it loads. */
  width: number;
  height: number;
}

const cut = (slug: string, width: number, height: number): Cutout => ({
  large: `/cutouts/${slug}-900.webp`,
  small: `/cutouts/${slug}-450.webp`,
  width,
  height,
});

const CUTOUTS: Readonly<Record<string, Cutout>> = {
  "the-100-rose-special": cut("the-100-rose-special", 900, 874),
  "multicolor-lily-bouquet": cut("multicolor-lily-bouquet", 753, 900),
  "the-100-lychee-bouquet": cut("the-100-lychee-bouquet", 900, 860),
  "pink-rose-bouquet": cut("pink-rose-bouquet", 572, 900),
  // The sunflower basket's photo has a cupcake and a candle in front: no cut-out until a clean photo.
};

export function cutoutFor(slug: string): Cutout | null {
  return CUTOUTS[slug] ?? null;
}
