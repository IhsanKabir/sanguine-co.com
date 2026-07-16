"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { fetchProductsLite, type StorefrontProductLite } from "@/lib/actions/storefront-fetch";
import { priceDisplay, priceDisplayText } from "@/lib/pricing";
import { formatBdt } from "@/lib/utils";
import Composition from "./Composition";
import { readRecentlyViewed } from "./RecentlyViewedTracker";

type Props = {
  /** ID of a product to exclude from the strip (the current PDP). */
  excludeId?: string;
};

export default function RecentlyViewedStrip({ excludeId }: Props) {
  const locale = useLocale() as "en" | "bn";
  const t = useTranslations();
  const [items, setItems] = useState<StorefrontProductLite[] | null>(null);

  useEffect(() => {
    const ids = readRecentlyViewed().filter((id) => id !== excludeId).slice(0, 6);
    if (ids.length === 0) { setItems([]); return; }
    fetchProductsLite(ids)
      .then(setItems)
      .catch(() => setItems([]));
  }, [excludeId]);

  // Pre-resolve the ids check
  if (items === null || items.length === 0) return null;

  return (
    <section className="section" style={{ paddingTop: 28 }}>
      <div className="section-hd" data-reveal>
        <div>
          <div className="kicker">RECENTLY VIEWED</div>
          <h2>Pieces you have looked at.</h2>
          <div className="ornament-rule" />
        </div>
      </div>
      <div className="grid grid-4">
        {items.map((p) => {
          const name = (locale === "bn" && p.nameBn) || p.name;
          // Same pricing rules as ProductCard — raw priceBdt would show ৳0
          // for quotation/preorder products.
          const display = priceDisplay(p);
          return (
            <article key={p.id} className="card">
              <Link href={`/product/${p.slug}`}>
                <div style={{ position: "relative", aspectRatio: "3/4", overflow: "hidden" }}>
                  {p.heroImage ? (
                    <Image
                      src={p.heroImage.url}
                      alt={p.heroImage.alt ?? name}
                      fill
                      sizes="(max-width: 768px) 50vw, 25vw"
                      style={{ objectFit: "cover" }}
                    />
                  ) : (
                    <Composition
                      cat={p.segmentId || "clothing"}
                      sku={p.sku}
                      name={p.name}
                      tag={p.tag}
                      style={{ aspectRatio: "3/4" }}
                    />
                  )}
                </div>
                <div className="prod-body">
                  <h3 className="prod-name">{name}</h3>
                  <div className="prod-price">
                    {display.kind === "fixed" && p.wasBdt && p.wasBdt > display.amountBdt ? (
                      <span className="strike">{formatBdt(p.wasBdt, locale)}</span>
                    ) : null}
                    {display.kind === "quote" ? t("pdp.priceOnQuote") : priceDisplayText(display, locale)}
                  </div>
                </div>
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}
