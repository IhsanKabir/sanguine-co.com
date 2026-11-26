import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { priceDisplayText, type PriceDisplay } from "@/lib/pricing";
import { localizeEstimate } from "@/lib/delivery";

type Props = {
  slug: string;
  estimatedDelivery?: string | null;
  /** Flowers (Dhaka only): the estimate reads "…, usually the same day". */
  sameDayUsual?: boolean;
  /** Quotation-model price state: fixed / estimate range / quote-only. */
  display: PriceDisplay;
  /** Deposit % when the piece goes out today or tomorrow (product override ?? global setting). */
  depositPct: number;
  /** Deposit % for a later date, when it is lower (clause 3.2.10 caps it at 10%). */
  laterDepositPct?: number;
  locale: string;
  variant?: "primary" | "secondary";
};

export default function PreorderButton({
  slug,
  estimatedDelivery,
  sameDayUsual = false,
  display,
  depositPct,
  laterDepositPct,
  locale,
  variant = "primary",
}: Props) {
  const t = useTranslations();
  const priceText = priceDisplayText(display, locale as "en" | "bn");

  return (
    <div style={{ marginBottom: 24 }}>
      <Link
        href={`/preorder/product/${slug}`}
        className={variant === "primary" ? "btn btn-primary" : "btn btn-ghost"}
        style={{ display: "block", textAlign: "center", padding: "14px 24px", letterSpacing: ".08em" }}
      >
        {t("preorder.cta")}
      </Link>
      <div style={{ marginTop: 8, fontSize: 12, color: "var(--ink-soft)", textAlign: "center", lineHeight: 1.6 }}>
        {priceText ? (
          <div style={{ color: "var(--gold-deep)", fontWeight: 500 }}>
            {t("preorder.priceLine", { price: priceText })}
            {display.kind === "estimate" && (
              <span style={{ fontWeight: 400 }}>{t("preorder.estimatedSuffix")}</span>
            )}
          </div>
        ) : (
          <div style={{ color: "var(--gold-deep)", fontWeight: 500 }}>{t("preorder.quoteOnly")}</div>
        )}
        <div>
          {laterDepositPct !== undefined && laterDepositPct < depositPct
            ? t("preorder.depositByDate", { pct: depositPct, later: laterDepositPct })
            : t("preorder.deposit", { pct: depositPct })}
        </div>
        {estimatedDelivery && (
          <div>{t("preorder.estimatedDelivery", { when: sameDayUsual
            ? t("pdp.usuallySameDay", { when: localizeEstimate(estimatedDelivery, locale as "en" | "bn") })
            : localizeEstimate(estimatedDelivery, locale as "en" | "bn") })}</div>
        )}
      </div>
    </div>
  );
}
