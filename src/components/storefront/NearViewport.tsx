"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Rendered until the spot is near the viewport (keep it light: no photos). */
  fallback: ReactNode;
  /** How far ahead of the viewport to swap in the children. */
  rootMargin?: string;
};

/**
 * Renders `fallback` until this spot comes within `rootMargin` of the
 * viewport, then `children`. For photos far below the first screen:
 * loading="lazy" still starts them at once when they are within Chrome's
 * 1250-2500 px lazy-load distance, and on the home page six bento photos
 * (~314 KB) competed with the hero on a slow phone (Lighthouse LCP ~4 s).
 * The parent must be positioned: the sentinel fills it to be observed.
 */
export default function NearViewport({ children, fallback, rootMargin = "400px" }: Props) {
  const [isNear, setIsNear] = useState(false);
  const sentinel = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = sentinel.current;
    if (isNear || !el) return;
    if (!("IntersectionObserver" in window)) {
      setIsNear(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setIsNear(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [isNear, rootMargin]);

  return (
    <>
      {!isNear && (
        <span ref={sentinel} aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
      )}
      {isNear ? children : fallback}
    </>
  );
}
