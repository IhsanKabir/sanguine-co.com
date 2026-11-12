/**
 * Three-layer painted horizon as a hero background (sky with sun and cloud
 * strokes, distant water, foreground tide).
 *
 * Drawn once, not animated. It used to sway and parallax every frame via a
 * requestAnimationFrame loop; SVG <g> layers are not composited, so each
 * frame repainted the whole scene. On phones that kept the main thread busy
 * for seconds after load (Lighthouse total blocking time 3.2 s on /en).
 */
// Drawn twice below: in full (phones) and faded on the left (wide screens),
// switched by CSS (.ht-clouds in extras.css).
const CLOUD_STROKES = (
  <>
    <path d="M -200 200 Q -50 195, 100 200 T 400 195 T 700 198 T 1000 195 T 1300 200 T 1600 198"
          stroke="oklch(0.93 0.025 200)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    <path d="M -200 260 Q 0 258, 200 262 T 600 260 T 1000 258 T 1400 262 T 1800 260"
          stroke="oklch(0.93 0.025 200)" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.7" />
    <path d="M -200 165 Q 100 168, 400 162 T 1000 168 T 1700 162"
          stroke="oklch(0.93 0.025 200)" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.5" />
  </>
);

export default function HeroTide() {
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
        {/* Wide screens: hides the cloud strokes on the left, where the
            headline sits, and shows them over the sun. */}
        <linearGradient id="ht-cloud-fade-g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1440" y2="0">
          <stop offset="0.3" stopColor="black" />
          <stop offset="0.58" stopColor="white" />
        </linearGradient>
        <mask id="ht-cloud-fade">
          <rect x="-400" y="0" width="2400" height="900" fill="url(#ht-cloud-fade-g)" />
        </mask>
        {/* Sun: a soft warm circle */}
        <radialGradient id="ht-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="oklch(0.92 0.10 80)" stopOpacity="0.85" />
          <stop offset="60%" stopColor="oklch(0.85 0.10 75)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="oklch(0.85 0.10 75)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Sky band: top 60% of the viewport */}
      <g>
        <rect x="0" y="0" width="1440" height="560" fill="url(#ht-sky)" />
        {/* Sun, slightly off-centre */}
        <circle cx="980" cy="320" r="220" fill="url(#ht-sun)" />
      </g>

      {/* Cloud strokes across the sky */}
      <g className="ht-clouds" opacity="0.5">{CLOUD_STROKES}</g>
      <g className="ht-clouds-faded" opacity="0.5" mask="url(#ht-cloud-fade)">{CLOUD_STROKES}</g>

      {/* Mid sea: band from 56% to 76% */}
      <g>
        <path d="M 0 540 Q 360 532, 720 540 T 1440 540 L 1440 700 L 0 700 Z" fill="url(#ht-sea)" />
        {/* Horizon ripple */}
        <path d="M 0 545 Q 240 543, 480 547 T 960 545 T 1440 547"
              stroke="oklch(0.93 0.025 200)" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.6" />
      </g>

      {/* Foreground tide: bottom 28%, with two soft wavelets */}
      <g>
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
