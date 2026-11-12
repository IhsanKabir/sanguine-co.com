import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { parseShippingAddress } from "@/lib/schema";

/**
 * Contact and address details to pre-fill checkout and preorder forms, so a
 * returning customer never types them twice.
 *
 * For a signed-in customer the sources are, in order: their profile, their
 * default address, then the details they typed on their latest preorder
 * request (many customers never save a profile). Guests get the empty shape;
 * the forms remember a guest's details in their own browser instead.
 */
export type CustomerPrefill = {
  fullName: string;
  email: string;
  phone: string;
  line1: string;
  area: string;
  city: string;
  postcode: string;
};

const DEFAULT_CITY = "Dhaka";

export const EMPTY_PREFILL: CustomerPrefill = {
  fullName: "", email: "", phone: "", line1: "", area: "", city: DEFAULT_CITY, postcode: "",
};

export async function getCustomerPrefill(user: { id: string; email?: string | null } | null): Promise<CustomerPrefill> {
  if (!user) return EMPTY_PREFILL;

  const [profileRow, defaultAddr, lastRequest] = await Promise.all([
    db.select()
      .from(schema.customerProfiles)
      .where(eq(schema.customerProfiles.id, user.id))
      .limit(1)
      .catch(() => []),
    db.select()
      .from(schema.addresses)
      .where(and(eq(schema.addresses.customerId, user.id), eq(schema.addresses.isDefault, true)))
      .limit(1)
      .catch(() => []),
    db.select({
      customerName: schema.preorderRequests.customerName,
      customerPhone: schema.preorderRequests.customerPhone,
      deliveryAddress: schema.preorderRequests.deliveryAddress,
    })
      .from(schema.preorderRequests)
      .where(eq(schema.preorderRequests.customerId, user.id))
      .orderBy(desc(schema.preorderRequests.createdAt))
      .limit(1)
      .catch(() => []),
  ]);

  const profile = profileRow[0] ?? null;
  const addr = defaultAddr[0] ?? null;
  const last = lastRequest[0] ?? null;
  const lastAddr = parseShippingAddress(last?.deliveryAddress);

  return {
    fullName: profile?.fullName || addr?.fullName || last?.customerName || "",
    email: user.email ?? "",
    phone: profile?.phone || addr?.phone || last?.customerPhone || "",
    line1: addr?.line1 || lastAddr.line1 || "",
    area: addr?.area || lastAddr.area || "",
    city: addr?.city || lastAddr.city || DEFAULT_CITY,
    postcode: addr?.postcode || lastAddr.postcode || "",
  };
}
