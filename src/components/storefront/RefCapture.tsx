"use client";

import { useEffect } from "react";
import { normalizeReferralCode } from "@/lib/referral";

/** Where a shared link's code waits until the pre-order form (ProductPreorderForm reads it). */
export const REF_STORAGE_KEY = "sanguine-ref";

/**
 * A shared link (sanguine-co.com/en?ref=SSG-ABC234) can land on any page; the code is kept
 * in this browser so the pre-order form fills it in, with no typing. Renders nothing.
 */
export default function RefCapture() {
  useEffect(() => {
    const code = normalizeReferralCode(new URLSearchParams(window.location.search).get("ref"));
    if (!code) return;
    try {
      window.localStorage.setItem(REF_STORAGE_KEY, code);
    } catch {
      // Storage blocked (private window): the link on the form page still works.
    }
  }, []);
  return null;
}
