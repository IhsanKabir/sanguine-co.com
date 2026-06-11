"use client";

import { useState, useTransition, type FormEvent } from "react";
import { createManualOrder } from "@/lib/actions/manual-order";
import { formatBdt } from "@/lib/utils";
import { Link } from "@/i18n/routing";
import Icon from "@/components/storefront/Icon";

type Product = {
  id: string;
  name: string;
  sku: string;
  priceBdt: number;
  stock: number;
  segmentId: string | null;
  colors: unknown;
  sizes: unknown;
};

type LineItem = {
  productId: string;
  qty: number;
  color: string;
  size: string;
};

const FREE_SHIPPING_THRESHOLD = 5000;

export default function ManualOrderForm({ products }: { products: Product[] }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [line1, setLine1] = useState("");
  const [area, setArea] = useState("");
  const [city, setCity] = useState("Dhaka");
  const [postcode, setPostcode] = useState("");
  const [items, setItems] = useState<LineItem[]>([]);
  const [shippingFee, setShippingFee] = useState("0");
  const [notes, setNotes] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ orderId: string; number: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const productById = new Map(products.map((p) => [p.id, p]));

  const subtotal = items.reduce((s, it) => {
    const p = productById.get(it.productId);
    return s + (p ? p.priceBdt * it.qty : 0);
  }, 0);
  const shipping = parseInt(shippingFee, 10) || 0;
  const total = subtotal + shipping;

  const addLine = () => {
    if (products.length === 0) return;
    setItems((prev) => [...prev, { productId: products[0].id, qty: 1, color: "", size: "" }]);
  };

  const updateLine = (idx: number, patch: Partial<LineItem>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const removeLine = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  // Restore every field to its initial value so "Create another" starts from
  // a blank form without forcing a full page reload.
  const resetForm = () => {
    setName(""); setEmail(""); setPhone("");
    setLine1(""); setArea(""); setCity("Dhaka"); setPostcode("");
    setItems([]); setShippingFee("0"); setNotes("");
    setSendEmail(true); setError(null); setDone(null);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (items.length === 0) { setError("Add at least one piece."); return; }
    startTransition(async () => {
      const r = await createManualOrder({
        customer: {
          fullName: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
        },
        shipping: {
          line1: line1.trim(),
          area: area.trim() || null,
          city: city.trim(),
          postcode: postcode.trim() || null,
        },
        items: items.map((it) => ({
          productId: it.productId,
          qty: it.qty,
          color: it.color || null,
          size: it.size || null,
        })),
        shippingBdt: shipping,
        notes: notes.trim() || null,
        sendCustomerEmail: sendEmail,
      });
      if (r.ok) setDone({ orderId: r.orderId, number: r.number });
      else setError(r.error);
    });
  };

  if (done) {
    return (
      <div style={{ padding: 32, background: "#eef7ee", border: "1px solid #4caf50" }}>
        <h2 className="serif" style={{ fontSize: 28, color: "var(--purple-900)", margin: 0 }}>Order created.</h2>
        <p style={{ fontSize: 14, color: "var(--ink-soft)", margin: "8px 0" }}>
          Number: <b style={{ fontFamily: "var(--mono)" }}>{done.number}</b>
        </p>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <Link href="/admin/orders" className="btn btn-primary btn-sm">Back to orders</Link>
          <button type="button" className="btn btn-ghost btn-sm" onClick={resetForm}>Create another</button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 18, maxWidth: 880 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end" }}>
        <div>
          <h1 className="admin-h1">New manual order</h1>
          <p className="admin-sub">Create a phone-in or walk-in order on a customer&rsquo;s behalf. Same flow as a storefront order — emails the customer if checked, decrements stock, lands in the orders queue.</p>
        </div>
        <Link href="/admin/orders" className="btn btn-ghost btn-sm">Cancel</Link>
      </div>

      <fieldset style={{ border: "1px solid var(--line)", padding: 16 }}>
        <legend style={{ fontSize: 11, letterSpacing: ".15em", color: "var(--ink-soft)", textTransform: "uppercase", padding: "0 8px" }}>Customer</legend>
        <div className="row">
          <div className="field"><label>Full name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required minLength={1} maxLength={120} /></div>
          <div className="field"><label>Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} required minLength={6} maxLength={40} placeholder="+8801XXXXXXXXX" /></div>
        </div>
        <div className="field" style={{ marginTop: 8 }}>
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={200} placeholder="customer@mail.co" />
        </div>
      </fieldset>

      <fieldset style={{ border: "1px solid var(--line)", padding: 16 }}>
        <legend style={{ fontSize: 11, letterSpacing: ".15em", color: "var(--ink-soft)", textTransform: "uppercase", padding: "0 8px" }}>Delivery</legend>
        <div className="field"><label>Address line 1</label>
          <input value={line1} onChange={(e) => setLine1(e.target.value)} required minLength={1} maxLength={200} placeholder="House, road, building" /></div>
        <div className="row" style={{ marginTop: 8 }}>
          <div className="field"><label>Area</label>
            <input value={area} onChange={(e) => setArea(e.target.value)} maxLength={80} /></div>
          <div className="field"><label>City</label>
            <input value={city} onChange={(e) => setCity(e.target.value)} required minLength={1} maxLength={80} /></div>
          <div className="field"><label>Postcode</label>
            <input value={postcode} onChange={(e) => setPostcode(e.target.value)} maxLength={20} /></div>
        </div>
      </fieldset>

      <fieldset style={{ border: "1px solid var(--line)", padding: 16 }}>
        <legend style={{ fontSize: 11, letterSpacing: ".15em", color: "var(--ink-soft)", textTransform: "uppercase", padding: "0 8px" }}>Pieces</legend>

        {items.length === 0 && (
          <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "0 0 12px" }}>No pieces in this order yet.</p>
        )}

        {items.map((it, i) => {
          const p = productById.get(it.productId);
          const colorOptions = (p?.colors as string[] | null) ?? [];
          const sizeOptions = (p?.sizes as string[] | null) ?? [];
          return (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 80px auto", gap: 8, alignItems: "end", marginBottom: 8 }}>
              <div className="field" style={{ margin: 0 }}>
                <label>Piece</label>
                <select value={it.productId} onChange={(e) => updateLine(i, { productId: e.target.value, color: "", size: "" })}>
                  {products.map((p) => (
                    <option key={p.id} value={p.id} disabled={p.stock === 0}>
                      {p.name} ({p.sku}) — {p.stock} in stock — {formatBdt(p.priceBdt)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Colour</label>
                {colorOptions.length > 0 ? (
                  <select value={it.color} onChange={(e) => updateLine(i, { color: e.target.value })}>
                    <option value="">—</option>
                    {colorOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                ) : (
                  <input value={it.color} onChange={(e) => updateLine(i, { color: e.target.value })} placeholder="—" />
                )}
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Size</label>
                {sizeOptions.length > 0 ? (
                  <select value={it.size} onChange={(e) => updateLine(i, { size: e.target.value })}>
                    <option value="">—</option>
                    {sizeOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : (
                  <input value={it.size} onChange={(e) => updateLine(i, { size: e.target.value })} placeholder="—" />
                )}
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Qty</label>
                <input type="number" min={1} max={p?.stock ?? 50} value={it.qty} onChange={(e) => updateLine(i, { qty: parseInt(e.target.value, 10) || 1 })} />
              </div>
              <button type="button" className="icon-btn" onClick={() => removeLine(i)} title="Remove">
                <Icon name="x" size={12} />
              </button>
            </div>
          );
        })}

        <button type="button" className="btn btn-ghost btn-sm" onClick={addLine}>
          <Icon name="plus" size={12} /> Add piece
        </button>
      </fieldset>

      <fieldset style={{ border: "1px solid var(--line)", padding: 16 }}>
        <legend style={{ fontSize: 11, letterSpacing: ".15em", color: "var(--ink-soft)", textTransform: "uppercase", padding: "0 8px" }}>Totals</legend>
        <div className="row">
          <div className="field"><label>Shipping fee (৳, 0 = complimentary)</label>
            <input type="number" min={0} value={shippingFee} onChange={(e) => setShippingFee(e.target.value)} placeholder="80" /></div>
          <div className="field"><label>Subtotal</label>
            <div style={{ padding: "10px 0", fontSize: 14 }}>{formatBdt(subtotal)}</div></div>
          <div className="field"><label>Total to collect (COD)</label>
            <div style={{ padding: "10px 0", fontSize: 18, fontFamily: "var(--serif)", color: "var(--purple-900)" }}>{formatBdt(total)}</div></div>
        </div>
        {subtotal >= FREE_SHIPPING_THRESHOLD && shipping > 0 && (
          <p style={{ fontSize: 11, color: "var(--gold-deep)", marginTop: 6 }}>
            Note: subtotal is over {formatBdt(FREE_SHIPPING_THRESHOLD)} — storefront would normally complimentary-ship this.
          </p>
        )}
      </fieldset>

      <div className="field">
        <label>Internal notes (saved on order)</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={2000} style={{ width: "100%", padding: 10, fontFamily: "inherit", fontSize: 14, border: "1px solid var(--line)" }} placeholder="e.g. customer called from Gulshan; prefers afternoon delivery" />
      </div>

      <label className="seg-check">
        <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
        Email the customer the standard order-placed confirmation (with the tokenised tracking link)
      </label>

      {error && <p style={{ color: "var(--err)", fontSize: 13 }}>{error}</p>}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Link href="/admin/orders" className="btn btn-ghost btn-sm">Cancel</Link>
        <button type="submit" className="btn btn-primary" disabled={pending || items.length === 0} style={{ minWidth: 200 }}>
          {pending ? "Creating…" : `Create order · ${formatBdt(total)}`}
        </button>
      </div>
    </form>
  );
}
