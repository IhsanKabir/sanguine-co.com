"use client";

import { useState, useTransition } from "react";
import { Link } from "@/i18n/routing";
import { updateCommerceSettings } from "@/lib/actions/admin";
import type { CommerceSettings } from "@/lib/commerce";

type Brand = { name: string; tagline?: string; email?: string; announcement?: string };

type Gateway = { connected: boolean; live: boolean };

export default function SettingsClient({ initialBrand, initialCommerce, gateway, smsConnected }: { initialBrand: Brand; initialCommerce: CommerceSettings; gateway: Gateway; smsConnected: boolean }) {
  const [commerce, setCommerce] = useState({
    preorderDepositPct: String(initialCommerce.preorderDepositPct),
    returnWindowDays: String(initialCommerce.returnWindowDays),
  });
  const [commerceMsg, setCommerceMsg] = useState<string | null>(null);
  const [commercePending, startCommerce] = useTransition();

  const saveCommerce = () => {
    const pct = parseInt(commerce.preorderDepositPct);
    const days = parseInt(commerce.returnWindowDays);
    if (isNaN(pct) || pct < 1 || pct > 100) { setCommerceMsg("Deposit % must be 1–100."); return; }
    if (isNaN(days) || days < 0 || days > 365) { setCommerceMsg("Return window must be 0–365 days."); return; }
    setCommerceMsg(null);
    startCommerce(async () => {
      const res = await updateCommerceSettings({ preorderDepositPct: pct, returnWindowDays: days });
      setCommerceMsg(res.ok ? "Saved — live across the storefront." : "Save failed.");
    });
  };

  // Shipping rules — saved to the same commerce row; the cart, checkout,
  // order total, product pages and /legal/shipping all read them.
  const [ship, setShip] = useState({
    freeShippingThresholdBdt: String(initialCommerce.freeShippingThresholdBdt),
    shippingDhakaBdt: String(initialCommerce.shippingDhakaBdt),
    shippingOutsideBdt: String(initialCommerce.shippingOutsideBdt),
  });
  const [shipMsg, setShipMsg] = useState<string | null>(null);
  const [shipPending, startShip] = useTransition();

  const saveShipping = () => {
    const threshold = Number(ship.freeShippingThresholdBdt);
    const dhaka = Number(ship.shippingDhakaBdt);
    const outside = Number(ship.shippingOutsideBdt);
    const whole = (n: number, max: number) => Number.isInteger(n) && n >= 0 && n <= max;
    if (!whole(threshold, 1_000_000)) { setShipMsg("Free-shipping threshold must be a whole number of taka (0 turns it off)."); return; }
    if (!whole(dhaka, 10_000) || !whole(outside, 10_000)) { setShipMsg("Shipping rates must be whole numbers of taka, 0–10,000."); return; }
    setShipMsg(null);
    startShip(async () => {
      const res = await updateCommerceSettings({
        freeShippingThresholdBdt: threshold,
        shippingDhakaBdt: dhaka,
        shippingOutsideBdt: outside,
      });
      setShipMsg(res.ok ? "Saved — cart, checkout and order totals now use these rates." : "Save failed.");
    });
  };

  // Cash-on-delivery phone check (lib/phone-code.ts) — same commerce row.
  const [codCheck, setCodCheck] = useState({
    on: initialCommerce.codPhoneCheck,
    min: String(initialCommerce.codPhoneCheckMinBdt),
  });
  const [codMsg, setCodMsg] = useState<string | null>(null);
  const [codPending, startCod] = useTransition();
  const saveCodCheck = () => {
    const min = Number(codCheck.min);
    if (!Number.isInteger(min) || min < 0 || min > 1_000_000) { setCodMsg("Minimum must be a whole number of taka (0 = every COD order)."); return; }
    setCodMsg(null);
    startCod(async () => {
      const res = await updateCommerceSettings({ codPhoneCheck: codCheck.on, codPhoneCheckMinBdt: min });
      setCodMsg(res.ok ? "Saved — applies to the next checkout." : "Save failed.");
    });
  };

  return (
    <>
      <h1 className="admin-h1">Settings</h1>
      <p className="admin-sub">Shipping rules, payment methods, locales. Changes apply across the storefront.</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* House details — moved to Editorial */}
        <div className="panel">
          <h3>House details</h3>
          <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 0, lineHeight: 1.6 }}>
            Brand name, tagline, announcement bar and every other customer-facing string now live in
            {" "}<Link href="/admin/editorial" style={{ color: "var(--purple-800)", borderBottom: "1px solid var(--gold)" }}>Editorial</Link>,
            edited per locale (English + বাংলা).
          </p>
          <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 10 }}>
            Currently saved contact email: <b style={{ color: "var(--purple-900)" }}>{initialBrand.email || "—"}</b>
          </p>
        </div>

        {/* Quotation-driven pricing — the two live levers of the preorder model */}
        <div className="panel">
          <h3>Preorders & returns</h3>
          <div className="row">
            <div className="field">
              <label>Preorder deposit (%)</label>
              <input
                type="number" min={1} max={100}
                value={commerce.preorderDepositPct}
                onChange={(e) => setCommerce({ ...commerce, preorderDepositPct: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Default return window (days)</label>
              <input
                type="number" min={0} max={365}
                value={commerce.returnWindowDays}
                onChange={(e) => setCommerce({ ...commerce, returnWindowDays: e.target.value })}
              />
            </div>
          </div>
          <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 10, lineHeight: 1.6 }}>
            The deposit is the percentage of a quoted price the customer prepays to confirm a
            preorder. Both values can be overridden per product in the product editor.
          </p>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={saveCommerce} disabled={commercePending}>
              {commercePending ? "Saving…" : "Save"}
            </button>
            {commerceMsg && <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>{commerceMsg}</span>}
          </div>
        </div>

        {/* Shipping — live */}
        <div className="panel">
          <h3>Shipping</h3>
          <div className="row">
            <div className="field">
              <label>Free shipping over (৳)</label>
              <input type="number" min={0} value={ship.freeShippingThresholdBdt} onChange={(e) => setShip({ ...ship, freeShippingThresholdBdt: e.target.value })} />
            </div>
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            <div className="field">
              <label>Inside Dhaka (৳)</label>
              <input type="number" min={0} value={ship.shippingDhakaBdt} onChange={(e) => setShip({ ...ship, shippingDhakaBdt: e.target.value })} />
            </div>
            <div className="field">
              <label>Outside Dhaka (৳)</label>
              <input type="number" min={0} value={ship.shippingOutsideBdt} onChange={(e) => setShip({ ...ship, shippingOutsideBdt: e.target.value })} />
            </div>
          </div>
          <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 10, lineHeight: 1.6 }}>
            Used by the cart, checkout, the order total the customer pays, product pages, the
            home page and the Shipping policy. A city containing &ldquo;Dhaka&rdquo; gets the
            Dhaka rate. Set the threshold to 0 to switch free shipping off &mdash; then also
            edit the announcement bar in Editorial if it mentions free shipping.
          </p>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={saveShipping} disabled={shipPending}>
              {shipPending ? "Saving…" : "Save"}
            </button>
            {shipMsg && <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>{shipMsg}</span>}
          </div>
        </div>

        {/* Cash-on-delivery phone check — live */}
        <div className="panel">
          <h3>Cash on delivery: phone check</h3>
          <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 14 }}>
            <input type="checkbox" checked={codCheck.on} onChange={(e) => setCodCheck({ ...codCheck, on: e.target.checked })} />
            Ask for a one-time SMS code before a cash-on-delivery order
          </label>
          <div className="row" style={{ marginTop: 12 }}>
            <div className="field">
              <label>Only for orders of at least (৳)</label>
              <input type="number" min={0} value={codCheck.min} disabled={!codCheck.on} onChange={(e) => setCodCheck({ ...codCheck, min: e.target.value })} />
            </div>
          </div>
          <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 10, lineHeight: 1.6 }}>
            The code proves the phone belongs to whoever is ordering, which cuts refused parcels.
            0 = every cash-on-delivery order. Online payments are never asked. If the SMS
            can&rsquo;t be sent, the order still goes through and its timeline says
            &ldquo;phone not verified&rdquo;.
          </p>
          {!smsConnected && (
            <p style={{ fontSize: 12, color: "var(--err)", marginTop: 6, lineHeight: 1.6 }}>
              SMS is not connected (SSLWIRELESS_API_TOKEN / SSLWIRELESS_SID), so no code is asked
              for until it is.
            </p>
          )}
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={saveCodCheck} disabled={codPending}>
              {codPending ? "Saving…" : "Save"}
            </button>
            {codMsg && <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>{codMsg}</span>}
          </div>
        </div>

        {/* Payment methods — status only. Online methods need a payment
            gateway integration; until then checkout offers COD alone, so no
            switch here may suggest otherwise. */}
        <div className="panel">
          <h3>Payment methods</h3>
          {([
            ["Cash on Delivery", "Always offered at checkout", true],
            [
              "Online — bKash, Nagad, Rocket, card (SSLCommerz)",
              gateway.connected
                ? gateway.live
                  ? "Connected to the LIVE gateway: real payments"
                  : "Connected to the SANDBOX: test payments only, no real money"
                : "Not connected — set SSLCOMMERZ_STORE_ID and SSLCOMMERZ_STORE_PASSWORD in the hosting environment",
              gateway.connected,
            ],
          ] as const).map(([label, hint, live]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--line)" }}>
              <div>
                <div style={{ fontWeight: 500 }}>{label}</div>
                <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>{hint}</div>
              </div>
              <span className={"pill " + (live ? "pill-ok" : "pill-warn")}>{live ? "Active" : "Not available"}</span>
            </div>
          ))}
          <p style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 14, lineHeight: 1.6 }}>
            No VAT is added and there is no cash-on-delivery fee: the customer pays the subtotal,
            less any coupon, plus shipping. Online orders wait as &ldquo;pending_payment&rdquo; until
            SSLCommerz confirms them; unpaid ones are cancelled after an hour and their stock returned.
          </p>
        </div>

        {/* Locales */}
        <div className="panel">
          <h3>Locales</h3>
          <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 0 }}>The storefront serves both English and বাংলা.</p>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--line)" }}>
            <div><div style={{ fontWeight: 500 }}>English</div><div style={{ fontSize: 11, color: "var(--ink-soft)" }}>Default · /en</div></div>
            <span className="pill pill-ok">Active</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0" }}>
            <div><div style={{ fontWeight: 500 }}>বাংলা</div><div style={{ fontSize: 11, color: "var(--ink-soft)" }}>Bangladesh · /bn</div></div>
            <span className="pill pill-ok">Active</span>
          </div>
          <p style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 14, lineHeight: 1.6 }}>
            Currency: <b>BDT (৳)</b> — single currency at launch. Customer-facing strings live in <code>messages/en.json</code> and <code>messages/bn.json</code>.
          </p>
        </div>
      </div>
    </>
  );
}
