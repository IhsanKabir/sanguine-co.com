import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { db, schema } from "@/lib/db";
import WishlistClient from "./WishlistClient";

export const dynamic = "force-dynamic";

// Wishlist content is per-visitor (localStorage). Indexable URL produces an
// empty page for Googlebot — wastes crawl budget and confuses page-type
// classification. Excluded from the sitemap as well.
export const metadata: Metadata = {
  title: "Wishlist",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ locale: string }> };

export default async function WishlistPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [products, segments] = await Promise.all([
    db.select().from(schema.products).catch(() => []),
    db.select().from(schema.segments).catch(() => []),
  ]);
  return (
    <section className="section" style={{ paddingTop: 28 }}>
      <WishlistClient products={products} segments={segments} />
    </section>
  );
}
