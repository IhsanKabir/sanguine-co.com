"use client";

import { useEffect } from "react";
import { STAFF_COOKIE, STAFF_COOKIE_MAX_AGE_S } from "@/lib/staff";

/**
 * Marks this browser as the shop's own, so its storefront visits are flagged
 * and left out of the traffic numbers. Rendered by the Admin layout, which
 * only renders after the admin sign-in check.
 */
export default function StaffMarker() {
  useEffect(() => {
    document.cookie = `${STAFF_COOKIE}=1; Max-Age=${STAFF_COOKIE_MAX_AGE_S}; Path=/; SameSite=Lax; Secure`;
  }, []);
  return null;
}
