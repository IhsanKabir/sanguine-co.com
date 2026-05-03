import type { ReactNode } from "react";

type Props = {
  /** Tiny uppercase tag above the headline (e.g. "BOUTIQUE", "ATELIER"). */
  kicker?: string;
  /** Display name — large serif italic. */
  name: string;
  /** Optional sub-line (description, blurb). */
  blurb?: string;
  /** Right-side slot for actions, breadcrumbs, etc. */
  trailing?: ReactNode;
};

/**
 * Reusable oceanic header band for non-home pages — extends the homepage's
 * oceanic register to /shop, /cart, /account, /wishlist, /sign-in. Soft
 * sea-tinted gradient, gold-deep kicker, large serif name. Same vocabulary
 * as the home hero so visitors don't feel like they walked into a different
 * site after the first click.
 */
export default function OceanicBand({ kicker, name, blurb, trailing }: Props) {
  return (
    <div
      className="oceanic-band"
      style={{
        position: "relative",
        padding: "44px 32px 32px",
        marginBottom: 24,
        background: "linear-gradient(180deg, oklch(0.97 0.015 200) 0%, var(--cream) 100%)",
        borderBottom: "1px solid var(--line)",
      }}
    >
      {/* Faint horizon rule — the "tide line" thread that runs through all
       * customer-facing pages, picking up the gold accent. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: 32,
          right: 32,
          bottom: -1,
          height: 1,
          background:
            "linear-gradient(90deg, transparent 0%, var(--gold) 18%, var(--gold) 82%, transparent 100%)",
          opacity: 0.55,
        }}
      />
      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: trailing ? "1fr auto" : "1fr",
          alignItems: "end",
          gap: 24,
        }}
      >
        <div>
          {kicker && (
            <div
              style={{
                fontSize: 11,
                letterSpacing: ".3em",
                color: "var(--gold-deep)",
                marginBottom: 8,
                textTransform: "uppercase",
              }}
            >
              {kicker}
            </div>
          )}
          <h1
            className="serif"
            style={{
              fontSize: 56,
              margin: 0,
              color: "var(--purple-900)",
              fontWeight: 400,
              lineHeight: 1.05,
              letterSpacing: "-0.01em",
            }}
          >
            {name}
          </h1>
          {blurb && (
            <p
              style={{
                fontSize: 15,
                color: "var(--ink-soft)",
                margin: "12px 0 0",
                maxWidth: 520,
                lineHeight: 1.6,
              }}
            >
              {blurb}
            </p>
          )}
        </div>
        {trailing && <div>{trailing}</div>}
      </div>
    </div>
  );
}
