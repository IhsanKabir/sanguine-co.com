import { setRequestLocale } from "next-intl/server";
import { db, schema } from "@/lib/db";
import { eq, asc, inArray } from "drizzle-orm";
import { requirePermission } from "@/lib/auth-utils";
import ManualOrderForm from "./ManualOrderForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "New manual order",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ locale: string }> };

export default async function NewManualOrderPage({ params }: Props) {
  await requirePermission("orders");
  const { locale } = await params;
  setRequestLocale(locale);

  // Pull only live products in visible segments: same filter as the storefront.
  const visibleSegmentIds = (
    await db.select({ id: schema.segments.id }).from(schema.segments).where(eq(schema.segments.hidden, false))
  ).map((s) => s.id);

  const products = visibleSegmentIds.length > 0
    ? await db.select({
        id: schema.products.id,
        name: schema.products.name,
        sku: schema.products.sku,
        priceBdt: schema.products.priceBdt,
        stock: schema.products.stock,
        segmentId: schema.products.segmentId,
        colors: schema.products.colors,
        sizes: schema.products.sizes,
      }).from(schema.products)
        .where(inArray(schema.products.segmentId, visibleSegmentIds))
        .orderBy(asc(schema.products.name))
    : [];

  return <ManualOrderForm products={products} />;
}
