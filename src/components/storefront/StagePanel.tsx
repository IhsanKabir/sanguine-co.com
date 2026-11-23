"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import type { StageItem } from "@/lib/stage-items";
import SameDayLine from "./SameDayLine";
import PreorderPicker from "./PreorderPicker";

interface StagePanelProps {
  item: StageItem;
  segmentLabel: string;
  expressCutoffMin: number;
  /** The shop filter's choice, used as the starting option when the piece has it. */
  initialColor: string | null;
  initialSize: string | null;
  onClose: () => void;
}

/**
 * The picked product's panel: beside it on wide screens, a sheet from the bottom on phones.
 * Colour and size are chosen here, and Pre-order opens the full pre-order form in place,
 * with those choices already made. Escape or the close button puts the product back.
 */
export default function StagePanel({ item, segmentLabel, expressCutoffMin, initialColor, initialSize, onClose }: StagePanelProps) {
  const t = useTranslations();
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const titleId = `stage-title-${item.slug}`;
  return (
    <div className="stage-panel" role="dialog" aria-modal="false" aria-labelledby={titleId}>
      <button type="button" className="stage-close" aria-label={t("stage.close")} onClick={onClose}>×</button>
      <p className="stage-panel-k">{segmentLabel} · {item.meta}</p>
      <h2 id={titleId} ref={heading} tabIndex={-1}>{item.name}</h2>
      {item.dhakaOnly && <SameDayLine cutoffMin={expressCutoffMin} />}
      <PreorderPicker product={item} expressCutoffMin={expressCutoffMin}
        initialColor={initialColor} initialSize={initialSize} detailsHref={`/product/${item.slug}`} />
    </div>
  );
}
