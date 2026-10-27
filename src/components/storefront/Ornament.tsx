"use client";

/**
 * Fineliner ornaments rendered as inline SVG. Three variants: `tide-line`,
 * `spiral`, `frond`: each ~80px tall. Used between major sections to give
 * the page a sense of pause without a heavy divider. Spare, geometric, hand-
 * drawn flavour but disciplined (no Disney-Celtic kitsch).
 *
 * Each ornament has a slow inhale-exhale animation (12-16s cycle) so it
 * gently breathes on screen. Honours `prefers-reduced-motion`: animation is
 * paused via the global media query at the bottom of motion.css.
 */
type Variant = "tide-line" | "spiral" | "frond";

export default function Ornament({ variant = "tide-line", size = 80 }: { variant?: Variant; size?: number }) {
  return (
    <div
      className={`ssg-ornament ssg-ornament-${variant}`}
      aria-hidden="true"
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        margin: "60px 0",
        height: size,
      }}
    >
      {variant === "tide-line"   && <TideLine size={size} />}
      {variant === "spiral"      && <Spiral size={size} />}
      {variant === "frond"       && <Frond size={size} />}
    </div>
  );
}

/** A long horizon-ripple line with a centered gold dot. */
function TideLine({ size }: { size: number }) {
  return (
    <svg width={size * 4} height={size * 0.6} viewBox="0 0 320 48" fill="none">
      <path
        d="M 4 24 Q 40 18, 80 24 T 160 24 T 240 24 T 316 24"
        stroke="var(--purple-700)"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path
        d="M 4 32 Q 40 28, 80 32 T 160 32 T 240 32 T 316 32"
        stroke="var(--purple-600)"
        strokeWidth="0.6"
        strokeLinecap="round"
        opacity="0.35"
      />
      <circle cx="160" cy="24" r="3" fill="var(--gold)" />
      <circle cx="160" cy="24" r="6" fill="none" stroke="var(--gold)" strokeWidth="0.5" opacity="0.4" />
    </svg>
  );
}

/** A simple spiral: Celtic-inspired but kept thin and geometric. */
function Spiral({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <path
        d="M 40 40 m -2 0 a 2 2 0 1 1 4 0 a 2 2 0 1 1 -4 0
           M 40 40 m -7 0 a 7 7 0 1 1 14 0 a 7 7 0 1 1 -14 0
           M 40 40 m -14 0 a 14 14 0 1 1 28 0 a 14 14 0 1 1 -28 0
           M 40 40 m -22 0 a 22 22 0 1 1 44 0 a 22 22 0 1 1 -44 0"
        stroke="var(--purple-700)"
        strokeWidth="0.6"
        opacity="0.5"
      />
      <circle cx="40" cy="40" r="1.5" fill="var(--gold-deep)" />
    </svg>
  );
}

/** A sea-fern frond: single curved stem with three soft fronds. */
function Frond({ size }: { size: number }) {
  return (
    <svg width={size} height={size * 1.3} viewBox="0 0 80 104" fill="none">
      <g stroke="var(--purple-700)" strokeWidth="0.7" strokeLinecap="round" opacity="0.55" fill="none">
        <path d="M 40 100 Q 38 70, 42 50 T 38 8" />
        <path d="M 40 76 Q 28 68, 22 60" />
        <path d="M 40 76 Q 52 68, 58 60" />
        <path d="M 40 56 Q 30 50, 25 44" />
        <path d="M 40 56 Q 50 50, 55 44" />
        <path d="M 40 36 Q 32 32, 28 28" />
        <path d="M 40 36 Q 48 32, 52 28" />
      </g>
      <circle cx="40" cy="8" r="2" fill="var(--gold)" opacity="0.7" />
    </svg>
  );
}
