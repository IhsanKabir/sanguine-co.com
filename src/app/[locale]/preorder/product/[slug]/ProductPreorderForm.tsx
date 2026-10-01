"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { createProductPreorderRequest } from "@/lib/actions/preorders";

type Props = {
  productId: string;
  productName: string;
  userId: string;
  userEmail: string;
  colors: string[];
  sizes: string[];
};

export default function ProductPreorderForm({
  productName,
  productId,
  userEmail,
  colors,
  sizes,
}: Props) {
  const t = useTranslations();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [color, setColor] = useState(colors[0] ?? "");
  const [size, setSize] = useState(sizes[0] ?? "");
  const [notes, setNotes] = useState("");
  const [line1, setLine1] = useState("");
  const [area, setArea] = useState("");
  const [city, setCity] = useState("Dhaka");
  const [postcode, setPostcode] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const result = await createProductPreorderRequest({
          productId,
          quantity: Math.max(1, Math.min(50, quantity)),
          color: colors.length > 0 ? color || null : null,
          size: sizes.length > 0 ? size || null : null,
          notes: notes.trim() || null,
          customerName: name.trim(),
          customerPhone: phone.trim() || null,
          deliveryAddress: line1.trim()
            ? { line1: line1.trim(), area: area.trim() || null, city: city.trim(), postcode: postcode.trim() || null }
            : null,
        });
        if (result.ok) setDone(true);
        else setError(result.error);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("common.genericError"));
      }
    });
  };

  if (done) {
    return (
      <div style={{ padding: 32, background: "#f9f4ec", border: "1px solid var(--gold-deep)" }}>
        <h2 className="serif" style={{ fontSize: 32, color: "var(--purple-900)", margin: 0 }}>{t("preorderForm.doneTitle")}</h2>
        <p style={{ fontSize: 15, color: "var(--ink-soft)", lineHeight: 1.7, margin: "12px 0 0" }}>
          {t.rich("preorderForm.doneBody", { product: productName, email: userEmail, em: (c) => <em>{c}</em>, b: (c) => <b>{c}</b> })}
        </p>
        <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 18 }}>{t("preorderForm.doneNote")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 18 }}>
      <div className="row">
        <div className="field">
          <label>{t("preorderForm.yourName")}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required minLength={1} maxLength={120} placeholder={t("preorderForm.namePlaceholder")} />
        </div>
        <div className="field">
          <label>{t("common.phone")}</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+8801XXXXXXXXX" />
        </div>
      </div>

      <div className="row" style={{ gridTemplateColumns: colors.length > 0 && sizes.length > 0 ? "1fr 1fr 1fr" : colors.length > 0 || sizes.length > 0 ? "1fr 1fr" : "1fr" }}>
        <div className="field">
          <label>{t("common.quantity")}</label>
          <input type="number" min={1} max={50} value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} />
        </div>
        {colors.length > 0 && (
          <div className="field">
            <label>{t("common.colour")}</label>
            <select value={color} onChange={(e) => setColor(e.target.value)}>
              {colors.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}
        {sizes.length > 0 && (
          <div className="field">
            <label>{t("common.size")}</label>
            <select value={size} onChange={(e) => setSize(e.target.value)}>
              {sizes.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="field">
        <label>{t("preorderForm.notes")}</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder={t("preorderForm.notesPlaceholder")}
          style={{ width: "100%", padding: 12, fontFamily: "inherit", fontSize: 14, lineHeight: 1.6, border: "1px solid var(--line)", background: "white", resize: "vertical" }}
        />
      </div>

      <div>
        <label style={{ fontSize: 11, letterSpacing: ".15em", color: "var(--ink-soft)", textTransform: "uppercase" }}>{t("preorderForm.addressOptionalConfirm")}</label>
        <div style={{ marginTop: 8, display: "grid", gap: 10 }}>
          <div className="field">
            <input value={line1} onChange={(e) => setLine1(e.target.value)} placeholder={t("preorderForm.line1Placeholder")} />
          </div>
          <div className="row">
            <div className="field">
              <input value={area} onChange={(e) => setArea(e.target.value)} placeholder={t("preorderForm.areaPlaceholder")} />
            </div>
            <div className="field">
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder={t("preorderForm.cityPlaceholder")} />
            </div>
            <div className="field">
              <input value={postcode} onChange={(e) => setPostcode(e.target.value)} placeholder={t("preorderForm.postcodePlaceholder")} />
            </div>
          </div>
        </div>
      </div>

      {error && <p style={{ color: "var(--err)", fontSize: 13 }}>{error}</p>}

      <div style={{ borderTop: "1px solid var(--line)", paddingTop: 18, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: 0, lineHeight: 1.6 }}>
          {t("preorderForm.payNote")}
        </p>
        <button type="submit" className="btn btn-primary" disabled={pending} style={{ minWidth: 200 }}>
          {pending ? t("preorderForm.sending") : t("preorderForm.place")}
        </button>
      </div>
    </form>
  );
}
