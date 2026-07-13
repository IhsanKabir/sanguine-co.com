import { getBrand } from "@/lib/actions/admin";
import { getCommerceSettings } from "@/lib/commerce";
import SettingsClient from "./SettingsClient";
import { requirePermission } from "@/lib/auth-utils";

export default async function AdminSettingsPage() {
  await requirePermission("settings");
  const [brand, commerce] = await Promise.all([getBrand(), getCommerceSettings()]);
  return (
    <SettingsClient initialCommerce={commerce} initialBrand={brand || {
      name: "Sanguine",
      tagline: "Garments, flora & small ceremonies",
      email: "concierge@sanguine-co.com",
      announcement: "Complimentary shipping over ৳3,000 · Cash on Delivery available nationwide",
    }} />
  );
}
