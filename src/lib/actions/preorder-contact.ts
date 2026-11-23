"use server";

import { getCurrentUser } from "@/lib/auth-utils";
import { EMPTY_PREFILL, getCustomerPrefill, type CustomerPrefill } from "@/lib/customer-prefill";
import { getCommerceSettings } from "@/lib/commerce";
import { expressFeeFor } from "@/lib/express-fee-store";

export interface PreorderContact {
  email: string;
  prefill: CustomerPrefill;
  /** This visitor's same-day express fee: theirs when signed in, else the standard fee. */
  expressFeeBdt: number;
}

/**
 * The signed-in customer's email, saved details and express fee, for the pre-order form that
 * opens on the shop's stage. The shop page is cached for everyone, so it asks only when the
 * visitor taps Pre-order. A guest, or any failure, gets empty details and the standard fee:
 * the form then asks for an email, exactly as it does for guests on the pre-order page.
 */
export async function getPreorderContact(): Promise<PreorderContact> {
  try {
    const user = await getCurrentUser();
    const [prefill, fee] = await Promise.all([
      getCustomerPrefill(user),
      user ? expressFeeFor(user.email ?? null, user.id) : getCommerceSettings().then((c) => ({ feeBdt: c.expressFeeBdt })),
    ]);
    return { email: user?.email ?? "", prefill, expressFeeBdt: fee.feeBdt };
  } catch (err) {
    console.error("[preorder-contact] could not read the customer's details", err);
    const c = await getCommerceSettings();
    return { email: "", prefill: EMPTY_PREFILL, expressFeeBdt: c.expressFeeBdt };
  }
}
