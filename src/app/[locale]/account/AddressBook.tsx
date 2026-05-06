"use client";

import { useState, useTransition, type FormEvent } from "react";
import { saveAddress, deleteAddress, setDefaultAddress } from "@/lib/actions/addresses";
import Icon from "@/components/storefront/Icon";

type Address = {
  id: string;
  label: string | null;
  fullName: string | null;
  phone: string | null;
  line1: string | null;
  line2: string | null;
  area: string | null;
  city: string | null;
  district: string | null;
  division: string | null;
  postcode: string | null;
  isDefault: boolean;
};

type EditState = {
  id?: string;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  area: string;
  city: string;
  district: string;
  division: string;
  postcode: string;
  isDefault: boolean;
};

const empty = (profileName = "", profilePhone = ""): EditState => ({
  label: "Home", fullName: profileName, phone: profilePhone, line1: "", line2: "",
  area: "", city: "Dhaka", district: "Dhaka", division: "Dhaka", postcode: "", isDefault: false,
});

const toEdit = (a: Address): EditState => ({
  id: a.id,
  label: a.label ?? "",
  fullName: a.fullName ?? "",
  phone: a.phone ?? "",
  line1: a.line1 ?? "",
  line2: a.line2 ?? "",
  area: a.area ?? "",
  city: a.city ?? "",
  district: a.district ?? "",
  division: a.division ?? "",
  postcode: a.postcode ?? "",
  isDefault: a.isDefault,
});

