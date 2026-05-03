"use client";

import { useState, useTransition, type FormEvent } from "react";
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
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  };

  if (done) {
    return (
      <div style={{ padding: 32, background: "#f9f4ec", border: "1px solid var(--gold-deep)" }}>
        <h2 className="serif" style={{ fontSize: 32, color: "var(--purple-900)", margin: 0 }}>Preorder received.</h2>
        <p style={{ fontSize: 15, color: "var(--ink-soft)", lineHeight: 1.7, margin: "12px 0 0" }}>
          The maison has your preorder for <em>{productName}</em>. We will write to <b>{userEmail}</b> within a day or two to confirm and send a bKash prepayment request.
        </p>
        <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 18 }}>No payment has been taken yet. The maison will initiate the prepayment to secure your piece.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 18 }}>
      <div className="row">
        <div className="field">
          <label>Your name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required minLength={1} maxLength={120} placeholder="Maryam Khan" />
        </div>
        <div className="field">
          <label>Phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+8801XXXXXXXXX" />
        </div>
      </div>

      <div className="row" style={{ gridTemplateColumns: colors.length > 0 && sizes.length > 0 ? "1fr 1fr 1fr" : colors.length > 0 || sizes.length > 0 ? "1fr 1fr" : "1fr" }}>
        <div className="field">
          <label>Quantity</label>
          <input type="number" min={1} max={50} value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} />
        </div>
        {colors.length > 0 && (
          <div className="field">
            <label>Colour</label>
            <select value={color} onChange={(e) => setColor(e.target.value)}>
              {colors.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}
        {sizes.length > 0 && (
          <div className="field">
            <label>Size</label>
            <select value={size} onChange={(e) => setSize(e.target.value)}>
              {sizes.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="field">
        <label>Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder="Any special requests or details for the maison…"
          style={{ width: "100%", padding: 12, fontFamily: "inherit", fontSize: 14, lineHeight: 1.6, border: "1px solid var(--line)", background: "white", resize: "vertical" }}
        />
      </div>

      <div>
        <label style={{ fontSize: 11, letterSpacing: ".15em", color: "var(--ink-soft)", textTransform: "uppercase" }}>Delivery address (optional · we can collect this when confirming)</label>
        <div style={{ marginTop: 8, display: "grid", gap: 10 }}>
          <div className="field">
            <input value={line1} onChange={(e) => setLine1(e.target.value)} placeholder="House, road, building" />
          </div>
          <div className="row">
            <div className="field">
              <input value={area} onChange={(e) => setArea(e.target.value)} placeholder="Area (e.g. Gulshan)" />
            </div>
            <div className="field">
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
            </div>
            <div className="field">
              <input value={postcode} onChange={(e) => setPostcode(e.target.value)} placeholder="Postcode" />
            </div>
          </div>
        </div>
      </div>

      {error && <p style={{ color: "var(--err)", fontSize: 13 }}>{error}</p>}

      <div style={{ borderTop: "1px solid var(--line)", paddingTop: 18, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: 0, lineHeight: 1.6 }}>
          No payment is taken now. The maison will send a bKash prepayment request to confirm your piece.
        </p>
        <button type="submit" className="btn btn-primary" disabled={pending} style={{ minWidth: 200 }}>
          {pending ? "Sending…" : "Place preorder"}
        </button>
      </div>
    </form>
  );
}
