"use client";

import { useState, useRef, useEffect } from "react";
import { useCart, type CartItem } from "@/lib/cart-context";
import { useLocale, useTranslations } from "next-intl";
import { formatBdt } from "@/lib/utils";
import { track } from "@/lib/actions/track";
import Icon from "./Icon";
import { usePdpState } from "./PdpStateContext";

type Props = {
  product: Omit<CartItem, "qty" | "color" | "size">;
  colors?: string[];
  sizes?: string[];
  colorPhotoMap?: Record<string, number>;
};

export default function PdpActionsClient({ product, colors = [], sizes = [], colorPhotoMap }: Props) {
  const t = useTranslations();
  const locale = useLocale() as "en" | "bn";
  const { add } = useCart();
  const { setActivePhotoIndex } = usePdpState();

  const [color, setColorState] = useState<string>(colors[0] ?? "");
  const [size, setSize] = useState<string>(sizes[0] ?? "");
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [stickyVisible, setStickyVisible] = useState(false);
  const [flyPos, setFlyPos] = useState<{ x: number; y: number } | null>(null);

  const actionsRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const el = actionsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setStickyVisible(!entry.isIntersecting),
      { threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const setColor = (c: string) => {
    setColorState(c);
    if (colorPhotoMap && colorPhotoMap[c] !== undefined) {
      setActivePhotoIndex(colorPhotoMap[c]);
    }
  };

  const doAdd = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setFlyPos({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    }
    add({ ...product, qty, color: color || null, size: size || null });
    track({
      type: "add_to_cart",
      productId: product.productId,
      payload: { qty, color, size, priceBdt: product.priceBdt },
      path: window.location.pathname,
    }).catch(() => {});
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
    setTimeout(() => setFlyPos(null), 600);
  };

  const variantLabel = [color, size].filter(Boolean).join(" · ");

  return (
    <>
      {flyPos && (
        <span
          className="fly-dot"
          style={{ "--fly-x": flyPos.x + "px", "--fly-y": flyPos.y + "px" } as React.CSSProperties}
          aria-hidden="true"
        />
      )}
      {colors.length > 0 && (
        <>
          <div className="pdp-label">Option — {color}</div>
          <div className="swatch-row">
            {colors.map((c) => (
              <div
                key={c}
                className={"swatch size-pill " + (c === color ? "active" : "")}
                role="button"
                tabIndex={0}
                onClick={() => setColor(c)}
                onKeyDown={(e) => { if (e.key === "Enter") setColor(c); }}
              >
                {c}
              </div>
            ))}
          </div>
        </>
      )}
      {sizes.length > 0 && (
        <>
          <div className="pdp-label">Size — {size}</div>
          <div className="swatch-row">
            {sizes.map((s) => (
              <div
                key={s}
                className={"swatch size-pill " + (s === size ? "active" : "")}
                role="button"
                tabIndex={0}
                onClick={() => setSize(s)}
                onKeyDown={(e) => { if (e.key === "Enter") setSize(s); }}
              >
                {s}
              </div>
            ))}
          </div>
        </>
      )}
      <div className="pdp-label">Quantity</div>
      <div className="qty">
        <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Decrease">−</button>
        <span aria-live="polite">{qty}</span>
        <button onClick={() => setQty(qty + 1)} aria-label="Increase">+</button>
      </div>
      <div className="pdp-actions" ref={actionsRef}>
        <button ref={btnRef} className="btn btn-primary btn-block" onClick={doAdd}>
          <Icon name={added ? "check" : "bag"} size={14} />
          {added ? "Added" : `${t("pdp.addToBag")} · ${formatBdt(product.priceBdt * qty, locale)}`}
        </button>
      </div>

      <div className={"pdp-sticky-bar" + (stickyVisible ? " pdp-sticky-bar--visible" : "")} aria-hidden={!stickyVisible}>
        <div className="pdp-sticky-bar__info">
          <span className="pdp-sticky-bar__name">{product.name}</span>
          {variantLabel && <span className="pdp-sticky-bar__variant">{variantLabel}</span>}
        </div>
        <button
          className={"btn btn-primary" + (added ? " btn-added" : "")}
          onClick={doAdd}
          tabIndex={stickyVisible ? 0 : -1}
        >
          <Icon name={added ? "check" : "bag"} size={14} />
          {added ? "Added" : formatBdt(product.priceBdt * qty, locale)}
        </button>
      </div>
    </>
  );
}