export default function AddressBook({
  addresses,
  profileName = "",
  profilePhone = "",
}: {
  addresses: Address[];
  profileName?: string;
  profilePhone?: string;
}) {
  const [editing, setEditing] = useState<EditState | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelId, setConfirmDelId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const onSave = (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setError(null);
    startTransition(async () => {
      const result = await saveAddress({
        id: editing.id,
        label: editing.label.trim() || null,
        fullName: editing.fullName.trim(),
        phone: editing.phone.trim(),
        line1: editing.line1.trim(),
        line2: editing.line2.trim() || null,
        area: editing.area.trim() || null,
        city: editing.city.trim(),
        district: editing.district.trim() || null,
        division: editing.division.trim() || null,
        postcode: editing.postcode.trim() || null,
        isDefault: editing.isDefault,
      });
      if (result.ok) setEditing(null);
      else setError("Could not save the address.");
    });
  };

  const onDelete = (id: string) => {
    setConfirmDelId(id);
  };

  const doDelete = (id: string) => {
    setConfirmDelId(null);
    setBusyId(id);
    startTransition(async () => {
      await deleteAddress(id);
      setBusyId(null);
    });
  };

  const onMakeDefault = (id: string) => {
    setBusyId(id);
    startTransition(async () => {
      await setDefaultAddress(id);
      setBusyId(null);
    });
  };

  return (
    <section style={{ marginTop: 48 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", marginBottom: 16 }}>
        <h2 className="serif" style={{ fontSize: 24, color: "var(--purple-900)", fontWeight: 500, margin: 0 }}>
          Addresses
        </h2>
        <button className="btn btn-ghost btn-sm" onClick={() => setEditing(empty(profileName, profilePhone))}>
          <Icon name="plus" size={12} /> Add address
        </button>
      </div>

      {addresses.length === 0 ? (
        <div className="empty-state" style={{ padding: 24 }}>
          <p style={{ color: "var(--ink-soft)" }}>
            No addresses saved. Add one and we will offer it at checkout.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {addresses.map((a) => (
            <article key={a.id} style={{ padding: 16, background: "white", border: "1px solid var(--line)", position: "relative" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".15em", color: "var(--ink-soft)", textTransform: "uppercase" }}>
                  {a.label || "Address"}
                </div>
                {a.isDefault && (
                  <span className="pill pill-ok" style={{ fontSize: 9 }}>Default</span>
                )}
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                <b>{a.fullName ?? "—"}</b><br />
                {a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />
                {a.area ? `${a.area}, ` : ""}{a.city}{a.postcode ? ` — ${a.postcode}` : ""}<br />
                {a.phone}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
                <button className="icon-btn" title="Edit" onClick={() => setEditing(toEdit(a))} disabled={busyId === a.id}>
                  <Icon name="feather" size={12} />
                </button>
                {!a.isDefault && (
                  <button className="icon-btn" title="Set as default" onClick={() => onMakeDefault(a.id)} disabled={busyId === a.id}>
                    <Icon name="check" size={12} />
                  </button>
                )}
                {confirmDelId === a.id ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                    <span style={{ color: "var(--ink-soft)" }}>Remove?</span>
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => doDelete(a.id)} style={{ padding: "3px 10px" }}>Yes</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmDelId(null)} style={{ padding: "3px 8px" }}>No</button>
                  </span>
                ) : (
                  <button className="icon-btn" title="Delete" onClick={() => onDelete(a.id)} disabled={busyId === a.id}>
                    <Icon name="x" size={12} />
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {editing && (
        <>
          <div className="overlay" onClick={() => setEditing(null)} />
          <div className="seg-modal" style={{ width: 560 }}>
            <div className="seg-modal-hd">
              <h3 className="serif">{editing.id ? "Edit address" : "New address"}</h3>
              <button className="icon-btn" onClick={() => setEditing(null)}><Icon name="x" /></button>
            </div>
            <form onSubmit={onSave}>
              <div className="seg-modal-body" style={{ display: "block" }}>
                <div className="row">
                  <div className="field"><label>Label</label>
                    <input value={editing.label} onChange={(e) => setEditing({ ...editing, label: e.target.value })} placeholder="Home, Office, …" /></div>
                  <div className="field"><label>Full name</label>
                    <input value={editing.fullName} onChange={(e) => setEditing({ ...editing, fullName: e.target.value })} required minLength={1} /></div>
                </div>
                <div className="field"><label>Phone</label>
                  <input value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} required minLength={6} placeholder="+8801XXXXXXXXX" /></div>
                <div className="field"><label>Address line 1</label>
                  <input value={editing.line1} onChange={(e) => setEditing({ ...editing, line1: e.target.value })} required minLength={1} placeholder="House, road, building" /></div>
                <div className="field"><label>Address line 2 (optional)</label>
                  <input value={editing.line2} onChange={(e) => setEditing({ ...editing, line2: e.target.value })} /></div>
                <div className="row">
                  <div className="field"><label>Area</label>
                    <input value={editing.area} onChange={(e) => setEditing({ ...editing, area: e.target.value })} placeholder="Gulshan, Dhanmondi…" /></div>
                  <div className="field"><label>City</label>
                    <input value={editing.city} onChange={(e) => setEditing({ ...editing, city: e.target.value })} required minLength={1} /></div>
                </div>
                <div className="row">
                  <div className="field"><label>District</label>
                    <input value={editing.district} onChange={(e) => setEditing({ ...editing, district: e.target.value })} /></div>
                  <div className="field"><label>Division</label>
                    <input value={editing.division} onChange={(e) => setEditing({ ...editing, division: e.target.value })} /></div>
                  <div className="field"><label>Postcode</label>
                    <input value={editing.postcode} onChange={(e) => setEditing({ ...editing, postcode: e.target.value })} /></div>
                </div>
                <label className="seg-check" style={{ marginTop: 12 }}>
                  <input type="checkbox" checked={editing.isDefault} onChange={(e) => setEditing({ ...editing, isDefault: e.target.checked })} />
                  Use as default for future orders
                </label>
                {error && <p style={{ color: "var(--err)", fontSize: 13, marginTop: 12 }}>{error}</p>}
              </div>
              <div className="seg-modal-foot">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Save</button>
              </div>
            </form>
          </div>
        </>
      )}
    </section>
  );
}
