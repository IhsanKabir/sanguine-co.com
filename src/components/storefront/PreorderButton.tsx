import { Link } from "@/i18n/routing";
import { priceDisplayText, type PriceDisplay } from "@/lib/pricing";

type Props = {
  slug: string;
  estimatedDelivery?: string | null;
  /** Quotation-model price state — fixed / estimate range / quote-only. */
  display: PriceDisplay;
  /** Effective deposit % (product override ?? global setting). */
  depositPct: number;
  locale: string;
  variant?: "primary" | "secondary";
};

export default function PreorderButton({
  slug,
  estimatedDelivery,
  display,
  depositPct,
  locale,
  variant = "primary",
}: Props) {
  const priceText = priceDisplayText(display, locale as "en" | "bn");

  return (
    <div style={{ marginBottom: 24 }}>
      <Link
        href={`/preorder/product/${slug}`}
        className={variant === "primary" ? "btn btn-primary" : "btn btn-ghost"}
        style={{ display: "block", textAlign: "center", padding: "14px 24px", letterSpacing: ".08em" }}
      >
        Preorder this piece
      </Link>
      <div style={{ marginTop: 8, fontSize: 12, color: "var(--ink-soft)", textAlign: "center", lineHeight: 1.6 }}>
        {priceText ? (
          <div style={{ color: "var(--gold-deep)", fontWeight: 500 }}>
            Preorder · {priceText}
            {display.kind === "estimate" && (
              <span style={{ fontWeight: 400, opacity: 0.7 }}> (estimated)</span>
            )}
          </div>
        ) : (
          <div style={{ color: "var(--gold-deep)", fontWeight: 500 }}>Final price confirmed by quotation</div>
        )}
        <div>Reserve with a {depositPct}% deposit of the quoted price</div>
        {estimatedDelivery && (
          <div>Estimated delivery · {estimatedDelivery}</div>
        )}
      </div>
    </div>
  );
}
