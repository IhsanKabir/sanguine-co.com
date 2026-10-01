"use client";

import { useState } from "react";
import { useCart, type CartItem } from "@/lib/cart-context";
import { useLocale, useTranslations } from "next-intl";
import { formatBdt } from "@/lib/utils";
import { track } from "@/lib/actions/track";
import Icon from "./Icon";

type Props = {
  product: Omit<CartItem, "qty" | "color" | "size">;
  colors?: string[];
  sizes?: string[];
};

export default function AddToBagButton({ product, colors = [], sizes = [] }: Props) {
  const t = useTranslations();
  const locale = useLocale() as "en" | "bn";
  const { add } = useCart();
  const [color, setColor] = useState<string>(colors[0] || "");
  const [size, setSize] = useState<string>(sizes[0] || "");
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const onAdd = () => {
    add({ ...product, qty, color: color || null, size: size || null });
    track({
      type: "add_to_cart",
      productId: product.productId,
      payload: { qty, color, size, priceBdt: product.priceBdt },
      path: window.location.pathname,
    }).catch(() => {});
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  };

  return (
    <>
      {colors.length > 0 && (
        <>
          <div className="pdp-label">{t("pdp.optionLabel", { value: color })}</div>
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
          <div className="pdp-label">{t("pdp.sizeLabel", { value: size })}</div>
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
      <div className="pdp-label">{t("common.quantity")}</div>
      <div className="qty">
        <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label={t("common.decrease")}>−</button>
        <span aria-live="polite">{qty}</span>
        <button onClick={() => setQty(qty + 1)} aria-label={t("common.increase")}>+</button>
      </div>
      <div className="pdp-actions">
        <button className="btn btn-primary btn-block" onClick={onAdd}>
          <Icon name={added ? "check" : "bag"} size={14} />
          {added ? t("pdp.added") : `${t("pdp.addToBag")} · ${formatBdt(product.priceBdt * qty, locale)}`}
        </button>
      </div>
    </>
  );
}
