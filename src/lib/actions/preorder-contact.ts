"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-utils";
import { EMPTY_PREFILL, getCustomerPrefill, type CustomerPrefill } from "@/lib/customer-prefill";
import { getCommerceSettings } from "@/lib/commerce";
import { expressFeeFor } from "@/lib/express-fee-store";
import { effectiveDepositPct } from "@/lib/pricing";

export interface PreorderContact {
  email: string;
  prefill: CustomerPrefill;
  /** This visitor's same-day express fee: theirs when signed in, else the standard fee. */
  expressFeeBdt: number;
  /** This piece's deposit share for delivery today or tomorrow (the form caps later dates). */
  depositPct: number;
}

// Product ids are text ("p005", "p-<base36>"), the same shape the pre-order action accepts.
const productIdSchema = z.string().min(1).max(120);

/** The piece's own deposit share, or the Admin setting; an unknown id gets the setting. */
async function depositPctFor(productId: unknown, globalPct: number): Promise<number> {
  const id = productIdSchema.safeParse(productId);
  if (!id.success) return effectiveDepositPct(null, globalPct);
  const [row] = await db.select({ pct: schema.products.preorderDepositPct })
    .from(schema.products).where(eq(schema.products.id, id.data)).limit(1);
  return effectiveDepositPct(row?.pct ?? null, globalPct);
}

/**
 * The signed-in customer's email, saved details and express fee, plus the piece's deposit share,
 * for the pre-order form that opens on the shop's stage. The shop page is cached for everyone,
 * so it asks only when the visitor taps Pre-order. A guest, or any failure, gets empty details
 * and the standard fee and share: the form then asks for an email, exactly as it does for guests
 * on the pre-order page.
 */
export async function getPreorderContact(productId?: string): Promise<PreorderContact> {
  try {
    const [user, commerce] = await Promise.all([getCurrentUser(), getCommerceSettings()]);
    const [prefill, fee, depositPct] = await Promise.all([
      getCustomerPrefill(user),
      user ? expressFeeFor(user.email ?? null, user.id) : Promise.resolve({ feeBdt: commerce.expressFeeBdt }),
      depositPctFor(productId, commerce.preorderDepositPct),
    ]);
    return { email: user?.email ?? "", prefill, expressFeeBdt: fee.feeBdt, depositPct };
  } catch (err) {
    console.error("[preorder-contact] could not read the customer's details", err);
    const c = await getCommerceSettings();
    return { email: "", prefill: EMPTY_PREFILL, expressFeeBdt: c.expressFeeBdt, depositPct: effectiveDepositPct(null, c.preorderDepositPct) };
  }
}
