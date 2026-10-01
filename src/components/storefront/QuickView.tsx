"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { useCart, type CartItem } from "@/lib/cart-context";
import { formatBdt } from "@/lib/utils";
import Composition from "./Composition";
import Icon from "./Icon";
import { getOptionStock } from "@/lib/actions/storefront-fetch";
import { colorSoldOut, sizeSoldOut, stockOf, type OptionStock } from "./option-availability";

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
  const t = useTranslations();
  const [open, setOpen] = useState(false);

  if (trigger === "overlay") {
    return (
      <>
        <button
          type="button"
          className="qv-overlay"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
          aria-label={t("quickView.openFor", { name: product.name })}
          data-quick-view-trigger
        >
          {t("quickView.addToBag")}
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
        aria-label={t("quickView.openFor", { name: product.name })}
        style={trigger === "icon"
          ? { position: "absolute", top: 10, right: 10, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(4px)" }
          : { position: "absolute", top: 10, left: 10, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(4px)", padding: "5px 12px", fontSize: 10, letterSpacing: ".15em", textTransform: "uppercase", border: "1px solid var(--line)", color: "var(--purple-900)", zIndex: 2 }
        }
        data-quick-view-trigger
      >
        {trigger === "icon" ? <Icon name="search" size={14} /> : t("quickView.open")}
      </button>

      {open && <QuickViewModal product={product} onClose={() => setOpen(false)} />}
    </>
  );
}

function QuickViewModal({ product, onClose }: { product: QuickViewProduct; onClose: () => void }) {
  const locale = useLocale() as "en" | "bn";
  const t = useTranslations();
  const { add } = useCart();
  const { colors, sizes } = product;
  const [color, setColorState] = useState<string>(colors[0] || "");
  // Same rule as the product page: no size is assumed unless there is only one.
  const [size, setSizeState] = useState<string>(sizes.length === 1 ? sizes[0] : "");
  const [sizeHint, setSizeHint] = useState(false);
  const needsSize = sizes.length > 0 && !size;
  const [qty, setQty] = useState(1);

  // Per size/colour stock, fetched when the modal opens (grid pages are
  // cached and don't carry it). Until it arrives every option looks open;
  // checkout checks again either way.
  const [optStock, setOptStock] = useState<OptionStock>(null);
  useEffect(() => {
    let live = true;
    getOptionStock(product.id).then((m) => {
      if (!live || !m) return;
      setOptStock(m);
      // Same defaults as the product page, now that availability is known.
      setColorState((c) => (colorSoldOut(m, sizes, c) ? colors.find((x) => !colorSoldOut(m, sizes, x)) ?? c : c));
    }).catch(() => {});
    return () => { live = false; };
  }, [product.id, colors, sizes]);

  const setColor = (c: string) => {
    if (colorSoldOut(optStock, sizes, c)) return;
    setColorState(c);
    if (size && sizeSoldOut(optStock, colors, c, size)) setSizeState("");
    setQty(1);
  };
  const setSize = (s: string) => {
    if (sizeSoldOut(optStock, colors, color, s)) return;
    setSizeState(s);
    setSizeHint(false);
    setQty(1);
  };
  const chosen = (colors.length === 0 || color) && (sizes.length === 0 || size);
  const optionLeft = chosen ? stockOf(optStock, color, size) : null;
  const optionSoldOut = optionLeft !== null && optionLeft <= 0;
  const [added, setAdded] = useState(false);

  const name = (locale === "bn" && product.nameBn) || product.name;
  const description = (locale === "bn" && product.descriptionBn) || product.description || "";

  const onAdd = () => {
    if (needsSize) { setSizeHint(true); return; }
    if (optionSoldOut) return;
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
          <button className="icon-btn" onClick={onClose} aria-label={t("common.close")}><Icon name="x" /></button>
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
                <div className="pdp-label">{t("common.colour")} {color && <span style={{ color: "var(--ink-soft)" }}>· {color}</span>}</div>
                <div className="swatch-row" style={{ marginBottom: 12 }}>
                  {product.colors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={"swatch size-pill " + (c === color ? "active" : "") + (colorSoldOut(optStock, sizes, c) ? " sold-out" : "")}
                      disabled={colorSoldOut(optStock, sizes, c)}
                      title={colorSoldOut(optStock, sizes, c) ? t("pdp.optionSoldOut") : undefined}
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
                <div className="pdp-label">{t("common.size")} {size && <span style={{ color: "var(--ink-soft)" }}>· {size}</span>}</div>
                <div className="swatch-row" style={{ marginBottom: 12 }}>
                  {product.sizes.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={"swatch size-pill " + (s === size ? "active" : "") + (sizeSoldOut(optStock, colors, color, s) ? " sold-out" : "")}
                      aria-pressed={s === size}
                      disabled={sizeSoldOut(optStock, colors, color, s)}
                      title={sizeSoldOut(optStock, colors, color, s) ? t("pdp.optionSoldOut") : undefined}
                      onClick={() => setSize(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                {sizeHint && needsSize && (
                  <div className="pdp-size-hint" role="alert">{t("pdp.chooseSizeFirst")}</div>
                )}
              </>
            )}

            <div className="pdp-label">{t("common.quantity")}</div>
            <div className="qty">
              <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} aria-label={t("common.decrease")}>−</button>
              <span aria-live="polite">{qty}</span>
              <button
                type="button"
                onClick={() => setQty(optionLeft !== null ? Math.min(qty + 1, Math.max(1, optionLeft)) : qty + 1)}
                aria-label={t("common.increase")}
              >+</button>
            </div>

            {product.stock === 0 ? (
              <div style={{ marginTop: 14, padding: 10, background: "var(--purple-50)", border: "1px solid var(--purple-200)", fontSize: 13, color: "var(--ink-soft)" }}>
                {t("quickView.outOfStock")}
              </div>
            ) : (
              <button
                type="button"
                onClick={onAdd}
                className="btn btn-primary btn-block"
                style={{ marginTop: 14 }}
                disabled={added || optionSoldOut}
              >
                <Icon name={added ? "check" : "bag"} size={14} />
                {added ? t("pdp.added") : needsSize ? t("pdp.selectSize") : optionSoldOut ? t("pdp.optionSoldOut") : `${t("pdp.addToBag")} · ${formatBdt(product.priceBdt * qty, locale)}`}
              </button>
            )}

            <div style={{ marginTop: 14, textAlign: "center" }}>
              <Link href={`/product/${product.slug}`} className="link" onClick={onClose} style={{ fontSize: 13 }}>
                {t("quickView.seeFull")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
