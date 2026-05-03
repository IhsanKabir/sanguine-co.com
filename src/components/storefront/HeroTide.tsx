"use client";

import { useEffect, useRef } from "react";

/**
 * Three-layer painted horizon as a hero background. Drifts at different
 * parallax rates as the visitor scrolls the first 100vh, and each layer also
 * has a slow ambient sway so the scene "breathes" while stationary.
 *
 * Layers (back to front):
 *   1. Sky gradient + slow-moving sun + drifting cloud strokes
 *   2. Distant water — pale cyan band with a long horizon ripple
 *   3. Foreground tide — deeper teal, two soft wavelets, slight bob
 *
 * Honours `prefers-reduced-motion`: skips the rAF loop, paints a static frame.
 *
 * Pure SVG with `transform` on each layer — compositor-friendly, no canvas,
 * no library. ~3 KB rendered, GPU-accelerated.
 */
export default function HeroTide() {
  const skyRef = useRef<SVGGElement | null>(null);
  const seaRef = useRef<SVGGElement | null>(null);
  const tideRef = useRef<SVGGElement | null>(null);
  const cloudRef = useRef<SVGGElement | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    // Cursor-tide parallax: mouse position drives a small extra horizontal
    // offset on each layer, in opposite directions to depth. Disabled on
    // touch devices (no real cursor) where it would be noise. Tracked as
    // -1..1 normalised so we can scale per-layer without re-reading rect.
    const hasCursor = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    let cursorX = 0; // -1 (left edge) .. 1 (right edge)
    if (hasCursor) {
      const onMove = (e: MouseEvent) => {
        cursorX = (e.clientX / window.innerWidth) * 2 - 1;
      };
      window.addEventListener("mousemove", onMove, { passive: true });
      // Cleanup wired into the rAF cleanup below.
      const cleanupMove = () => window.removeEventListener("mousemove", onMove);
      // Stash on ref so the rAF cleanup can call it.
      cleanupRef.current = cleanupMove;
    }

    let raf = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const t = (now - start) / 1000; // seconds
      const scroll = window.scrollY || 0;

      // Parallax: each layer drifts up at a different rate as we scroll.
      // Sky moves slowest, foreground tide fastest. The visitor's eye reads
      // this as depth without consciously parsing it.
      const skyY  = scroll * 0.05;
      const seaY  = scroll * 0.12;
      const tideY = scroll * 0.22;

      // Ambient sway: a tiny periodic drift so the scene moves while idle.
      // 22-second sky cycle, 11-second sea, 7-second tide. Asymmetric so
      // they never line up — the brain stops trying to predict them.
      const skySway  = Math.sin(t * 2 * Math.PI / 22) * 6;
      const seaSway  = Math.sin(t * 2 * Math.PI / 11) * 4;
      const tideSway = Math.sin(t * 2 * Math.PI / 7) * 3;
      const cloudSway = ((t * 6) % 1400) - 700;  // slow rightward drift, looping

      // Cursor-tide: each layer offsets by a small amount in the cursor's
      // horizontal direction. Sky drifts opposite to foreground (eye-tracking
      // illusion) at lower amplitude. Max ~8 px so it stays atmospheric.
      const cursorSky  = -cursorX * 4;   // sky moves opposite, gentlest
      const cursorSea  = cursorX * 5;
      const cursorTide = cursorX * 8;    // foreground tracks the cursor most

      if (skyRef.current)   skyRef.current.style.transform   = `translate3d(${skySway + cursorSky}px, ${-skyY}px, 0)`;
      if (seaRef.current)   seaRef.current.style.transform   = `translate3d(${seaSway + cursorSea}px, ${-seaY + Math.sin(t * 2 * Math.PI / 9) * 2}px, 0)`;
      if (tideRef.current)  tideRef.current.style.transform  = `translate3d(${tideSway + cursorTide}px, ${-tideY}px, 0)`;
      if (cloudRef.current) cloudRef.current.style.transform = `translate3d(${cloudSway + cursorSky * 1.5}px, 0, 0)`;

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      cleanupRef.current?.();
    };
  }, []);

  return (
    <svg
      className="hero-tide"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      <defs>
        {/* Sky: deep tide-deep at top, fading to mist at the horizon */}
        <linearGradient id="ht-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.22 0.06 220)" />
          <stop offset="55%" stopColor="oklch(0.46 0.07 215)" />
          <stop offset="100%" stopColor="oklch(0.78 0.05 200)" />
        </linearGradient>
        {/* Sea: pale aqua band */}
        <linearGradient id="ht-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.78 0.06 200)" />
          <stop offset="100%" stopColor="oklch(0.62 0.06 205)" />
        </linearGradient>
        {/* Foreground tide: deeper teal */}
        <linearGradient id="ht-tide" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.42 0.07 210)" />
          <stop offset="100%" stopColor="oklch(0.30 0.06 215)" />
        </linearGradient>
        {/* Sun: a soft warm circle */}
        <radialGradient id="ht-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="oklch(0.92 0.10 80)" stopOpacity="0.85" />
          <stop offset="60%" stopColor="oklch(0.85 0.10 75)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="oklch(0.85 0.10 75)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Sky band — top 60% of the viewport */}
      <g ref={skyRef} style={{ willChange: "transform" }}>
        <rect x="0" y="0" width="1440" height="560" fill="url(#ht-sky)" />
        {/* Sun, slightly off-centre */}
        <circle cx="980" cy="320" r="220" fill="url(#ht-sun)" />
      </g>

      {/* Cloud strokes — drift across the sky */}
      <g ref={cloudRef} style={{ willChange: "transform", opacity: 0.5 }}>
        <path d="M -200 200 Q -50 195, 100 200 T 400 195 T 700 198 T 1000 195 T 1300 200 T 1600 198"
              stroke="oklch(0.93 0.025 200)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M -200 260 Q 0 258, 200 262 T 600 260 T 1000 258 T 1400 262 T 1800 260"
              stroke="oklch(0.93 0.025 200)" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.7" />
        <path d="M -200 165 Q 100 168, 400 162 T 1000 168 T 1700 162"
              stroke="oklch(0.93 0.025 200)" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.5" />
      </g>

      {/* Mid sea — band from 56% to 76% */}
      <g ref={seaRef} style={{ willChange: "transform" }}>
        <path d="M 0 540 Q 360 532, 720 540 T 1440 540 L 1440 700 L 0 700 Z" fill="url(#ht-sea)" />
        {/* Horizon ripple */}
        <path d="M 0 545 Q 240 543, 480 547 T 960 545 T 1440 547"
              stroke="oklch(0.93 0.025 200)" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.6" />
      </g>

      {/* Foreground tide — bottom 28%, with two soft wavelets */}
      <g ref={tideRef} style={{ willChange: "transform" }}>
        <path d="M 0 660 Q 200 655, 400 665 T 800 660 T 1200 665 T 1440 660 L 1440 900 L 0 900 Z"
              fill="url(#ht-tide)" />
        {/* Foam highlight */}
        <path d="M 0 665 Q 240 660, 480 668 T 960 663 T 1440 666"
              stroke="oklch(0.88 0.04 200)" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.4" />
        <path d="M 0 700 Q 240 698, 480 703 T 960 700 T 1440 702"
              stroke="oklch(0.88 0.04 200)" strokeWidth="0.8" fill="none" strokeLinecap="round" opacity="0.25" />
      </g>
    </svg>
  );
}
