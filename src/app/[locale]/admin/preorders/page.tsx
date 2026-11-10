import { setRequestLocale } from "next-intl/server";
import { listPreorderRequests } from "@/lib/actions/preorders";
import { db, schema } from "@/lib/db";
import { inArray } from "drizzle-orm";
import PreordersClient, { type LinkedOrderInfo, type RequestProductInfo } from "./PreordersClient";

type Props = { params: Promise<{ locale: string }> };

export default async function AdminPreordersPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [requests, segments] = await Promise.all([
    listPreorderRequests(),
    db.select().from(schema.segments),
  ]);

  // For converted requests, look up the linked order's status so the admin
  // can see "where is this bespoke piece in the production pipeline" without
  // jumping to /admin/orders.
  const orderIds = requests
    .map((r) => r.convertedOrderId)
    .filter((id): id is string => !!id);
  const orders = orderIds.length > 0
    ? await db.select({
        id: schema.orders.id,
        number: schema.orders.number,
        status: schema.orders.status,
        shippingCourier: schema.orders.shippingCourier,
        shippingTracking: schema.orders.shippingTracking,
      }).from(schema.orders).where(inArray(schema.orders.id, orderIds))
    : [];
  const linkedOrders: Record<string, LinkedOrderInfo> = Object.fromEntries(
    orders.map((o) => [o.id, o]),
  );

  // Product names (for the WhatsApp quote) and the private usual price that
  // pre-fills the quote field.
  const productIds = [...new Set(requests.map((r) => r.productId).filter((id): id is string => !!id))];
  const linkedProducts = productIds.length > 0
    ? await db.select({
        id: schema.products.id,
        name: schema.products.name,
        nameBn: schema.products.nameBn,
        usualPriceBdt: schema.products.preorderPriceBdt,
      }).from(schema.products).where(inArray(schema.products.id, productIds))
    : [];
  const products: Record<string, RequestProductInfo> = Object.fromEntries(
    linkedProducts.map((p) => [p.id, p]),
  );

  return <PreordersClient requests={requests} segments={segments} linkedOrders={linkedOrders} products={products} />;
}
