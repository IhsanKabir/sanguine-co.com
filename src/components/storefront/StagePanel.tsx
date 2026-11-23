"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { colorLabel, sizeLabel } from "@/lib/option-labels";
import type { StageItem } from "@/lib/stage-items";
import type { CustomerPrefill } from "@/lib/customer-prefill";
import { getPreorderContact } from "@/lib/actions/preorder-contact";
import SameDayLine from "./SameDayLine";

// The form is only fetched when someone taps Pre-order: the shop page stays light.
const ProductPreorderForm = dynamic(() => import("@/app/[locale]/preorder/product/[slug]/ProductPreorderForm"), {
  loading: () => <p className="stage-wait" role="status">…</p>,
});

interface StagePanelProps {
  item: StageItem;
  segmentLabel: string;
  expressCutoffMin: number;
  /** The shop filter's choice, used as the starting option when the piece has it. */
  initialColor: string | null;
  initialSize: string | null;
  onClose: () => void;
}

type Contact = { email: string; prefill: CustomerPrefill };

/** A swatch dot for the common flower colours; anything else shows its name only. */
const DOTS: Record<string, string> = {
  red: "#b3122e", white: "#ffffff", yellow: "#f2cf3a", pink: "#ef8fb0", orange: "#f08a3c",
  purple: "#7a3fb0", peach: "#f6b48e", multicolors: "conic-gradient(#b3122e, #f2cf3a, #ef8fb0, #7a3fb0, #b3122e)",
};

const pickFrom = (options: string[], wanted: string | null): string | null =>
  options.find((o) => wanted && o.toLowerCase() === wanted.toLowerCase()) ?? options[0] ?? null;

/**
 * The picked product's panel: beside it on wide screens, a sheet from the bottom on phones.
 * Colour and size are chosen here, and Pre-order opens the full pre-order form in place,
 * with those choices already made. Escape or the close button puts the product back.
 */
export default function StagePanel({ item, segmentLabel, expressCutoffMin, initialColor, initialSize, onClose }: StagePanelProps) {
  const t = useTranslations();
  const locale = useLocale() as "en" | "bn";
  const [color, setColor] = useState(() => pickFrom(item.colors, initialColor));
  const [size, setSize] = useState(() => pickFrom(item.sizes, initialSize));
  const [contact, setContact] = useState<Contact | null>(null);
  const [formWanted, setFormWanted] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const startForm = async () => {
    setFormWanted(true);
    setContact(await getPreorderContact());
  };

  const titleId = `stage-title-${item.slug}`;
  return (
    <div className="stage-panel" role="dialog" aria-modal="false" aria-labelledby={titleId}>
      <button type="button" className="stage-close" aria-label={t("stage.close")} onClick={onClose}>×</button>
      <p className="stage-panel-k">{segmentLabel} · {item.meta}</p>
      <h2 id={titleId} ref={heading} tabIndex={-1}>{item.name}</h2>
      {item.dhakaOnly && <SameDayLine cutoffMin={expressCutoffMin} />}

      {!formWanted && (
        <>
          {item.colors.length > 0 && (
            <div className="stage-opt" role="group" aria-label={t("stage.colour")}>
              <p>{t("stage.colour")}{color ? ` · ${colorLabel(color, locale)}` : ""}</p>
              {item.colors.map((c) => {
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
          {item.sizes.length > 0 && (
            <div className="stage-opt" role="group" aria-label={t("stage.size")}>
              <p>{t("stage.size")}</p>
              {item.sizes.map((s) => (
                <button key={s} type="button" className="stage-chip" aria-pressed={s === size} onClick={() => setSize(s)}>
                  {sizeLabel(s, locale)}
                </button>
              ))}
            </div>
          )}
          {item.canPreorder ? (
            <button type="button" className="btn btn-primary stage-cta" onClick={startForm}>{t("preorder.cta")}</button>
          ) : (
            <Link href={`/product/${item.slug}`} className="btn btn-primary stage-cta">{t("quickView.seeFull")}</Link>
          )}
          <p className="stage-fine">
            {item.canPreorder && <>{t("preorder.quoteOnly")} · </>}
            <Link href={`/product/${item.slug}`}>{t("stage.details")}</Link>
          </p>
        </>
      )}

      {formWanted && (contact ? (
        <div className="stage-form">
          <ProductPreorderForm
            productId={item.id}
            productName={item.name}
            userEmail={contact.email}
            prefill={contact.prefill}
            dhakaOnly={item.dhakaOnly}
            expressCutoffMin={expressCutoffMin}
            signInHref={`/sign-in?next=/${locale}/preorder/product/${item.slug}`}
            colors={item.colors}
            sizes={item.sizes}
            initialColor={color ?? undefined}
            initialSize={size ?? undefined}
          />
        </div>
      ) : (
        <p className="stage-wait" role="status">{t("stage.opening")}</p>
      ))}
    </div>
  );
}
