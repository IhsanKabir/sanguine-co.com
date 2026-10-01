"use client";

import { useState, useTransition, useEffect } from "react";
import { useCart } from "@/lib/cart-context";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { useRouter } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import { formatBdt } from "@/lib/utils";
import { createCodOrder, startOnlinePayment } from "@/lib/actions/orders";
import { track } from "@/lib/actions/track";
import Composition from "@/components/storefront/Composition";
import Icon from "@/components/storefront/Icon";
import CouponInput from "@/components/storefront/CouponInput";

import { shippingFor } from "@/lib/pricing";
import { estimatedArrival, formatArrival } from "@/lib/delivery";
import { useShippingRules } from "@/lib/shipping-rules-context";

type Prefill = {
  fullName: string;
  email: string;
  phone: string;
  line1: string;
  area: string;
  city: string;
  postcode: string;
};

export default function CheckoutForm({
  prefill,
  onlinePayment = false,
  paymentNotice = null,
}: {
  prefill?: Prefill;
  /** SSLCommerz configured on the server (lib/payments/sslcommerz.ts). */
  onlinePayment?: boolean;
  /** Set when the shopper is back from a failed / cancelled gateway payment. */
  paymentNotice?: "failed" | "cancelled" | null;
}) {
  const t = useTranslations();
  const locale = useLocale() as "en" | "bn";
  const router = useRouter();
  const { items, subtotalBdt, clear, hydrated: cartLoaded, coupon } = useCart();
  // Matches the server's loading markup on the hydration render (see useHydrated).
  const hydrated = useHydrated() && cartLoaded;
  const shippingRules = useShippingRules();
  const [step, setStep] = useState<1 | 2>(1);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [c, setC] = useState({
    fullName: prefill?.fullName ?? "",
    email: prefill?.email ?? "",
    phone: prefill?.phone ?? "",
  });
  const [s, setS] = useState({
    line1: prefill?.line1 ?? "",
    line2: "",
    area: prefill?.area ?? "",
    city: prefill?.city ?? "Dhaka",
    district: "",
    division: "Dhaka",
    postcode: prefill?.postcode ?? "",
  });
  const [notes, setNotes] = useState("");
  const [method, setMethod] = useState<"cod" | "online">("cod");
  const [redirecting, setRedirecting] = useState(false);

  const isDhaka = s.city.toLowerCase().includes("dhaka");
  // Same function createCodOrder charges with.
  const baseShipping = shippingFor(shippingRules, s.city, subtotalBdt);
  const shipping = coupon?.freeShipping ? 0 : baseShipping;

  // Same estimate as the product page (lib/delivery.ts, from /legal/shipping).
  const estArrival = formatArrival(estimatedArrival(new Date(), isDhaka), locale);
  const discount = coupon?.discountBdt ?? 0;
  const total = Math.max(0, subtotalBdt - discount) + shipping;

  // Track checkout_start once when the form first renders with items
  useEffect(() => {
    if (hydrated && items.length > 0) {
      track({
        type: "checkout_start",
        payload: { items: items.length, subtotalBdt },
        path: "/checkout",
      }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  if (!hydrated) return <p>{t("common.loading")}</p>;
  if (items.length === 0) {
    return (
      <div className="empty-state">
        <Icon name="bag" size={36} />
        <h3>{t("cart.empty")}</h3>
      </div>
    );
  }

  const validateStep1 = () => {
    const errs: Record<string, string> = {};
    if (c.fullName.trim().length < 2) errs.fullName = t("checkout.errName");
    if (!c.email.includes("@") || !c.email.includes(".")) errs.email = t("checkout.errEmail");
    const digits = c.phone.replace(/\D/g, "");
    if (digits.length < 10) errs.phone = t("checkout.errPhone");
    if (s.line1.trim().length < 2) errs.line1 = t("checkout.errAddress");
    if (s.city.trim().length < 2) errs.city = t("checkout.errCity");
    setFieldErrors(errs);
    return Object.keys(errs).length === 0 ? null : t("checkout.errFix");
  };

  const onPlace = () => {
    const v = validateStep1();
    if (v) { setError(v); return; }
    setError(null);
    const input = {
      customer: { fullName: c.fullName.trim(), email: c.email.trim(), phone: c.phone.trim() },
      shipping: s,
      items: items.map((i) => ({ productId: i.productId, qty: i.qty, color: i.color, size: i.size })),
      couponCode: coupon?.code || null,
      notes: notes || null,
    };
    startTransition(async () => {
      if (method === "online") {
        const res = await startOnlinePayment(input, locale);
        if (!res.ok) { setError(res.error); return; }
        // The bag is kept until the shopper is back on the order page, so a
        // failed or cancelled payment does not lose it (ClearCartOnMount).
        setRedirecting(true);
        window.location.assign(res.gatewayUrl);
        return;
      }
      const res = await createCodOrder(input);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      clear();
      // ?t= lets the (ownership-gated) confirmation page open for guests.
      router.push(`/order/${res.number}?t=${res.trackingToken}`);
    });
  };

  return (
    <div className="checkout-grid">
      <div>
        {paymentNotice && (
          <div role="alert" style={{ marginBottom: 18, padding: "12px 16px", background: "#fdf3f0", border: "1px solid #e5b8ab", color: "#7a2e1c", fontSize: 13, lineHeight: 1.6 }}>
            {paymentNotice === "cancelled" ? t("checkout.paymentCancelled") : t("checkout.paymentFailed")}
          </div>
        )}
        <div className="step-bar">
          {[t("checkout.stepAddress"), t("checkout.stepPayment"), t("checkout.stepConfirmation")].map((n, i) => (
            <div key={n} className={"step " + (step === i + 1 ? "active" : step > i + 1 ? "done" : "")}>
              <span className="num">0{i + 1}</span>{n}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="panel">
            <h3>{t("checkout.stepAddress")}</h3>
            <div className="row">
              <div className="field">
                <label>{t("checkout.fullName")}</label>
                <input autoComplete="name" value={c.fullName} onChange={(e) => { setC({ ...c, fullName: e.target.value }); setFieldErrors((fe) => ({ ...fe, fullName: "" })); }} placeholder={t("checkout.namePlaceholder")} aria-invalid={!!fieldErrors.fullName} />
                {fieldErrors.fullName && <span className="field-err">{fieldErrors.fullName}</span>}
              </div>
              <div className="field">
                <label>{t("checkout.email")}</label>
                <input type="email" autoComplete="email" inputMode="email" value={c.email} onChange={(e) => { setC({ ...c, email: e.target.value }); setFieldErrors((fe) => ({ ...fe, email: "" })); }} placeholder={t("common.emailPlaceholder")} aria-invalid={!!fieldErrors.email} />
                {fieldErrors.email && <span className="field-err">{fieldErrors.email}</span>}
              </div>
            </div>
            <div className="row">
              <div className="field" style={{ gridColumn: "1/-1" }}>
                <label>{t("checkout.phone")}</label>
                <input type="tel" inputMode="tel" autoComplete="tel" value={c.phone} onChange={(e) => { setC({ ...c, phone: e.target.value }); setFieldErrors((fe) => ({ ...fe, phone: "" })); }} placeholder="+8801XXXXXXXXX" aria-invalid={!!fieldErrors.phone} />
                {fieldErrors.phone && <span className="field-err">{fieldErrors.phone}</span>}
              </div>
            </div>
            <div className="row">
              <div className="field" style={{ gridColumn: "1/-1" }}>
                <label>{t("checkout.address")}</label>
                <input autoComplete="street-address" value={s.line1} onChange={(e) => { setS({ ...s, line1: e.target.value }); setFieldErrors((fe) => ({ ...fe, line1: "" })); }} placeholder={t("checkout.addressPlaceholder")} aria-invalid={!!fieldErrors.line1} />
                {fieldErrors.line1 && <span className="field-err">{fieldErrors.line1}</span>}
              </div>
            </div>
            <div className="row row-3">
              <div className="field">
                <label>{t("checkout.area")}</label>
                <input value={s.area} onChange={(e) => setS({ ...s, area: e.target.value })} placeholder={t("checkout.areaPlaceholder")} />
              </div>
              <div className="field">
                <label>{t("checkout.city")}</label>
                <input value={s.city} onChange={(e) => { setS({ ...s, city: e.target.value }); setFieldErrors((fe) => ({ ...fe, city: "" })); }} placeholder={t("checkout.cityPlaceholder")} aria-invalid={!!fieldErrors.city} />
                {fieldErrors.city && <span className="field-err">{fieldErrors.city}</span>}
              </div>
              <div className="field">
                <label>{t("checkout.postcode")}</label>
                <input inputMode="numeric" autoComplete="postal-code" value={s.postcode} onChange={(e) => setS({ ...s, postcode: e.target.value })} placeholder="1212" />
              </div>
            </div>
            <div className="row"><div className="field" style={{ gridColumn: "1/-1" }}><label>{t("checkout.notesLabel")}</label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("checkout.notesPlaceholder")}/></div></div>
            <button className="btn btn-primary" style={{ marginTop: 18 }} onClick={() => {
              const v = validateStep1();
              if (v) { setError(v); return; }
              setError(null);
              setStep(2);
            }}>
              {t("checkout.continue")} <Icon name="arrow" size={14}/>
            </button>
            {error && <p style={{ color: "var(--err)", fontSize: 13, marginTop: 12 }}>{error}</p>}
          </div>
        )}

        {step === 2 && (
          <div className="panel">
            <h3>{t("checkout.stepPayment")}</h3>
            <div role="radiogroup" aria-label={t("checkout.stepPayment")}>
              <button
                type="button"
                role="radio"
                aria-checked={method === "cod"}
                className={"pay-opt" + (method === "cod" ? " active" : "")}
                style={{ marginBottom: 10, width: "100%", textAlign: "left", background: method === "cod" ? undefined : "white" }}
                onClick={() => setMethod("cod")}
              >
                <div className="radio" />
                <div>
                  <div className="name">{t("checkout.payCod")}</div>
                  <div className="sub">{t("checkout.payCodSub")}</div>
                </div>
                <div className="logos"><span>{t("checkout.cashBadge")}</span></div>
              </button>
              {onlinePayment && (
                <button
                  type="button"
                  role="radio"
                  aria-checked={method === "online"}
                  className={"pay-opt" + (method === "online" ? " active" : "")}
                  style={{ marginBottom: 10, width: "100%", textAlign: "left", background: method === "online" ? undefined : "white" }}
                  onClick={() => setMethod("online")}
                >
                  <div className="radio" />
                  <div>
                    <div className="name">{t("checkout.payOnline")}</div>
                    <div className="sub">{t("checkout.payOnlineSub")}</div>
                  </div>
                  <div className="logos"><span>{t("checkout.onlineBadge")}</span></div>
                </button>
              )}
            </div>
            <div style={{ marginTop: 18, padding: 18, background: "var(--purple-50)", border: "1px solid var(--purple-200)" }}>
              <div style={{ fontFamily: "var(--serif)", fontSize: 18, color: "var(--purple-900)", marginBottom: 6 }}>
                {method === "online" ? t("checkout.payOnline") : t("checkout.payCod")}
              </div>
              <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>
                {method === "online"
                  ? t.rich("checkout.onlineNote", { amount: formatBdt(total, locale), b: (c) => <b style={{ color: "var(--purple-900)" }}>{c}</b> })
                  : t.rich("checkout.keepReady", { amount: formatBdt(total, locale), b: (c) => <b style={{ color: "var(--purple-900)" }}>{c}</b> })}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button className="btn btn-ghost" onClick={() => setStep(1)} disabled={pending}>← {t("checkout.back")}</button>
              <button className="btn btn-gold" style={{ flex: 1 }} onClick={onPlace} disabled={pending || redirecting}>
                <Icon name="check" size={14}/>{" "}
                {redirecting
                  ? t("checkout.redirecting")
                  : pending
                  ? t("checkout.placing")
                  : method === "online"
                  ? t("checkout.payNow", { amount: formatBdt(total, locale) })
                  : `${t("checkout.placeOrder")} · ${formatBdt(total, locale)}`}
              </button>
            </div>
            {error && <p style={{ color: "var(--err)", fontSize: 13, marginTop: 12 }}>{error}</p>}
          </div>
        )}
      </div>

      <div>
        <div className="panel checkout-panel">
          <h3>{t("cart.orderSummary")}</h3>
          {items.map((i, idx) => (
            <div key={idx} style={{ display: "grid", gridTemplateColumns: "56px 1fr auto", gap: 12, marginBottom: 12, alignItems: "start" }}>
              <div style={{ aspectRatio: "3/4" }}>
                <Composition cat={i.cat} sku={i.sku} name={i.name} small/>
              </div>
              <div>
                <div className="serif" style={{ fontSize: 15, color: "var(--purple-900)" }}>{i.name}</div>
                <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>
                  {i.color || ""}{i.size ? ` · ${i.size}` : ""} · {t("checkout.qty", { qty: i.qty })}
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{formatBdt(i.priceBdt * i.qty, locale)}</div>
            </div>
          ))}
          <div style={{ borderTop: "1px solid var(--line)", paddingTop: 16, marginTop: 8 }}>
            <CouponInput compact />
            <div className="totals" style={{ marginTop: 16 }}>
              <div className="r"><span className="muted">{t("cart.subtotal")}</span><span>{formatBdt(subtotalBdt, locale)}</span></div>
              {discount > 0 && (
                <div className="r" style={{ color: "oklch(0.45 0.14 145)" }}>
                  <span className="muted">{t("cart.discountLine", { code: coupon?.code ?? "" })}</span>
                  <span>− {formatBdt(discount, locale)}</span>
                </div>
              )}
              <div className="r"><span className="muted">{t("cart.shipping")}</span><span>{shipping === 0 ? t("cart.shippingFree") : formatBdt(shipping, locale)}</span></div>
              <div className="r grand"><span>{t("cart.total")}</span><span>{formatBdt(total, locale)}</span></div>
              <div className="r" style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
                <span className="muted" style={{ fontSize: 11, letterSpacing: ".06em", textTransform: "uppercase" }}>{t("checkout.estArrival")}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--purple-900)" }}>{estArrival}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
