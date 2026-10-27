"use client";

import { useEffect } from "react";
import { track } from "@/lib/actions/track";
import { readConsent } from "./CookieConsent";

/**
 * Gated product-view tracker for the PDP. Only fires `product_view` to the
 * events table after the visitor has accepted analytics cookies (PDPO 2025).
 * Receives the validated product id so we never write a raw slug into the
 * events table: matches the analytics schema.
 */
export default function ProductViewTracker({ productId, path }: { productId: string; path: string }) {
  useEffect(() => {
    if (readConsent()?.choice !== "accept") return;
    track({ type: "product_view", productId, path }).catch(() => {});
  }, [productId, path]);
  return null;
}
