"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";

type Brand = { name: string; tagline?: string; email?: string; announcement?: string };

type StoreConfig = {
  freeShippingThresholdBdt: number;
  flatShippingDhakaBdt: number;
  flatShippingOutsideBdt: number;
  taxRate: number;
  codHandlingBdt: number;
  acceptCod: boolean;
  acceptCard: boolean;
  acceptBkash: boolean;
  acceptNagad: boolean;
  acceptRocket: boolean;
};

export default function SettingsClient({ initialBrand }: { initialBrand: Brand }) {
  const [c, setC] = useState<StoreConfig>({
    freeShippingThresholdBdt: 3000,
    flatShippingDhakaBdt: 80,
    flatShippingOutsideBdt: 150,
    taxRate: 0,
    codHandlingBdt: 0,
    acceptCod: true,
    acceptCard: false,
    acceptBkash: false,
    acceptNagad: false,
    acceptRocket: false,
  });

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

        {/* Shipping & tax */}
        <div className="panel">
          <h3>Shipping & tax</h3>
          <div className="row">
            <div className="field"><label>Free shipping threshold (৳)</label><input type="number" value={c.freeShippingThresholdBdt} onChange={(e) => setC({ ...c, freeShippingThresholdBdt: Number(e.target.value) })} /></div>
            <div className="field"><label>VAT / tax %</label><input type="number" step="0.1" value={c.taxRate} onChange={(e) => setC({ ...c, taxRate: Number(e.target.value) })} /></div>
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            <div className="field"><label>Dhaka shipping (৳)</label><input type="number" value={c.flatShippingDhakaBdt} onChange={(e) => setC({ ...c, flatShippingDhakaBdt: Number(e.target.value) })} /></div>
            <div className="field"><label>Outside Dhaka (৳)</label><input type="number" value={c.flatShippingOutsideBdt} onChange={(e) => setC({ ...c, flatShippingOutsideBdt: Number(e.target.value) })} /></div>
          </div>
          <div className="field" style={{ marginTop: 12 }}><label>COD handling fee (৳)</label><input type="number" value={c.codHandlingBdt} onChange={(e) => setC({ ...c, codHandlingBdt: Number(e.target.value) })} /></div>
          <p style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 14, lineHeight: 1.6 }}>
            Note: shipping logic is currently hard-coded in <code>orders.ts</code>. Changing values here is preview-only until we wire <code>site_settings</code> to the order calculator.
          </p>
        </div>

        {/* Payment methods */}
        <div className="panel">
          <h3>Payment methods</h3>
          {([
            ["acceptCod",    "Cash on Delivery", "Active for soft launch"],
            ["acceptBkash",  "bKash",            "Add SSLCommerz first"],
            ["acceptNagad",  "Nagad",            "Add SSLCommerz first"],
            ["acceptRocket", "Rocket (DBBL)",    "Add SSLCommerz first"],
            ["acceptCard",   "Card (Visa/MC/Amex)", "Add SSLCommerz first"],
          ] as const).map(([key, label, hint]) => (
            <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--line)" }}>
              <div>
                <div style={{ fontWeight: 500 }}>{label}</div>
                <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>{hint}</div>
              </div>
              <div
                onClick={() => setC({ ...c, [key]: !c[key] })}
                style={{ width: 40, height: 22, background: c[key] ? "var(--purple-800)" : "var(--line)", borderRadius: 22, position: "relative", cursor: "pointer", transition: "background .2s" }}
              >
                <div style={{ position: "absolute", top: 2, left: c[key] ? 20 : 2, width: 18, height: 18, background: "white", borderRadius: "50%", transition: "left .2s" }} />
              </div>
            </div>
          ))}
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
