"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useWishlist } from "@/lib/wishlist-context";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { Link } from "@/i18n/routing";
import type { StageItem } from "@/lib/stage-items";
import Stage from "@/components/storefront/Stage";

interface WishlistClientProps {
  /** Every piece on sale; the saved ones are kept here, in the browser. */
  items: StageItem[];
  expressCutoffMin: number;
}

/** The saved pieces on the shop's stage (tap one: its panel and Pre-order open in place). */
export default function WishlistClient({ items, expressCutoffMin }: WishlistClientProps) {
  const t = useTranslations();
  const { items: saved, hydrated } = useWishlist();
  const ready = useHydrated();
  const list = useMemo(() => items.filter((i) => saved.has(i.id)), [items, saved]);

  if (!ready || !hydrated) return <section className="search-quiet" aria-busy="true"><p>{t("common.loading")}</p></section>;

  if (list.length === 0) {
    return (
      <section className="search-quiet" aria-labelledby="wish-title">
        <div className="stage-ghost" aria-hidden="true">{t("wishlist.saved")}</div>
        <div className="stage-kicker"><span>01</span><h1 id="wish-title">{t("wishlist.emptyHeading")}</h1></div>
        <p className="search-quiet-hint">{t("wishlist.empty")}</p>
        <Link href="/" className="btn btn-primary">{t("wishlist.wander")}</Link>
      </section>
    );
  }

  return (
    <Stage items={list} ghost={t("wishlist.saved")} title={t("wishlist.title")}
      countLabel={t("wishlist.count", { count: list.length })} segmentLabel={t("wishlist.saved")}
      expressCutoffMin={expressCutoffMin} />
  );
}
