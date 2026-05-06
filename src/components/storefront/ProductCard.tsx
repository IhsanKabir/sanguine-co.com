"use client";

import type { Product } from "@/lib/schema";
import { Link } from "@/i18n/routing";
import { useLocale } from "next-intl";
import Image from "next/image";
import { formatBdt } from "@/lib/utils";
import Composition from "./Composition";
import WishHeart from "./WishHeart";
import QuickView from "./QuickView";

type Props = {
  product: Product;
  segmentTag?: string | null;
  /** Optional hero image (real photograph) — falls back to Composition art if omitted. */
  heroImage?: { url: string; alt: string | null; hoverUrl?: string } | null;
  /** Show the quick-view trigger (defaults true). Disable on tight grids. */
  quickView?: boolean;
};

export default function ProductCard({ product: p, segmentTag, heroImage, quickView = true }: Props) {
  const locale = useLocale() as "en" | "bn";
  const name = (locale === "bn" && p.nameBn) || p.name;

  const showQuickView = quickView && p.stock > 0;

  return (
    <article className="card" style={{ position: "relative" }}>
      <Link href={`/product/${p.slug}`}>
        <div style={{ position: "relative", aspectRatio: "3/4", overflow: "hidden" }} className="card-cover">
          {heroImage ? (
            <>
              <Image
                src={heroImage.url}
                alt={heroImage.alt ?? name}
                fill
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                style={{ objectFit: "cover" }}
                className="card-img-primary"
              />
              {heroImage.hoverUrl && (
                <Image
                  src={heroImage.hoverUrl}
                  alt={heroImage.alt ?? name}
                  fill
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                  style={{ objectFit: "cover" }}
                  className="card-img-hover"
                />
              )}
            </>
          ) : (
            <Composition
              cat={p.segmentId || "clothing"}
              sku={p.sku}
              name={p.name}
              tag={p.tag}
              ribbon={p.tag === "new" ? "New" : null}
              sale={p.tag === "sale"}
              style={{ aspectRatio: "3/4" }}
            />
          )}
          <WishHeart productId={p.id} />
          {showQuickView && (
            <QuickView
              product={{
                id: p.id,
                slug: p.slug,
                sku: p.sku,
                name: p.name,
                nameBn: p.nameBn,
                description: p.description,
                descriptionBn: p.descriptionBn,
                priceBdt: p.priceBdt,
                wasBdt: p.wasBdt,
                segmentId: p.segmentId,
                tag: p.tag,
                stock: p.stock,
                colors: (p.colors as string[] | null) ?? [],
                sizes: (p.sizes as string[] | null) ?? [],
                heroImage: heroImage ?? null,
              }}
              trigger="overlay"
            />
          )}
        </div>
        <div className="prod-body">
          {segmentTag && <div className="prod-meta">{segmentTag}</div>}
          <h3 className="prod-name">{name}</h3>
          <div className="prod-price">
            {p.wasBdt ? <span className="strike">{formatBdt(p.wasBdt, locale)}</span> : null}
            {formatBdt(p.priceBdt, locale)}
          </div>
        </div>
      </Link>
    </article>
  );
}
