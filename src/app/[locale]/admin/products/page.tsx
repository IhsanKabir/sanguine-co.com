import { db, schema } from "@/lib/db";
import { asc } from "drizzle-orm";
import ProductsClient from "./ProductsClient";
import { requirePermission } from "@/lib/auth-utils";
import { variantsFor } from "@/lib/variant-stock";

export default async function AdminProductsPage() {
  await requirePermission("products");
  const [segments, products] = await Promise.all([
    db.select().from(schema.segments).orderBy(asc(schema.segments.sortOrder)),
    db.select().from(schema.products).orderBy(schema.products.id),
  ]);
  const variants = await variantsFor(products.map((p) => p.id)).catch(() => new Map());
  return <ProductsClient segments={segments} products={products} trackedIds={[...variants.keys()]} />;
}
