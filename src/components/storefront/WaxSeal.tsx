"use client";

/**
 * Hand-rolled SVG-keyframe wax-seal animation. Plays once on mount, ~3
 * seconds total. The sequence:
 *   0.0s: paper appears (parchment underlay fades in)
 *   0.4s: molten wax pour-blob drops + spreads (scale 0 → 1.05 → 1)
 *   1.4s: stamp pressure (slight darken + radial glow)
 *   1.9s: crest emerges from the wax (opacity 0 → 1, gentle scale-in)
 *   2.6s: settle (subtle bob, finish)
 *
 * No JS animation library required. Uses CSS @keyframes + animation-delay
 * for sequencing. Honours `prefers-reduced-motion`: skips animation, paints
 * the final frame immediately.
 *
 * Used on /order/[number] above "Thank you, {name}". The single most
 * emotional moment in the storefront flow: worth the careful production.
 */
export default function WaxSeal({ size = 200 }: { size?: number }) {
  return (
    <div
      aria-hidden="true"
      className="ssg-waxseal"
      style={{
        width: size,
        height: size,
        position: "relative",
        margin: "0 auto",
      }}
    >
      <svg viewBox="0 0 200 200" width={size} height={size}>
        <defs>
          {/* The wax mass: radial darken so it has depth */}
          <radialGradient id="seal-wax" cx="0.5" cy="0.4" r="0.6">
            <stop offset="0%" stopColor="oklch(0.40 0.14 25)" />
            <stop offset="55%" stopColor="oklch(0.32 0.16 25)" />
            <stop offset="100%" stopColor="oklch(0.22 0.14 22)" />
          </radialGradient>
          {/* The crest highlight: soft gold from above */}
          <radialGradient id="seal-glow" cx="0.5" cy="0.35" r="0.55">
            <stop offset="0%" stopColor="oklch(0.78 0.10 80 / 0.45)" />
            <stop offset="80%" stopColor="oklch(0.78 0.10 80 / 0)" />
          </radialGradient>
          {/* Crisp gold for the crest itself */}
          <linearGradient id="seal-crest" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.85 0.13 85)" />
            <stop offset="100%" stopColor="oklch(0.65 0.13 75)" />
          </linearGradient>
        </defs>

        {/* Paper underlay: kept very subtle, just gives the seal something
            to "press into" rather than floating in space. */}
        <circle cx="100" cy="100" r="92" fill="oklch(0.95 0.012 75)" className="seal-paper" />

        {/* The wax disc: molten irregular edge, scales in with a slight
            overshoot to feel like it's spreading on impact. */}
        <path
          className="seal-wax"
          d="M 100 22
             C 138 22, 168 48, 174 86
             C 178 112, 174 130, 162 148
             C 150 166, 130 178, 100 178
             C 70 178, 50 166, 38 148
             C 26 130, 22 112, 26 86
             C 32 48, 62 22, 100 22 Z"
          fill="url(#seal-wax)"
        />

        {/* Inner ring: the impression edge */}
        <circle cx="100" cy="100" r="62" fill="none" stroke="oklch(0.20 0.10 22)" strokeWidth="1" opacity="0.4" className="seal-ring" />

        {/* Glow under the crest */}
        <circle cx="100" cy="100" r="48" fill="url(#seal-glow)" className="seal-glow" />

        {/* The crest: a stylised "S" inside two concentric circles, kept
            geometric so it reads as a signet rather than a royal coat. */}
        <g className="seal-crest">
          <circle cx="100" cy="100" r="38" fill="none" stroke="url(#seal-crest)" strokeWidth="1" />
          <circle cx="100" cy="100" r="32" fill="none" stroke="url(#seal-crest)" strokeWidth="0.5" opacity="0.6" />
          {/* Stylised S */}
          <path
            d="M 116 84
               C 116 78, 110 74, 100 74
               C 90 74, 84 80, 84 88
               C 84 96, 92 100, 100 102
               C 110 104, 116 108, 116 116
               C 116 124, 110 128, 100 128
               C 90 128, 84 124, 84 118"
            fill="none"
            stroke="url(#seal-crest)"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          {/* Roman numeral year, small, below */}
          <text
            x="100" y="146"
            textAnchor="middle"
            fontFamily="Georgia, serif"
            fontSize="8"
            fill="url(#seal-crest)"
            letterSpacing="2"
          >2026</text>
        </g>

        {/* Two small drips at the bottom: the wax is fresh */}
        <g className="seal-drips">
          <ellipse cx="78" cy="180" rx="3" ry="5" fill="oklch(0.32 0.14 22)" />
          <ellipse cx="124" cy="184" rx="2" ry="4" fill="oklch(0.32 0.14 22)" opacity="0.85" />
        </g>
      </svg>

      <style>{`
        .ssg-waxseal .seal-paper {
          opacity: 0;
          animation: ssg-seal-paper 600ms ease-out 0ms forwards;
        }
        .ssg-waxseal .seal-wax {
          opacity: 0;
          transform-origin: 100px 100px;
          transform: scale(0);
          animation: ssg-seal-wax 900ms cubic-bezier(0.34, 1.4, 0.5, 1) 400ms forwards;
        }
        .ssg-waxseal .seal-ring {
          opacity: 0;
          animation: ssg-seal-ring 600ms ease-out 1300ms forwards;
        }
        .ssg-waxseal .seal-glow {
          opacity: 0;
          animation: ssg-seal-glow 1400ms ease-out 1500ms forwards;
        }
        .ssg-waxseal .seal-crest {
          opacity: 0;
          transform-origin: 100px 100px;
          transform: scale(0.85);
          animation: ssg-seal-crest 800ms cubic-bezier(0.16, 1, 0.3, 1) 1900ms forwards;
        }
        .ssg-waxseal .seal-drips {
          opacity: 0;
          animation: ssg-seal-drips 700ms ease-out 800ms forwards;
        }

        @keyframes ssg-seal-paper { to { opacity: 1; } }
        @keyframes ssg-seal-wax {
          0%   { opacity: 0; transform: scale(0); }
          70%  { opacity: 1; transform: scale(1.05); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes ssg-seal-ring  { to { opacity: 0.4; } }
        @keyframes ssg-seal-glow  {
          0%   { opacity: 0; }
          50%  { opacity: 0.85; }
          100% { opacity: 1; }
        }
        @keyframes ssg-seal-crest {
          0%   { opacity: 0; transform: scale(0.85); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes ssg-seal-drips { to { opacity: 1; } }

        /* Reduced-motion: paint the final frame immediately. */
        @media (prefers-reduced-motion: reduce) {
          .ssg-waxseal .seal-paper,
          .ssg-waxseal .seal-wax,
          .ssg-waxseal .seal-ring,
          .ssg-waxseal .seal-glow,
          .ssg-waxseal .seal-crest,
          .ssg-waxseal .seal-drips {
            opacity: 1 !important;
            transform: none !important;
            animation: none !important;
          }
          .ssg-waxseal .seal-ring { opacity: 0.4 !important; }
        }
      `}</style>
    </div>
  );
}
