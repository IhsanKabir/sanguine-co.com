"use client";

import { useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { useCart, type CartItem } from "@/lib/cart-context";
import { formatBdt } from "@/lib/utils";
import Composition from "./Composition";
import Icon from "./Icon";

export type QuickViewProduct = {
  id: string;
  slug: string;
  sku: string;
  name: string;
  nameBn: string | null;
  description: string | null;
  descriptionBn: string | null;
  priceBdt: number;
  wasBdt: number | null;
  segmentId: string | null;
  tag: string | null;
  stock: number;
  colors: string[];
  sizes: string[];
  heroImage: { url: string; alt: string | null } | null;
};

type Props = {
  product: QuickViewProduct;
  /** Visible-button mode: a small "Quick view" pill rendered above the card. */
  trigger?: "pill" | "icon" | "overlay";
};

/**
 * Hover-overlay quick-view trigger + the modal itself. Drops onto any product
 * card so a customer can grab the piece without leaving the listing page.
 */
export default function QuickView({ product, trigger = "pill" }: Props) {
  const [open, setOpen] = useState(false);

  if (trigger === "overlay") {
    return (
      <>
        <button
          type="button"
          className="qv-overlay"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
          aria-label={`Quick view ${product.name}`}
          data-quick-view-trigger
        >
          Add to bag
        </button>
        {open && <QuickViewModal product={product} onClose={() => setOpen(false)} />}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        className={trigger === "icon" ? "icon-btn" : "btn btn-ghost btn-sm"}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
        aria-label={`Quick view of ${product.name}`}
        style={trigger === "icon"
          ? { position: "absolute", top: 10, right: 10, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(4px)" }
          : { position: "absolute", top: 10, left: 10, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(4px)", padding: "5px 12px", fontSize: 10, letterSpacing: ".15em", textTransform: "uppercase", border: "1px solid var(--line)", color: "var(--purple-900)", zIndex: 2 }
        }
        data-quick-view-trigger
      >
        {trigger === "icon" ? <Icon name="search" size={14} /> : "Quick view"}
      </button>

      {open && <QuickViewModal product={product} onClose={() => setOpen(false)} />}
    </>
  );
}

function QuickViewModal({ product, onClose }: { product: QuickViewProduct; onClose: () => void }) {
  const locale = useLocale() as "en" | "bn";
  const t = useTranslations();
  const { add } = useCart();
  const [color, setColor] = useState<string>(product.colors[0] || "");
  const [size, setSize] = useState<string>(product.sizes[0] || "");
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const name = (locale === "bn" && product.nameBn) || product.name;
  const description = (locale === "bn" && product.descriptionBn) || product.description || "";

  const onAdd = () => {
    const item: CartItem = {
      productId: product.id,
      slug: product.slug,
      sku: product.sku,
      name,
      priceBdt: product.priceBdt,
      cat: product.segmentId || "clothing",
      qty,
      color: color || null,
      size: size || null,
    };
    add(item);
    setAdded(true);
    setTimeout(() => { setAdded(false); onClose(); }, 1200);
  };

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className="seg-modal" style={{ width: 880, maxWidth: "calc(100vw - 32px)", maxHeight: "90vh", overflow: "auto" }}>
        <div className="seg-modal-hd">
          <h3 className="serif">{name}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
        </div>

        <div className="qv-grid">
          <div style={{ position: "relative", aspectRatio: "3/4", overflow: "hidden", background: "#f4ecd8" }}>
            {product.heroImage ? (
              <Image
                src={product.heroImage.url}
                alt={product.heroImage.alt ?? name}
                fill
                sizes="440px"
                style={{ objectFit: "cover" }}
              />
            ) : (
              <Composition
                cat={product.segmentId || "clothing"}
                sku={product.sku}
                name={product.name}
                tag={product.tag}
                style={{ width: "100%", height: "100%" }}
              />
            )}
          </div>

          <div style={{ padding: "24px 28px" }}>
            <div style={{ fontSize: 11, letterSpacing: ".3em", color: "var(--gold-deep)", marginBottom: 8 }}>
              {product.sku}
            </div>
            <div className="pdp-price" style={{ marginBottom: 12 }}>
              <span className="now">{formatBdt(product.priceBdt, locale)}</span>
              {product.wasBdt && <span className="was">{formatBdt(product.wasBdt, locale)}</span>}
            </div>
            {description && (
              <p style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.7, marginBottom: 18 }}>
                {description.length > 220 ? description.slice(0, 220) + "…" : description}
              </p>
            )}

            {product.colors.length > 0 && (
              <>
                <div className="pdp-label">Colour {color && <span style={{ color: "var(--ink-soft)" }}>· {color}</span>}</div>
                <div className="swatch-row" style={{ marginBottom: 12 }}>
                  {product.colors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={"swatch size-pill " + (c === color ? "active" : "")}
                      onClick={() => setColor(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </>
            )}

            {product.sizes.length > 0 && (
              <>
                <div className="pdp-label">Size {size && <span style={{ color: "var(--ink-soft)" }}>· {size}</span>}</div>
                <div className="swatch-row" style={{ marginBottom: 12 }}>
                  {product.sizes.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={"swatch size-pill " + (s === size ? "active" : "")}
                      onClick={() => setSize(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="pdp-label">Quantity</div>
            <div className="qty">
              <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Decrease">−</button>
              <span aria-live="polite">{qty}</span>
              <button type="button" onClick={() => setQty(qty + 1)} aria-label="Increase">+</button>
            </div>

            {product.stock === 0 ? (
              <div style={{ marginTop: 14, padding: 10, background: "var(--purple-50)", border: "1px solid var(--purple-200)", fontSize: 13, color: "var(--ink-soft)" }}>
                Currently out of stock. Open the full piece to be notified when it returns.
              </div>
            ) : (
              <button
                type="button"
                onClick={onAdd}
                className="btn btn-primary btn-block"
                style={{ marginTop: 14 }}
                disabled={added}
              >
                <Icon name={added ? "check" : "bag"} size={14} />
                {added ? "Added" : `${t("pdp.addToBag")} · ${formatBdt(product.priceBdt * qty, locale)}`}
              </button>
            )}

            <div style={{ marginTop: 14, textAlign: "center" }}>
              <Link href={`/product/${product.slug}`} className="link" onClick={onClose} style={{ fontSize: 13 }}>
                See the full piece →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
