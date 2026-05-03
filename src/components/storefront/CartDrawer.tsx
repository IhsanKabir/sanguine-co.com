"use client";

import { useCart } from "@/lib/cart-context";
import { useTranslations, useLocale } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { formatBdt } from "@/lib/utils";
import Composition from "./Composition";
import Icon from "./Icon";
import CouponInput from "./CouponInput";
import { useState, useCallback } from "react";

const FREE_THRESHOLD = 3000;
// Matches the `ssg-cart-line-out` keyframe duration in motion.css. Keeping
// this as a constant so the JS delay and CSS duration stay in sync.
const CART_LINE_OUT_MS = 280;

export default function CartDrawer() {
  const t = useTranslations();
  const locale = useLocale() as "en" | "bn";
  const router = useRouter();
  const { items, saved, open, closeDrawer, inc, dec, remove, subtotalBdt, itemKey, coupon, saveForLater, moveToCart, removeSaved } = useCart();
  // Tracks keys currently animating out so the line stays mounted until the
  // CSS animation finishes. Cleared once the underlying cart state catches up.
  const [leaving, setLeaving] = useState<Set<string>>(new Set());
  const animateAway = useCallback(
    (k: string, action: (k: string) => void) => {
      setLeaving((s) => new Set(s).add(k));
      window.setTimeout(() => {
        action(k);
        setLeaving((s) => {
          const n = new Set(s);
          n.delete(k);
          return n;
        });
      }, CART_LINE_OUT_MS);
    },
    [],
  );
  if (!open) return null;
  const discount = coupon?.discountBdt ?? 0;
  const afterDiscount = Math.max(0, subtotalBdt - discount);

  const remaining = Math.max(0, FREE_THRESHOLD - subtotalBdt);
  const met = remaining === 0;
  const pct = Math.min(100, Math.round((subtotalBdt / FREE_THRESHOLD) * 100));

  const onCheckout = () => { closeDrawer(); router.push("/checkout"); };

  return (
    <>
      <div className="overlay" onClick={closeDrawer} />
      <aside className="drawer" role="dialog" aria-label={t("cart.title")}>
        <div className="drawer-hd">
          <h3>{t("cart.title")} · {items.length}</h3>
          <button className="icon-btn" onClick={closeDrawer} aria-label="Close">
            <Icon name="x" />
          </button>
        </div>

        <div className="drawer-body">
          {items.length === 0 ? (
            <div className="empty-state">
              <Icon name="bag" size={36} />
              <h3>{t("cart.empty")}</h3>
              <p>{t("cart.emptySub")}</p>
            </div>
          ) : (
            <>
              <div className={"ship-bar " + (met ? "met" : "")}>
                <div className="top">
                  <span>
                    {met
                      ? "Complimentary delivery — unlocked"
                      : `${formatBdt(remaining, locale)} to free delivery`}
                  </span>
                  <b>{formatBdt(subtotalBdt, locale)} / {formatBdt(FREE_THRESHOLD, locale)}</b>
                </div>
                <div className="track"><div className="fill" style={{ ["--p" as string]: pct + "%" }} /></div>
              </div>

              {items.map((i) => {
                const k = itemKey(i);
                const isLeaving = leaving.has(k);
                return (
                  <div key={k} className={"cart-line" + (isLeaving ? " removing" : "")}>
                    <Composition cat={i.cat} sku={i.sku} name={i.name} small style={{ aspectRatio: "3/4" }} />
                    <div>
                      <Link href={`/product/${i.slug}`} className="name" onClick={closeDrawer}>
                        {i.name}
                      </Link>
                      <div className="meta">{i.color || ""}{i.size ? ` · ${i.size}` : ""}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
                        <div className="qty qty-sm">
                          <button onClick={() => dec(k)} aria-label="Decrease">−</button>
                          <span>{i.qty}</span>
                          <button onClick={() => inc(k)} aria-label="Increase">+</button>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
                        <div className="rm" onClick={() => animateAway(k, remove)} role="button" tabIndex={0}>{t("cart.remove")}</div>
                        <div className="rm" onClick={() => animateAway(k, saveForLater)} role="button" tabIndex={0} style={{ color: "var(--purple-700)" }}>
                          Save for later
                        </div>
                      </div>
                    </div>
                    <div className="price">{formatBdt(i.priceBdt * i.qty, locale)}</div>
                  </div>
                );
              })}
            </>
          )}

          {saved.length > 0 && (
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".15em", color: "var(--ink-soft)", textTransform: "uppercase", marginBottom: 10 }}>
                Saved for later · {saved.length}
              </div>
              {saved.map((i) => {
                const k = itemKey(i);
                const isLeaving = leaving.has(k);
                return (
                  <div key={k} className={"cart-line" + (isLeaving ? " removing" : "")} style={{ opacity: 0.85 }}>
                    <Composition cat={i.cat} sku={i.sku} name={i.name} small style={{ aspectRatio: "3/4" }} />
                    <div>
                      <Link href={`/product/${i.slug}`} className="name" onClick={closeDrawer}>{i.name}</Link>
                      <div className="meta">{i.color || ""}{i.size ? ` · ${i.size}` : ""}</div>
                      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                        <div className="rm" onClick={() => animateAway(k, moveToCart)} role="button" tabIndex={0} style={{ color: "var(--purple-900)" }}>
                          Move to bag
                        </div>
                        <div className="rm" onClick={() => animateAway(k, removeSaved)} role="button" tabIndex={0}>Remove</div>
                      </div>
                    </div>
                    <div className="price" style={{ color: "var(--ink-soft)" }}>{formatBdt(i.priceBdt, locale)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="drawer-foot">
            <div style={{ padding: "0 24px" }}>
              <CouponInput compact />
            </div>
            <div className="totals" style={{ margin: "16px 0" }}>
              <div className="r">
                <span>{t("cart.subtotal")}</span>
                <span>{formatBdt(subtotalBdt, locale)}</span>
              </div>
              {discount > 0 && (
                <div className="r" style={{ color: "oklch(0.45 0.14 145)" }}>
                  <span>Discount · {coupon?.code}</span>
                  <span>− {formatBdt(discount, locale)}</span>
                </div>
              )}
              <div className="r">
                <span>{t("cart.shipping")}</span>
                <span>
                  {coupon?.freeShipping ? t("cart.shippingFree") : (met ? t("cart.shippingFree") : "calculated at checkout")}
                </span>
              </div>
              <div className="r grand">
                <span>{t("cart.total")}</span>
                <span>{formatBdt(afterDiscount, locale)}</span>
              </div>
            </div>
            <button className="btn btn-primary btn-block" onClick={onCheckout}>
              {t("cart.checkout")} <Icon name="arrow" size={14} />
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
