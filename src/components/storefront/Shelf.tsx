"use client";

import { useRef } from "react";
import { Link } from "@/i18n/routing";
import type { Cutout } from "@/lib/cutouts";

export interface ShelfItem {
  slug: string;
  name: string;
  price: string;
  /** The cut-out, when there is one; otherwise the product's first photo, shown round. */
  cutout: Cutout | null;
  photo: string | null;
}

interface Props {
  items: ShelfItem[];
  labels: { prev: string; next: string };
}

const SCROLL_SHARE = 0.8;

/**
 * Every bouquet standing in a row on one line, "shop the look" style. A rail that scrolls,
 * so it works with five products or fifty; on wide screens pointing at one lifts it and
 * fades the rest.
 */
export default function Shelf({ items, labels }: Props) {
  const row = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => {
    const el = row.current;
    if (!el) return;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * el.clientWidth * SCROLL_SHARE, behavior: still ? "auto" : "smooth" });
  };

  return (
    <div className="shelf-wrap">
      <div className="shelf-nav">
        <button type="button" className="rail-ctrl" aria-label={labels.prev} onClick={() => scroll(-1)}>←</button>
        <button type="button" className="rail-ctrl" aria-label={labels.next} onClick={() => scroll(1)}>→</button>
      </div>
      <div className="shelf" ref={row}>
        {items.map((it) => (
          <Link key={it.slug} href={`/product/${it.slug}`} className="shelf-item">
            {it.cutout ? (
              // eslint-disable-next-line @next/next/no-img-element -- transparent WebP, small size only
              <img src={it.cutout.small} width={Math.round(it.cutout.width / 2)} height={Math.round(it.cutout.height / 2)} alt="" loading="lazy" decoding="async" />
            ) : it.photo ? (
              // eslint-disable-next-line @next/next/no-img-element -- a product photo without a cut-out, shown round
              <img src={it.photo} alt="" className="shelf-photo" loading="lazy" decoding="async" />
            ) : (
              <span className="shelf-photo shelf-empty" />
            )}
            <span className="shelf-cap">
              <b>{it.name}</b>
              {it.price}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
