"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_SHIPPING_RULES, type ShippingRules } from "@/lib/pricing";

/**
 * The saved shipping rules (Admin → Settings), handed down from the locale
 * layout so browser-side components — cart drawer, cart page, checkout,
 * loyalty card — quote exactly what createCodOrder will charge.
 */
const ShippingRulesContext = createContext<ShippingRules>(DEFAULT_SHIPPING_RULES);

export function ShippingRulesProvider({ rules, children }: { rules: ShippingRules; children: ReactNode }) {
  return <ShippingRulesContext.Provider value={rules}>{children}</ShippingRulesContext.Provider>;
}

export function useShippingRules(): ShippingRules {
  return useContext(ShippingRulesContext);
}
