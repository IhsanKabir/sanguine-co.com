"use client";

import { useState, useTransition } from "react";
import { useCart } from "@/lib/cart-context";
import { useLocale, useTranslations } from "next-intl";
import { formatBdt } from "@/lib/utils";
import { validateCoupon } from "@/lib/actions/coupons";

/**
 * Coupon code input. Validates server-side, persists to cart context.
 * Re-validates on subtotal change so a coupon revoked because the cart
 * dropped below min_subtotal is silently cleared.
 */
export default function CouponInput({ compact = false }: { compact?: boolean }) {
  const { coupon, setCoupon, subtotalBdt } = useCart();
  const locale = useLocale() as "en" | "bn";
  const t = useTranslations();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const apply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setError(null);
    startTransition(async () => {
      const r = await validateCoupon(code.trim(), subtotalBdt);
      if (r.ok) {
        setCoupon({ code: r.code, description: r.description, discountBdt: r.discountBdt, freeShipping: r.freeShipping });
        setCode("");
      } else {
        setError(r.error);
      }
    });
  };

  const remove = () => {
    setCoupon(null);
    setError(null);
  };

  if (coupon) {
    return (
      <div className={"coupon-applied " + (compact ? "compact" : "")} role="status">
        <div className="ca-body">
          <div className="ca-code">
            <b>{coupon.code}</b>
            {coupon.description && <span className="ca-desc"> — {coupon.description}</span>}
          </div>
          <div className="ca-savings">
            {coupon.freeShipping ? t("coupon.freeShipping") : t("coupon.saving", { amount: formatBdt(coupon.discountBdt, locale) })}
          </div>
        </div>
        <button type="button" className="ca-remove" onClick={remove} aria-label={t("coupon.remove")}>✕</button>
      </div>
    );
  }

  return (
    <form className={"coupon-input " + (compact ? "compact" : "")} onSubmit={apply}>
      <input
        type="text"
        placeholder={t("coupon.placeholder")}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        autoComplete="off"
        spellCheck={false}
        aria-label={t("coupon.placeholder")}
      />
      <button type="submit" disabled={pending || code.trim().length < 2}>
        {pending ? "…" : t("common.apply")}
      </button>
      {error && <p className="ci-error">{error}</p>}
    </form>
  );
}
