import { Link } from "@/i18n/routing";
import { formatBdt } from "@/lib/utils";

type Props = {
  slug: string;
  estimatedDelivery?: string | null;
  preorderPriceBdt?: number | null;
  priceBdt: number;
  locale: string;
  variant?: "primary" | "secondary";
};

export default function PreorderButton({
  slug,
  estimatedDelivery,
  preorderPriceBdt,
  priceBdt,
  locale,
  variant = "primary",
}: Props) {
  const displayPrice = preorderPriceBdt ?? priceBdt;
  const hasDifferentPrice = preorderPriceBdt && preorderPriceBdt !== priceBdt;

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
        {hasDifferentPrice && (
          <div style={{ color: "var(--gold-deep)", fontWeight: 500 }}>
            Preorder · {formatBdt(displayPrice, locale as "en" | "bn")}
            {" "}<span style={{ fontWeight: 400, opacity: 0.7 }}>(regular {formatBdt(priceBdt, locale as "en" | "bn")})</span>
          </div>
        )}
        {estimatedDelivery && (
          <div>Estimated delivery · {estimatedDelivery}</div>
        )}
      </div>
    </div>
  );
}
