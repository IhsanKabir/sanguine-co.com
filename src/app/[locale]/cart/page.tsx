"use client";

import { useCart } from "@/lib/cart-context";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import { formatBdt } from "@/lib/utils";
import Composition from "@/components/storefront/Composition";
import Icon from "@/components/storefront/Icon";
import CouponInput from "@/components/storefront/CouponInput";
import OceanicBand from "@/components/storefront/OceanicBand";

const FREE_THRESHOLD = 3000;

export default function CartPage() {
  const t = useTranslations();
  const locale = useLocale() as "en" | "bn";
  const { items, inc, dec, remove, subtotalBdt, itemKey, hydrated, coupon } = useCart();
  const discount = coupon?.discountBdt ?? 0;
  const afterDiscount = Math.max(0, subtotalBdt - discount);

  if (!hydrated) {
    return <section className="section"><p>Loading…</p></section>;
  }

  if (items.length === 0) {
    return (
      <section className="section" style={{ minHeight: "50vh" }}>
        <div className="empty-state">
          <Icon name="bag" size={36} />
          <h3>{t("cart.empty")}</h3>
          <p>{t("cart.emptySub")}</p>
          <Link href="/" className="btn btn-primary" style={{ marginTop: 14 }}>
            {t("checkout.returnHome")}
          </Link>
        </div>
      </section>
    );
  }

  const shippingNote = subtotalBdt >= FREE_THRESHOLD ? t("cart.shippingFree") : "calculated at checkout";

  return (
    <section className="section" style={{ maxWidth: 1100 }}>
      <OceanicBand
        kicker={t("cart.subtotal")}
        name={t("cart.title")}
      />
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 24 }}>
        <div>
          {items.map((i) => {
            const k = itemKey(i);
            return (
              <div key={k} className="cart-line" style={{ background: "white", padding: 16, marginBottom: 12, border: "1px solid var(--line)" }}>
                <Composition cat={i.cat} sku={i.sku} name={i.name} small style={{ aspectRatio: "3/4" }} />
                <div>
                  <Link href={`/product/${i.slug}`} className="name">{i.name}</Link>
                  <div className="meta">{i.color || ""}{i.size ? ` · ${i.size}` : ""}</div>
                  <div className="qty qty-sm" style={{ marginTop: 10 }}>
                    <button onClick={() => dec(k)} aria-label="Decrease">−</button>
                    <span>{i.qty}</span>
                    <button onClick={() => inc(k)} aria-label="Increase">+</button>
                  </div>
                  <div className="rm" onClick={() => remove(k)} role="button" tabIndex={0}>{t("cart.remove")}</div>
                </div>
                <div className="price">{formatBdt(i.priceBdt * i.qty, locale)}</div>
              </div>
            );
          })}
        </div>
        <div className="panel" style={{ position: "sticky", top: 100, alignSelf: "start" }}>
          <h3>Order Summary</h3>
          <CouponInput />
          <div className="totals" style={{ marginTop: 16 }}>
            <div className="r"><span>{t("cart.subtotal")}</span><span>{formatBdt(subtotalBdt, locale)}</span></div>
            {discount > 0 && (
              <div className="r" style={{ color: "oklch(0.45 0.14 145)" }}>
                <span>Discount · {coupon?.code}</span>
                <span>− {formatBdt(discount, locale)}</span>
              </div>
            )}
            <div className="r"><span>{t("cart.shipping")}</span><span>{coupon?.freeShipping ? t("cart.shippingFree") : shippingNote}</span></div>
            <div className="r grand"><span>{t("cart.total")}</span><span>{formatBdt(afterDiscount, locale)}</span></div>
          </div>
          <Link href="/checkout" className="btn btn-primary btn-block" style={{ marginTop: 18 }}>
            {t("cart.checkout")} <Icon name="arrow" size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}
