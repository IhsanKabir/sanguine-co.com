"use server";

import { z } from "zod";
import { getProductsByIds, getHeroImagesFor } from "@/lib/queries";
import type { Product } from "@/lib/schema";

const idsSchema = z.array(z.string().min(1).max(120)).max(20);

export type StorefrontProductLite = {
  id: string;
  slug: string;
  sku: string;
  name: string;
  nameBn: string | null;
  priceBdt: number;
  wasBdt: number | null;
  // Quotation-pricing fields — without them client cards render raw ৳0 for
  // preorder/estimate products instead of the range / on-request label.
  preorderOnly: boolean;
  priceMinBdt: number | null;
  priceMaxBdt: number | null;
  segmentId: string | null;
  tag: string | null;
  heroImage: { url: string; alt: string | null } | null;
};

/**
 * Public storefront fetch: given a list of product ids, return the lite
 * payload needed to render product cards (recently-viewed, save-for-later,
 * etc.). Out-of-stock or hidden products are silently dropped.
 */
export async function fetchProductsLite(ids: string[]): Promise<StorefrontProductLite[]> {
  const parsed = idsSchema.parse(ids);
  if (parsed.length === 0) return [];
  const products = await getProductsByIds(parsed);
  if (products.length === 0) return [];
  const heroes = await getHeroImagesFor(products.map((p) => p.id));
  return products.map((p: Product) => ({
    id: p.id,
    slug: p.slug,
    sku: p.sku,
    name: p.name,
    nameBn: p.nameBn ?? null,
    priceBdt: p.priceBdt,
    wasBdt: p.wasBdt ?? null,
    preorderOnly: p.preorderOnly ?? false,
    priceMinBdt: p.priceMinBdt ?? null,
    priceMaxBdt: p.priceMaxBdt ?? null,
    segmentId: p.segmentId ?? null,
    tag: p.tag ?? null,
    heroImage: heroes.get(p.id) ?? null,
  }));
}
