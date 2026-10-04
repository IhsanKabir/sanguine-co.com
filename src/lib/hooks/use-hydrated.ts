"use client";

import { useSyncExternalStore } from "react";

const noSubscribe = () => () => {};

/**
 * False on the server and during this component's hydration render, true
 * after. Use it to gate anything read from localStorage-backed state (cart,
 * wishlist) so the first client render matches the server HTML.
 *
 * The providers' own `hydrated` flag is not enough on its own: a component
 * inside a Suspense boundary can hydrate AFTER the provider's effect has
 * already run, render the localStorage state straight away, and mismatch
 * the server's empty markup (seen on shop grids: the wishlist heart).
 * On client-side navigations this is true immediately, so nothing flickers.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(noSubscribe, () => true, () => false);
}
