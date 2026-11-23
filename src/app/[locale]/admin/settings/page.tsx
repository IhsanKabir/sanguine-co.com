import { getBrand } from "@/lib/actions/admin";
import { getCommerceSettings } from "@/lib/commerce";
import SettingsClient from "./SettingsClient";
import { sslcommerzConfig } from "@/lib/payments/sslcommerz";
import { requirePermission } from "@/lib/auth-utils";
import { isSmsConfigured } from "@/lib/sms/ssl-wireless";
import { readExpressOverrides } from "@/lib/express-fee-store";

export default async function AdminSettingsPage() {
  const ctx = await requirePermission("settings");
  // Personal express fees name customers by email: only for staff who may see Customers.
  const canSeeCustomers = ctx.has("customers");
  const [brand, commerce, personalExpress] = await Promise.all([
    getBrand(),
    getCommerceSettings(),
    canSeeCustomers ? readExpressOverrides().catch(() => ({})) : Promise.resolve(null),
  ]);
  return (
    <SettingsClient
      gateway={(() => {
        const cfg = sslcommerzConfig();
        return cfg ? { connected: true, live: cfg.live } : { connected: false, live: false };
      })()}
      smsConnected={isSmsConfigured()}
      personalExpress={personalExpress}
      initialCommerce={commerce} initialBrand={brand || {
      name: "Sanguine",
      tagline: "Garments, flora & small ceremonies",
      email: "concierge@sanguine-co.com",
      announcement: "Complimentary shipping over ৳5,000 · Cash on Delivery available nationwide",
    }} />
  );
}
