"use client";

import { useState, useRef, useEffect } from "react";
import { useCart, type CartItem } from "@/lib/cart-context";
import { useLocale, useTranslations } from "next-intl";
import { formatBdt } from "@/lib/utils";
import { track } from "@/lib/actions/track";
import Icon from "./Icon";
import { usePdpState } from "./PdpStateContext";
import { colorSoldOut, sizeSoldOut, stockOf, type OptionStock } from "./option-availability";

type Props = {
  product: Omit<CartItem, "qty" | "color" | "size">;
  colors?: string[];
  sizes?: string[];
  colorPhotoMap?: Record<string, number>;
  /** Stock per option ("colour|size" → n), or null when the piece has one stock number. */
  optionStock?: OptionStock;
};

export default function PdpActionsClient({ product, colors = [], sizes = [], colorPhotoMap, optionStock }: Props) {
  const t = useTranslations();
  const locale = useLocale() as "en" | "bn";
  const { add } = useCart();
  const { setActivePhotoIndex } = usePdpState();

  // First colour that still has stock (the photo follows the colour).
  const [color, setColorState] = useState<string>(
    colors.find((c) => !colorSoldOut(optionStock, sizes, c)) ?? colors[0] ?? "",
  );
  // No size is chosen for the shopper unless there is only one: pre-selecting
  // the first (usually the smallest) put whoever didn't notice the picker into
  // the wrong size. Colour stays pre-selected, since the photo shows it.
  const [size, setSizeState] = useState<string>(
    sizes.length === 1 && !sizeSoldOut(optionStock, colors, colors[0] ?? "", sizes[0]) ? sizes[0] : "",
  );
  const [sizeHint, setSizeHint] = useState(false);
  const needsSize = sizes.length > 0 && !size;
  const [qty, setQty] = useState(1);
  // Stock of the exact option chosen; null = unknown (not counted per option,
  // or the choice isn't complete yet).
  const chosen = (colors.length === 0 || color) && (sizes.length === 0 || size);
  const optionLeft = chosen ? stockOf(optionStock, color, size) : null;
  const optionSoldOut = optionLeft !== null && optionLeft <= 0;
  const optionName = [color, size].filter(Boolean).join(" · ");
  const [added, setAdded] = useState(false);
  const [stickyVisible, setStickyVisible] = useState(false);
  const [flyPos, setFlyPos] = useState<{ x: number; y: number } | null>(null);

  const actionsRef = useRef<HTMLDivElement>(null);
  const sizeRowRef = useRef<HTMLDivElement>(null);
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
    if (colorSoldOut(optionStock, sizes, c)) return;
    setColorState(c);
    // The size picked may not exist in the new colour.
    if (size && sizeSoldOut(optionStock, colors, c, size)) setSizeState("");
    setQty(1);
    if (colorPhotoMap && colorPhotoMap[c] !== undefined) {
      setActivePhotoIndex(colorPhotoMap[c]);
    }
  };

  const setSize = (s: string) => {
    if (sizeSoldOut(optionStock, colors, color, s)) return;
    setSizeState(s);
    setSizeHint(false);
    setQty(1);
  };

  // Add-to-bag without a size: point at the picker instead of adding.
  const promptForSize = () => {
    setSizeHint(true);
    const row = sizeRowRef.current;
    row?.scrollIntoView({ behavior: "smooth", block: "center" });
    row?.querySelector<HTMLElement>("[role=button]")?.focus({ preventScroll: true });
  };

  const doAdd = () => {
    if (needsSize) return promptForSize();
    if (optionSoldOut) return;
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
          <div className="pdp-label">{t("pdp.optionLabel", { value: color })}</div>
          <div className="swatch-row">
            {colors.map((c) => (
              <div
                key={c}
                className={"swatch size-pill " + (c === color ? "active" : "") + (colorSoldOut(optionStock, sizes, c) ? " sold-out" : "")}
                role="button"
                aria-disabled={colorSoldOut(optionStock, sizes, c) || undefined}
                title={colorSoldOut(optionStock, sizes, c) ? t("pdp.optionSoldOut") : undefined}
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
          <div className="pdp-label">{size ? t("pdp.sizeLabel", { value: size }) : t("common.size")}</div>
          <div className="swatch-row" ref={sizeRowRef}>
            {sizes.map((s) => (
              <div
                key={s}
                className={"swatch size-pill " + (s === size ? "active" : "") + (sizeSoldOut(optionStock, colors, color, s) ? " sold-out" : "")}
                role="button"
                aria-pressed={s === size}
                aria-disabled={sizeSoldOut(optionStock, colors, color, s) || undefined}
                title={sizeSoldOut(optionStock, colors, color, s) ? t("pdp.optionSoldOut") : undefined}
                tabIndex={0}
                onClick={() => setSize(s)}
                onKeyDown={(e) => { if (e.key === "Enter") setSize(s); }}
              >
                {s}
              </div>
            ))}
          </div>
          {sizeHint && needsSize && (
            <div className="pdp-size-hint" role="alert">{t("pdp.chooseSizeFirst")}</div>
          )}
        </>
      )}
      {optionLeft !== null && optionLeft > 0 && optionLeft <= 5 && optionName && (
        <div className="pdp-option-left">{t("pdp.optionLeft", { count: optionLeft, option: optionName })}</div>
      )}
      <div className="pdp-label">{t("common.quantity")}</div>
      <div className="qty">
        <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label={t("common.decrease")}>−</button>
        <span aria-live="polite">{qty}</span>
        <button
          onClick={() => setQty(optionLeft !== null ? Math.min(qty + 1, Math.max(1, optionLeft)) : qty + 1)}
          aria-label={t("common.increase")}
        >+</button>
      </div>
      <div className="pdp-actions" ref={actionsRef}>
        <button ref={btnRef} className="btn btn-primary btn-block" onClick={doAdd} disabled={optionSoldOut}>
          <Icon name={added ? "check" : "bag"} size={14} />
          {added ? t("pdp.added") : needsSize ? t("pdp.selectSize") : optionSoldOut ? t("pdp.optionSoldOut") : `${t("pdp.addToBag")} · ${formatBdt(product.priceBdt * qty, locale)}`}
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
          disabled={optionSoldOut}
          tabIndex={stickyVisible ? 0 : -1}
        >
          <Icon name={added ? "check" : "bag"} size={14} />
          {added ? t("pdp.added") : needsSize ? t("pdp.selectSize") : optionSoldOut ? t("pdp.optionSoldOut") : formatBdt(product.priceBdt * qty, locale)}
        </button>
      </div>
    </>
  );
}
