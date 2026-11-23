"use server";

import { z } from "zod";
import { db, schema } from "@/lib/db";
import { requirePermission } from "@/lib/auth-utils";
import { EXPRESS_OVERRIDES_KEY, MAX_PERSONAL_EXPRESS_FEE_BDT, readExpressOverrides, type ExpressOverrides } from "@/lib/express-fee-store";

const setSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  /** null removes the personal fee (the customer follows the rules again); 0 = free. */
  feeBdt: z.number().int().min(0).max(MAX_PERSONAL_EXPRESS_FEE_BDT).nullable(),
});

type Result = { ok: true; overrides: ExpressOverrides } | { ok: false; error: string };

/**
 * Sets or clears one customer's own same-day express fee (Admin, Customers and Settings).
 * Read-modify-write of one small JSON map: two staff saving at the very same moment could
 * overwrite each other, an acceptable risk for a handful of entries changed by hand.
 */
export async function setPersonalExpressFee(input: z.infer<typeof setSchema>): Promise<Result> {
  await requirePermission("customers");
  const parsed = setSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter a valid email and a whole number of taka (0 = free)." };
  const { email, feeBdt } = parsed.data;
  try {
    const current = await readExpressOverrides();
    const next: ExpressOverrides = { ...current };
    if (feeBdt === null) delete next[email];
    else next[email] = feeBdt;
    await db.insert(schema.siteSettings).values({ key: EXPRESS_OVERRIDES_KEY, value: next })
      .onConflictDoUpdate({ target: schema.siteSettings.key, set: { value: next, updatedAt: new Date() } });
    return { ok: true, overrides: next };
  } catch (err) {
    console.error("[express-fees] could not save a personal fee", err);
    return { ok: false, error: "Could not save just now. Please try again in a moment." };
  }
}

export async function listPersonalExpressFees(): Promise<ExpressOverrides> {
  await requirePermission("customers");
  return readExpressOverrides();
}
