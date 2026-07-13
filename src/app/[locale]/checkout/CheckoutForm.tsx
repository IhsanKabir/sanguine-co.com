"use client";

import { useState, useTransition, useEffect } from "react";
import { useCart } from "@/lib/cart-context";
import { useRouter } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import { formatBdt } from "@/lib/utils";
import { createCodOrder } from "@/lib/actions/orders";
import { track } from "@/lib/actions/track";
import Composition from "@/components/storefront/Composition";
import Icon from "@/components/storefront/Icon";
import CouponInput from "@/components/storefront/CouponInput";

const FREE_THRESHOLD = 3000;
const FLAT_DHAKA = 80;
const FLAT_OUTSIDE = 150;

type Prefill = {
  fullName: string;
  email: string;
  phone: string;
  line1: string;
  area: string;
  city: string;
  postcode: string;
};

export default function CheckoutForm({ prefill }: { prefill?: Prefill }) {
  const t = useTranslations();
  const locale = useLocale() as "en" | "bn";
  const router = useRouter();
  const { items, subtotalBdt, clear, hydrated, coupon } = useCart();
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

  const isDhaka = s.city.toLowerCase().includes("dhaka");
  const baseShipping = subtotalBdt >= FREE_THRESHOLD ? 0 : (isDhaka ? FLAT_DHAKA : FLAT_OUTSIDE);
  const shipping = coupon?.freeShipping ? 0 : baseShipping;

  // Estimated arrival: 1–2 days handling + 1–3 transit inside Dhaka, 3–5 outside.
  const estArrival = (() => {
    const d = new Date();
    d.setDate(d.getDate() + (isDhaka ? 4 : 7));
    return d.toLocaleDateString("en-BD", { weekday: "short", day: "numeric", month: "short" });
  })();
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

  if (!hydrated) return <p>Loading…</p>;
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
    if (c.fullName.trim().length < 2) errs.fullName = "Please enter your full name.";
    if (!c.email.includes("@") || !c.email.includes(".")) errs.email = "Enter a valid email address — e.g. you@mail.com";
    const digits = c.phone.replace(/\D/g, "");
    if (digits.length < 10) errs.phone = "Enter a valid phone number (used for delivery updates only).";
    if (s.line1.trim().length < 2) errs.line1 = "Enter your street address.";
    if (s.city.trim().length < 2) errs.city = "Enter your city.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0 ? null : "Please correct the fields above.";
  };

  const onPlace = () => {
    const v = validateStep1();
    if (v) { setError(v); return; }
    setError(null);
    startTransition(async () => {
      const res = await createCodOrder({
        customer: { fullName: c.fullName.trim(), email: c.email.trim(), phone: c.phone.trim() },
        shipping: s,
        items: items.map((i) => ({ productId: i.productId, qty: i.qty, color: i.color, size: i.size })),
        couponCode: coupon?.code || null,
        notes: notes || null,
      });
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
                <input value={c.fullName} onChange={(e) => { setC({ ...c, fullName: e.target.value }); setFieldErrors((fe) => ({ ...fe, fullName: "" })); }} placeholder="Adelaide Voss" aria-invalid={!!fieldErrors.fullName} />
                {fieldErrors.fullName && <span className="field-err">{fieldErrors.fullName}</span>}
              </div>
              <div className="field">
                <label>{t("checkout.email")}</label>
                <input type="email" value={c.email} onChange={(e) => { setC({ ...c, email: e.target.value }); setFieldErrors((fe) => ({ ...fe, email: "" })); }} placeholder="you@mail.co" aria-invalid={!!fieldErrors.email} />
                {fieldErrors.email && <span className="field-err">{fieldErrors.email}</span>}
              </div>
            </div>
            <div className="row">
              <div className="field" style={{ gridColumn: "1/-1" }}>
                <label>{t("checkout.phone")}</label>
                <input value={c.phone} onChange={(e) => { setC({ ...c, phone: e.target.value }); setFieldErrors((fe) => ({ ...fe, phone: "" })); }} placeholder="+8801XXXXXXXXX" aria-invalid={!!fieldErrors.phone} />
                {fieldErrors.phone && <span className="field-err">{fieldErrors.phone}</span>}
              </div>
            </div>
            <div className="row">
              <div className="field" style={{ gridColumn: "1/-1" }}>
                <label>{t("checkout.address")}</label>
                <input value={s.line1} onChange={(e) => { setS({ ...s, line1: e.target.value }); setFieldErrors((fe) => ({ ...fe, line1: "" })); }} placeholder="House 12, Road 5, Gulshan" aria-invalid={!!fieldErrors.line1} />
                {fieldErrors.line1 && <span className="field-err">{fieldErrors.line1}</span>}
              </div>
            </div>
            <div className="row row-3">
              <div className="field">
                <label>{t("checkout.area")}</label>
                <input value={s.area} onChange={(e) => setS({ ...s, area: e.target.value })} placeholder="Gulshan" />
              </div>
              <div className="field">
                <label>{t("checkout.city")}</label>
                <input value={s.city} onChange={(e) => { setS({ ...s, city: e.target.value }); setFieldErrors((fe) => ({ ...fe, city: "" })); }} placeholder="Dhaka" aria-invalid={!!fieldErrors.city} />
                {fieldErrors.city && <span className="field-err">{fieldErrors.city}</span>}
              </div>
              <div className="field">
                <label>{t("checkout.postcode")}</label>
                <input value={s.postcode} onChange={(e) => setS({ ...s, postcode: e.target.value })} placeholder="1212" />
              </div>
            </div>
            <div className="row"><div className="field" style={{ gridColumn: "1/-1" }}><label>Order notes (optional)</label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything our courier should know"/></div></div>
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
            <div className="pay-opt active" style={{ marginBottom: 10 }}>
              <div className="radio" />
              <div>
                <div className="name">{t("checkout.payCod")}</div>
                <div className="sub">{t("checkout.payCodSub")}</div>
              </div>
              <div className="logos"><span>CASH</span></div>
            </div>
            <div style={{ marginTop: 18, padding: 18, background: "var(--purple-50)", border: "1px solid var(--purple-200)" }}>
              <div style={{ fontFamily: "var(--serif)", fontSize: 18, color: "var(--purple-900)", marginBottom: 6 }}>
                {t("checkout.payCod")}
              </div>
              <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>
                Keep <b style={{ color: "var(--purple-900)" }}>{formatBdt(total, locale)}</b> ready for our courier.
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button className="btn btn-ghost" onClick={() => setStep(1)} disabled={pending}>← {t("checkout.back")}</button>
              <button className="btn btn-gold" style={{ flex: 1 }} onClick={onPlace} disabled={pending}>
                <Icon name="check" size={14}/> {pending ? "Placing…" : `${t("checkout.placeOrder")} · ${formatBdt(total, locale)}`}
              </button>
            </div>
            {error && <p style={{ color: "var(--err)", fontSize: 13, marginTop: 12 }}>{error}</p>}
          </div>
        )}
      </div>

      <div>
        <div className="panel checkout-panel">
          <h3>Order Summary</h3>
          {items.map((i, idx) => (
            <div key={idx} style={{ display: "grid", gridTemplateColumns: "56px 1fr auto", gap: 12, marginBottom: 12, alignItems: "start" }}>
              <div style={{ aspectRatio: "3/4" }}>
                <Composition cat={i.cat} sku={i.sku} name={i.name} small/>
              </div>
              <div>
                <div className="serif" style={{ fontSize: 15, color: "var(--purple-900)" }}>{i.name}</div>
                <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>
                  {i.color || ""}{i.size ? ` · ${i.size}` : ""} · Qty {i.qty}
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{formatBdt(i.priceBdt * i.qty, locale)}</div>
            </div>
          ))}
          <div style={{ borderTop: "1px solid var(--line)", paddingTop: 16, marginTop: 8 }}>
            <CouponInput compact />
            <div className="totals" style={{ marginTop: 16 }}>
              <div className="r"><span className="muted">Subtotal</span><span>{formatBdt(subtotalBdt, locale)}</span></div>
              {discount > 0 && (
                <div className="r" style={{ color: "oklch(0.45 0.14 145)" }}>
                  <span className="muted">Discount · {coupon?.code}</span>
                  <span>− {formatBdt(discount, locale)}</span>
                </div>
              )}
              <div className="r"><span className="muted">Shipping</span><span>{shipping === 0 ? t("cart.shippingFree") : formatBdt(shipping, locale)}</span></div>
              <div className="r grand"><span>{t("cart.total")}</span><span>{formatBdt(total, locale)}</span></div>
              <div className="r" style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
                <span className="muted" style={{ fontSize: 11, letterSpacing: ".06em", textTransform: "uppercase" }}>Est. arrival</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--purple-900)" }}>{estArrival}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
