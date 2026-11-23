"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { colorLabel, sizeLabel } from "@/lib/option-labels";
import { getPreorderContact, type PreorderContact } from "@/lib/actions/preorder-contact";

// The form is only fetched when someone taps Pre-order: the page stays light.
const ProductPreorderForm = dynamic(() => import("@/app/[locale]/preorder/product/[slug]/ProductPreorderForm"), {
  loading: () => <p className="stage-wait" role="status">…</p>,
});

export interface PickerProduct {
  id: string;
  slug: string;
  name: string;
  colors: string[];
  sizes: string[];
  dhakaOnly: boolean;
  canPreorder: boolean;
}

interface PreorderPickerProps {
  product: PickerProduct;
  expressCutoffMin: number;
  /** A starting choice (the shop filter's, or the address's); used when the piece has it. */
  initialColor?: string | null;
  initialSize?: string | null;
  /** Adds "Full details" to the fine print (the shop panel; the product page needs none). */
  detailsHref?: string;
}

type Contact = PreorderContact;

/** A swatch dot for the common flower colours; anything else shows its name only. */
const DOTS: Record<string, string> = {
  red: "#b3122e", white: "#ffffff", yellow: "#f2cf3a", pink: "#ef8fb0", orange: "#f08a3c",
  purple: "#7a3fb0", peach: "#f6b48e", multicolors: "conic-gradient(#b3122e, #f2cf3a, #ef8fb0, #7a3fb0, #b3122e)",
};

const pickFrom = (options: string[], wanted: string | null | undefined): string | null =>
  options.find((o) => wanted && o.toLowerCase() === wanted.toLowerCase()) ?? options[0] ?? null;

/**
 * Colour, size and Pre-order, with the full pre-order form opening in place (choices kept),
 * so ordering never needs another page. Used by the shop panel and the product page.
 */
export default function PreorderPicker({ product, expressCutoffMin, initialColor, initialSize, detailsHref }: PreorderPickerProps) {
  const t = useTranslations();
  const locale = useLocale() as "en" | "bn";
  const [color, setColor] = useState(() => pickFrom(product.colors, initialColor));
  const [size, setSize] = useState(() => pickFrom(product.sizes, initialSize));
  const [contact, setContact] = useState<Contact | null>(null);
  const [formWanted, setFormWanted] = useState(false);

  const startForm = async () => {
    setFormWanted(true);
    setContact(await getPreorderContact());
  };

  if (formWanted) {
    return contact ? (
      <div className="stage-form">
        <ProductPreorderForm
          productId={product.id}
          productName={product.name}
          userEmail={contact.email}
          prefill={contact.prefill}
          dhakaOnly={product.dhakaOnly}
          expressCutoffMin={expressCutoffMin}
          expressFeeBdt={contact.expressFeeBdt}
          signInHref={`/sign-in?next=/${locale}/preorder/product/${product.slug}`}
          colors={product.colors}
          sizes={product.sizes}
          initialColor={color ?? undefined}
          initialSize={size ?? undefined}
        />
      </div>
    ) : (
      <p className="stage-wait" role="status">{t("stage.opening")}</p>
    );
  }

  return (
    <>
      {product.colors.length > 0 && (
        <div className="stage-opt" role="group" aria-label={t("stage.colour")}>
          <p>{t("stage.colour")}{color ? ` · ${colorLabel(color, locale)}` : ""}</p>
          {product.colors.map((c) => {
            const dot = DOTS[c.toLowerCase()];
            return (
              <button key={c} type="button" aria-pressed={c === color} onClick={() => setColor(c)}
                className={dot ? "stage-dot" : "stage-chip"} style={dot ? { background: dot } : undefined}
                aria-label={dot ? colorLabel(c, locale) : undefined}>
                {dot ? null : colorLabel(c, locale)}
              </button>
            );
          })}
        </div>
      )}
      {product.sizes.length > 0 && (
        <div className="stage-opt" role="group" aria-label={t("stage.size")}>
          <p>{t("stage.size")}</p>
          {product.sizes.map((s) => (
            <button key={s} type="button" className="stage-chip" aria-pressed={s === size} onClick={() => setSize(s)}>
              {sizeLabel(s, locale)}
            </button>
          ))}
        </div>
      )}
      {product.canPreorder ? (
        <button type="button" className="btn btn-primary stage-cta" onClick={startForm}>{t("preorder.cta")}</button>
      ) : (
        <Link href={`/product/${product.slug}`} className="btn btn-primary stage-cta">{t("quickView.seeFull")}</Link>
      )}
      <p className="stage-fine">
        {product.canPreorder && t("preorder.quoteOnly")}
        {product.canPreorder && detailsHref && " · "}
        {detailsHref && <Link href={detailsHref}>{t("stage.details")}</Link>}
      </p>
    </>
  );
}
