"use client";

import { useState, useTransition } from "react";
import { createCoupon, updateCoupon, deleteCoupon, toggleCouponActive, type CouponInput } from "@/lib/actions/coupons";
import type { Coupon } from "@/lib/schema";
import Icon from "@/components/storefront/Icon";
import { formatBdt, formatDate } from "@/lib/utils";

const TYPE_LABELS: Record<string, string> = {
  percent: "% off",
  fixed: "৳ off",
  free_shipping: "Free shipping",
};

type EditState = {
  id?: string;
  code: string;
  description: string;
  type: "percent" | "fixed" | "free_shipping";
  value: string;
  minSubtotalBdt: string;
  maxUses: string;
  startsAt: string;
  expiresAt: string;
  isActive: boolean;
};

const empty = (): EditState => ({
  code: "", description: "", type: "percent", value: "10",
  minSubtotalBdt: "0", maxUses: "", startsAt: "", expiresAt: "",
  isActive: true,
});

export default function CouponsClient({ coupons }: { coupons: Coupon[] }) {
  const [editing, setEditing] = useState<EditState | null>(null);
  const [confirmDel, setConfirmDel] = useState<Coupon | null>(null);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onSave = () => {
    if (!editing) return;
    setError(null);
    const payload: CouponInput = {
      id: editing.id,
      code: editing.code.trim(),
      description: editing.description || null,
      type: editing.type,
      value: parseInt(editing.value) || 0,
      minSubtotalBdt: parseInt(editing.minSubtotalBdt) || 0,
      maxUses: editing.maxUses ? parseInt(editing.maxUses) : null,
      startsAt: editing.startsAt || null,
      expiresAt: editing.expiresAt || null,
      isActive: editing.isActive,
    };
    startTransition(async () => {
      try {
        if (editing.id) await updateCoupon(editing.id, payload);
        else await createCoupon(payload);
        setEditing(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed");
      }
    });
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", marginBottom: 20 }}>
        <div>
          <h1 className="admin-h1">Coupons</h1>
          <p className="admin-sub">{coupons.length} codes · {coupons.filter((c) => c.isActive).length} active.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setEditing(empty())}>
          <Icon name="check" size={14}/> New Coupon
        </button>
      </div>

      <div className="table">
        <table>
          <thead>
            <tr><th>Code</th><th>Type</th><th>Value</th><th>Min subtotal</th><th>Used</th><th>Window</th><th>Status</th><th style={{ textAlign: "right" }}>Actions</th></tr>
          </thead>
          <tbody>
            {coupons.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: "center", color: "var(--ink-soft)", padding: 40 }}>
                No coupons yet. Create your first one.
              </td></tr>
            ) : coupons.map((c) => {
              const remainingUses = c.maxUses !== null && c.maxUses !== undefined ? Math.max(0, c.maxUses - c.usedCount) : null;
              const expired = c.expiresAt && new Date(c.expiresAt) < new Date();
              const exhausted = c.maxUses !== null && c.maxUses !== undefined && c.usedCount >= c.maxUses;
              return (
                <tr key={c.id}>
                  <td>
                    <div style={{ fontFamily: "var(--mono)", fontWeight: 500, letterSpacing: ".15em", color: "var(--purple-900)" }}>{c.code}</div>
                    {c.description && <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>{c.description}</div>}
                  </td>
                  <td>{TYPE_LABELS[c.type] || c.type}</td>
                  <td style={{ fontWeight: 500 }}>
                    {c.type === "percent" ? `${c.value}%` : c.type === "fixed" ? formatBdt(c.value) : "-"}
                  </td>
                  <td style={{ color: "var(--ink-soft)" }}>{c.minSubtotalBdt > 0 ? formatBdt(c.minSubtotalBdt) : "-"}</td>
                  <td>
                    {c.usedCount}{c.maxUses !== null && c.maxUses !== undefined ? ` / ${c.maxUses}` : ""}
                    {remainingUses !== null && remainingUses === 0 && <span className="pill pill-err" style={{ marginLeft: 6 }}>used up</span>}
                  </td>
                  <td style={{ fontSize: 11, color: "var(--ink-soft)" }}>
                    {c.startsAt ? formatDate(c.startsAt) : "now"}
                    {" → "}
                    {c.expiresAt ? formatDate(c.expiresAt) : "∞"}
                  </td>
                  <td>
                    {!c.isActive ? <span className="pill pill-warn">paused</span>
                      : expired ? <span className="pill pill-err">expired</span>
                      : exhausted ? <span className="pill pill-err">exhausted</span>
                      : <span className="pill pill-ok">live</span>}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button className="icon-btn" title={c.isActive ? "Pause" : "Resume"} onClick={() => startTransition(() => toggleCouponActive(c.id))}>
                      <Icon name={c.isActive ? "x" : "check"} size={14}/>
                    </button>
                    <button className="icon-btn" title="Edit" onClick={() => setEditing({
                      id: c.id,
                      code: c.code,
                      description: c.description || "",
                      type: c.type as EditState["type"],
                      value: String(c.value),
                      minSubtotalBdt: String(c.minSubtotalBdt),
                      maxUses: c.maxUses?.toString() ?? "",
                      startsAt: c.startsAt ? new Date(c.startsAt).toISOString().slice(0, 10) : "",
                      expiresAt: c.expiresAt ? new Date(c.expiresAt).toISOString().slice(0, 10) : "",
                      isActive: c.isActive,
                    })}>
                      <Icon name="feather" size={14}/>
                    </button>
                    <button className="icon-btn" title="Delete" onClick={() => setConfirmDel(c)}>
                      <Icon name="x" size={14}/>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <>
          <div className="overlay" onClick={() => setEditing(null)}/>
          <div className="seg-modal" style={{ width: 560 }}>
            <div className="seg-modal-hd">
              <h3 className="serif">{editing.id ? "Edit · " + editing.code : "New Coupon"}</h3>
              <button className="icon-btn" onClick={() => setEditing(null)}><Icon name="x"/></button>
            </div>
            <div className="seg-modal-body" style={{ display: "block" }}>
              <div className="row">
                <div className="field"><label>Code</label>
                  <input value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })} placeholder="EID2026" style={{ fontFamily: "var(--mono)", letterSpacing: ".15em" }}/></div>
                <div className="field"><label>Type</label>
                  <select value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value as EditState["type"] })}>
                    <option value="percent">% off subtotal</option>
                    <option value="fixed">৳ off subtotal</option>
                    <option value="free_shipping">Free shipping</option>
                  </select>
                </div>
              </div>
              <div className="field"><label>Description (optional, customer sees it)</label>
                <input value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="Eid 2026: 15% off"/></div>

              {editing.type !== "free_shipping" && (
                <div className="row">
                  <div className="field"><label>{editing.type === "percent" ? "Percent (1-100)" : "Amount (৳)"}</label>
                    <input type="number" value={editing.value} onChange={(e) => setEditing({ ...editing, value: e.target.value })}/></div>
                  <div className="field"><label>Min subtotal (৳)</label>
                    <input type="number" value={editing.minSubtotalBdt} onChange={(e) => setEditing({ ...editing, minSubtotalBdt: e.target.value })}/></div>
                </div>
              )}

              <div className="row">
                <div className="field"><label>Max uses (blank = ∞)</label>
                  <input type="number" value={editing.maxUses} onChange={(e) => setEditing({ ...editing, maxUses: e.target.value })} placeholder="100"/></div>
                <div className="field"><label>&nbsp;</label>
                  <label className="seg-check" style={{ paddingTop: 0 }}>
                    <input type="checkbox" checked={editing.isActive} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}/>
                    Active
                  </label>
                </div>
              </div>

              <div className="row">
                <div className="field"><label>Starts at</label>
                  <input type="date" value={editing.startsAt} onChange={(e) => setEditing({ ...editing, startsAt: e.target.value })}/></div>
                <div className="field"><label>Expires at</label>
                  <input type="date" value={editing.expiresAt} onChange={(e) => setEditing({ ...editing, expiresAt: e.target.value })}/></div>
              </div>

              {error && <p style={{ color: "var(--err)", fontSize: 13, marginTop: 12 }}>{error}</p>}
            </div>
            <div className="seg-modal-foot">
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={onSave}>{editing.id ? "Save" : "Create"}</button>
            </div>
          </div>
        </>
      )}

      {confirmDel && (
        <>
          <div className="overlay" onClick={() => setConfirmDel(null)}/>
          <div className="seg-confirm">
            <h3 className="serif" style={{ margin: "0 0 12px" }}>Delete &quot;{confirmDel.code}&quot;?</h3>
            <p style={{ color: "var(--ink-soft)", fontSize: 14, lineHeight: 1.6, margin: "0 0 18px" }}>
              The code will stop working immediately. Past redemptions stay in your reports.
              To temporarily disable instead, just toggle it off.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDel(null)}>Cancel</button>
              <button className="btn btn-sm" style={{ background: "var(--err)", color: "white", border: "none" }}
                onClick={() => startTransition(async () => { await deleteCoupon(confirmDel.id); setConfirmDel(null); })}>
                Delete
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
