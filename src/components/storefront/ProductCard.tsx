"use client";

import type { Product } from "@/lib/schema";
import { Link } from "@/i18n/routing";
import { useLocale } from "next-intl";
import Image from "next/image";
import { formatBdt } from "@/lib/utils";
import Composition from "./Composition";
import WishHeart from "./WishHeart";
import QuickView from "./QuickView";

const COLOR_MAP: Record<string, string> = {
  black: "#1a1a1a", white: "#f5f5f5", ivory: "#f4ecd8", cream: "#f4ecd8",
  beige: "#d4c5a9", sand: "#c2a882", tan: "#c4956a", brown: "#7b4f2e",
  aubergine: "#3d1d5e", plum: "#6b2d5e", violet: "#7c3aed", lavender: "#c4b5fd",
  mauve: "#9b7fa6", rose: "#e8a0b4", blush: "#fba8b8", coral: "#f08070",
  red: "#dc2626", burgundy: "#800020", wine: "#722f37", navy: "#1e3a5f",
  blue: "#3b82f6", cobalt: "#0047ab", teal: "#0d9488", slate: "#64748b",
  green: "#16a34a", sage: "#87a878", olive: "#6b6b2a", forest: "#1a4d2e",
  emerald: "#059669", yellow: "#fbbf24", gold: "#c9a227", mustard: "#d4a017",
  amber: "#d97706", grey: "#9ca3af", gray: "#9ca3af", charcoal: "#4b5563",
  silver: "#c0c0c0", obsidian: "#1a1a2e",
};

function colorToHex(name: string): string {
  return COLOR_MAP[name.toLowerCase()] ?? "#d5cfc6";
}

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
  const colors = (p.colors as string[] | null) ?? [];

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
          {colors.length > 0 && (
            <div className="card-color-dots">
              {colors.slice(0, 5).map((c) => (
                <span key={c} className="card-color-dot" style={{ background: colorToHex(c) }} title={c} />
              ))}
              {colors.length > 5 && <span className="card-color-dot-more">+{colors.length - 5}</span>}
            </div>
          )}
        </div>
      </Link>
    </article>
  );
}
