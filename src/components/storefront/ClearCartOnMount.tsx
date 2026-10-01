"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart-context";

/**
 * Online-payment orders keep the bag until the shopper is back from the
 * gateway (a failed or cancelled payment must not lose it). Once the order
 * page is reached, the order exists and the bag is emptied here.
 */
export default function ClearCartOnMount() {
  const { clear, hydrated } = useCart();
  useEffect(() => {
    if (hydrated) clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);
  return null;
}
