"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Composition from "./Composition";
import { usePdpState } from "./PdpStateContext";

type Photo = { url: string; alt: string | null };
type Fallback = {
  cat: string;
  sku: string;
  name: string;
  tag: string | null;
};

type Props = {
  photos: Photo[];
  fallback: Fallback;
  activeIndex?: number;
  onIndexChange?: (i: number) => void;
};

export default function PdpGallery({ photos, fallback, activeIndex, onIndexChange }: Props) {
  const { activePhotoIndex, setActivePhotoIndex } = usePdpState();
  const [imgKey, setImgKey] = useState(0);
  // Swapping photos remounts the Image (for the fade), which blanks the frame
  // until the full-size file arrives — seconds on first load. The veil gives
  // the click immediate, visible acknowledgement.
  const [loading, setLoading] = useState(false);
  const prev = useRef(0);
  const touchStartX = useRef(0);

  const controlled = activeIndex !== undefined;
  const active = controlled ? activeIndex : activePhotoIndex;

  const setActive = (i: number) => {
    if (controlled) {
      onIndexChange?.(i);
    } else {
      setActivePhotoIndex(i);
    }
  };

  const hasPhotos = photos.length > 0;
  const current = hasPhotos ? photos[active] : null;

  useEffect(() => {
    if (prev.current !== active) {
      setImgKey((k) => k + 1);
      if (photos.length > 0) setLoading(true);
      prev.current = active;
    }
  }, [active, photos.length]);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = e.changedTouches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const endX = e.changedTouches[0].clientX;
    const delta = endX - touchStartX.current;
    if (delta > 40) {
      setActive(Math.max(0, active - 1));
    } else if (delta < -40) {
      setActive(Math.min(photos.length - 1, active + 1));
    }
  };

  return (
    <div className="pdp-gallery">
      <div className="pdp-thumbs">
        {hasPhotos
          ? photos.map((p, i) => (
              <button
                key={p.url}
                type="button"
                onClick={() => setActive(i)}
                className={"pdp-thumb " + (i === active ? "active" : "")}
                aria-label={`View photo ${i + 1}`}
                style={{ padding: 0, border: "none", cursor: "pointer", background: "transparent" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.alt ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </button>
            ))
          : [0, 1, 2, 3].map((i) => (
              <div key={i} className={"pdp-thumb " + (i === 0 ? "active" : "")}>
                <Composition cat={fallback.cat} sku={fallback.sku + "-" + i} name={fallback.name} variant={i} small />
              </div>
            ))}
      </div>
      <div
        className="pdp-main-img pdp-main-img--fade"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {hasPhotos && current ? (
          <>
            <Image
              key={imgKey}
              src={current.url}
              alt={current.alt ?? fallback.name}
              width={900}
              height={1200}
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              // height:100% + cover clips ANY upload shape to the 3:4 frame —
              // height:auto let portrait photos overflow across the info column.
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              className="pdp-img-fade"
              onLoad={() => setLoading(false)}
              onError={() => setLoading(false)}
            />
            {loading && <div className="pdp-img-veil" aria-hidden="true" />}
          </>
        ) : (
          <Composition
            cat={fallback.cat}
            sku={fallback.sku}
            name={fallback.name}
            tag={fallback.tag}
            ribbon={fallback.tag === "new" ? "New" : null}
            sale={fallback.tag === "sale"}
          />
        )}
      </div>
    </div>
  );
}
