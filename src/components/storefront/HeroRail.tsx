"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/routing";
import type { Cutout } from "@/lib/cutouts";

export interface RailItem {
  slug: string;
  name: string;
  meta: string;
  cutout: Cutout;
}

interface Labels {
  region: string;
  prev: string;
  next: string;
  pause: string;
  play: string;
}

interface Props {
  items: RailItem[];
  labels: Labels;
}

const STEP_MS = 4500;
const SWIPE_PX = 40;

/** Where an item sits relative to the one in front: -1, 0, 1, or "far" (hidden). */
function position(i: number, at: number, n: number): string {
  let d = i - at;
  if (d > n / 2) d -= n;
  if (d < -n / 2) d += n;
  return Math.abs(d) <= 1 ? String(d) : "far";
}

/**
 * The home page's opening rail: the bouquets stand cut out on the page, one in front and
 * its neighbours waiting faded at the sides. It moves on its own every few seconds unless
 * the visitor asked for less motion, points at it, focuses it, or presses pause (WCAG
 * 2.2.2); arrows, the arrow keys and a swipe move it by hand.
 */
export default function HeroRail({ items, labels }: Props) {
  const n = items.length;
  const [at, setAt] = useState(0);
  const [paused, setPaused] = useState(false);
  const [held, setHeld] = useState(false);   // pointed at or focused
  const x0 = useRef<number | null>(null);
  // Pictures load only when a bouquet is in front or next to it, then stay: hidden ones
  // are stacked in view (just transparent), so lazy loading alone would fetch them all.
  const [seen, setSeen] = useState<ReadonlySet<number>>(() => new Set([n - 1, 0, 1].map((i) => (i + n) % n)));
  useEffect(() => {
    setSeen((prev) => {
      const near = [at - 1, at, at + 1].map((i) => (i + n) % n);
      return near.every((i) => prev.has(i)) ? prev : new Set([...prev, ...near]);
    });
  }, [at, n]);

  const go = useCallback((delta: number) => setAt((a) => (a + delta + n) % n), [n]);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) setPaused(true);
  }, []);

  useEffect(() => {
    if (paused || held || n < 2) return;
    const timer = setInterval(() => go(1), STEP_MS);
    return () => clearInterval(timer);
  }, [paused, held, n, go]);

  if (n === 0) return null;
  const current = items[at];

  return (
    <div
      className="rail"
      role="region"
      aria-roledescription="carousel"
      aria-label={labels.region}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); }}
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
      onPointerDown={(e) => { x0.current = e.clientX; }}
      onPointerUp={(e) => {
        const start = x0.current;
        x0.current = null;
        if (start !== null && Math.abs(e.clientX - start) > SWIPE_PX) go(e.clientX < start ? 1 : -1);
      }}
    >
      {items.map((it, i) => (
        <div key={it.slug} className="rail-slot" data-pos={position(i, at, n)} aria-hidden={i !== at}>
          {seen.has(i) && (
          // eslint-disable-next-line @next/next/no-img-element -- transparent WebP in two sizes, chosen by srcSet
          <img
            src={it.cutout.small}
            srcSet={`${it.cutout.small} 450w, ${it.cutout.large} 900w`}
            sizes="(max-width: 760px) 50vw, 34vw"
            width={it.cutout.width}
            height={it.cutout.height}
            alt={it.name}
            loading={i === 0 ? "eager" : "lazy"}
            fetchPriority={i === 0 ? "high" : "auto"}
            decoding="async"
            draggable={false}
          />
          )}
        </div>
      ))}
      <Link href={`/product/${current.slug}`} className="rail-tag" aria-live="polite">
        <span className="rail-name">{current.name}</span>
        <span className="rail-meta">{current.meta}</span>
      </Link>
      {n > 1 && (
        <>
          <button type="button" className="rail-ctrl rail-prev" aria-label={labels.prev} onClick={() => go(-1)}>←</button>
          <button type="button" className="rail-ctrl rail-next" aria-label={labels.next} onClick={() => go(1)}>→</button>
          <button type="button" className="rail-ctrl rail-pause" aria-label={paused ? labels.play : labels.pause} onClick={() => setPaused((p) => !p)}>
            {paused ? "▶" : "❚❚"}
          </button>
          <div className="rail-dots" aria-hidden="true">
            {items.map((it, i) => <i key={it.slug} className={i === at ? "on" : undefined} />)}
          </div>
        </>
      )}
    </div>
  );
}
