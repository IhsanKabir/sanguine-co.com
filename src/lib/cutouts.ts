/**
 * Cut-out pictures of products: the bouquet with its background removed, as transparent WebP
 * in two sizes. The home page's rail and shelf stand them on the page. A product without one
 * shows its normal photo on the shelf and is left out of the rail.
 *
 * Two sources, the uploaded one winning:
 *  - uploaded in the admin (Products, edit, "Cut-out for the home page"), stored per product
 *    id in site_settings.cutouts (lib/cutout-store.ts);
 *  - built in: the first cut-outs, made from the shop's photos (social-studio/photos/*-cut.png,
 *    edges hardened), in /public/cutouts, listed below by product address.
 * Pure module: safe in server and client components.
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

const BUILT_IN: Readonly<Record<string, Cutout>> = {
  "the-100-rose-special": cut("the-100-rose-special", 900, 874),
  "multicolor-lily-bouquet": cut("multicolor-lily-bouquet", 753, 900),
  "the-100-lychee-bouquet": cut("the-100-lychee-bouquet", 900, 860),
  "pink-rose-bouquet": cut("pink-rose-bouquet", 572, 900),
  // From the owner's own photo (sunflowers and white lilies, 16 Nov 2026), dark centres filled back in.
  "sunflower-bouquet": cut("sunflower-bouquet", 811, 900),
};

/** A product's cut-out: the uploaded one (by product id) if any, else the built-in one (by address). */
export function cutoutFor(product: { id: string; slug: string }, uploaded: Readonly<Record<string, Cutout>> = {}): Cutout | null {
  return uploaded[product.id] ?? BUILT_IN[product.slug] ?? null;
}
