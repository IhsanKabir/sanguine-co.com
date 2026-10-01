import { getBrand } from "@/lib/actions/admin";
import { getCommerceSettings } from "@/lib/commerce";
import SettingsClient from "./SettingsClient";
import { sslcommerzConfig } from "@/lib/payments/sslcommerz";
import { requirePermission } from "@/lib/auth-utils";

export default async function AdminSettingsPage() {
  await requirePermission("settings");
  const [brand, commerce] = await Promise.all([getBrand(), getCommerceSettings()]);
  return (
    <SettingsClient
      gateway={(() => {
        const cfg = sslcommerzConfig();
        return cfg ? { connected: true, live: cfg.live } : { connected: false, live: false };
      })()}
      initialCommerce={commerce} initialBrand={brand || {
      name: "Sanguine",
      tagline: "Garments, flora & small ceremonies",
      email: "concierge@sanguine-co.com",
      announcement: "Complimentary shipping over ৳5,000 · Cash on Delivery available nationwide",
    }} />
  );
}
