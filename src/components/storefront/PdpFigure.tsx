"use client";

import { useEffect, useRef, useState, type TouchEvent } from "react";
import Image from "next/image";
import type { Cutout } from "@/lib/cutouts";
import { usePdpState } from "./PdpStateContext";

type Photo = { url: string; alt: string | null };

interface PdpFigureProps {
  name: string;
  cutout: Cutout | null;
  photos: Photo[];
  /** "Bouquet" (flowers) or "Piece": the cut-out's label in the numbered list. */
  cutoutLabel: string;
  /** "Photo". */
  photoLabel: string;
  /** "View {n}" style label for the list, read by screen readers. */
  listLabel: string;
}

const SWIPE_PX = 40;

/**
 * The product page's picture: the cut-out standing on the page, then its real photos, chosen
 * from a numbered list (01 Bouquet, 02 Photo...). Picking a colour that has its own photo
 * (PdpActionsClient) still brings that photo forward.
 */
export default function PdpFigure({ name, cutout, photos, cutoutLabel, photoLabel, listLabel }: PdpFigureProps) {
  const offset = cutout ? 1 : 0;
  const count = photos.length + offset;
  const [view, setView] = useState(0);
  const { activePhotoIndex } = usePdpState();
  const firstRun = useRef(true);
  const touchX = useRef(0);

  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    setView(activePhotoIndex + offset);
  }, [activePhotoIndex, offset]);

  const onTouchStart = (e: TouchEvent<HTMLDivElement>) => { touchX.current = e.changedTouches[0].clientX; };
  const onTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    const d = e.changedTouches[0].clientX - touchX.current;
    if (d > SWIPE_PX) setView((v) => Math.max(0, v - 1));
    else if (d < -SWIPE_PX) setView((v) => Math.min(count - 1, v + 1));
  };

  const showCutout = cutout && view === 0;
  const photo = showCutout ? null : photos[view - offset];

  return (
    <div className="pdp-figure">
      <div className="pdp-figure-main" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {showCutout ? (
          <Image key="cut" src={cutout.large} width={cutout.width} height={cutout.height} alt={name}
            className="pdp-cut pdp-img-fade" sizes="(max-width: 760px) 80vw, 46vw" priority fetchPriority="high" />
        ) : photo ? (
          <Image key={photo.url} src={photo.url} width={900} height={1125} alt={photo.alt ?? name}
            className="pdp-photo pdp-img-fade" sizes="(max-width: 760px) 86vw, 40vw" priority={!cutout} />
        ) : null}
      </div>
      {count > 1 && (
        <ol className="pdp-views" aria-label={listLabel}>
          {Array.from({ length: count }, (_, i) => (
            <li key={i}>
              <button type="button" aria-pressed={i === view} onClick={() => setView(i)}>
                <span>{String(i + 1).padStart(2, "0")}</span>{cutout && i === 0 ? cutoutLabel : photoLabel}
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
