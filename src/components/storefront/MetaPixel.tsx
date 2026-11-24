"use client";

import { useEffect, useState } from "react";
import { usePathname } from "@/i18n/routing";
import { loadMetaPixel, metaPixelId, trackPixel } from "@/lib/meta-pixel";
import { readConsent } from "./CookieConsent";

const PIXEL_ID = metaPixelId();

/**
 * Loads the Meta Pixel once the visitor accepts cookies, then sends a
 * PageView on each page. Without consent or without an ID it loads nothing,
 * so speed tests and declining visitors never fetch Meta's script.
 */
export default function MetaPixel() {
  const pathname = usePathname();
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    const update = () => setConsented(readConsent()?.choice === "accept");
    update();
    window.addEventListener("storage", update);
    return () => window.removeEventListener("storage", update);
  }, []);

  useEffect(() => {
    if (!PIXEL_ID || !consented) return;
    loadMetaPixel(PIXEL_ID);
    trackPixel("PageView");
  }, [pathname, consented]);

  return null;
}
