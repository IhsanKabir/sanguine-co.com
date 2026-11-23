"use server";

import { getCurrentUser } from "@/lib/auth-utils";
import { EMPTY_PREFILL, getCustomerPrefill, type CustomerPrefill } from "@/lib/customer-prefill";

/**
 * The signed-in customer's email and saved details, for the pre-order form that opens on
 * the shop's stage. The shop page is cached for everyone, so it asks only when the visitor
 * taps Pre-order. A guest, or any failure, gets empty details: the form then asks for an
 * email, exactly as it does for guests on the pre-order page.
 */
export async function getPreorderContact(): Promise<{ email: string; prefill: CustomerPrefill }> {
  try {
    const user = await getCurrentUser();
    return { email: user?.email ?? "", prefill: await getCustomerPrefill(user) };
  } catch (err) {
    console.error("[preorder-contact] could not read the customer's details", err);
    return { email: "", prefill: EMPTY_PREFILL };
  }
}
