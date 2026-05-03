"use client";

import { useWishlist } from "@/lib/wishlist-context";
import type { Product, Segment } from "@/lib/schema";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import ProductCard from "@/components/storefront/ProductCard";
import Icon from "@/components/storefront/Icon";
import OceanicBand from "@/components/storefront/OceanicBand";

export default function WishlistClient({ products, segments }: { products: Product[]; segments: Segment[] }) {
  const t = useTranslations();
  const { items, hydrated } = useWishlist();
  if (!hydrated) return <p>Loading…</p>;

  const list = products.filter((p) => items.has(p.id));
  return (
    <>
      <OceanicBand
        kicker={t("wishlist.saved")}
        name={t("wishlist.title")}
        blurb={list.length === 0 ? t("wishlist.empty") : t("wishlist.count", { count: list.length })}
      />
      {list.length === 0 ? (
        <div className="empty-state">
          <Icon name="heart" size={36} />
          <h3>{t("wishlist.emptyHeading")}</h3>
          <Link href="/" className="btn btn-primary" style={{ marginTop: 14 }}>
            {t("wishlist.wander")}
          </Link>
        </div>
      ) : (
        <div className="grid grid-4">
          {list.map((p) => {
            const seg = segments.find((s) => s.id === p.segmentId);
            return <ProductCard key={p.id} product={p} segmentTag={seg?.tag} />;
          })}
        </div>
      )}
    </>
  );
}
