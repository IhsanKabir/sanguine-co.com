"use client";

import { useState, useTransition } from "react";
import type { Product, Segment } from "@/lib/schema";
import { adjustStock } from "@/lib/actions/admin";
import { notifyBackInStock } from "@/lib/actions/stock-notify";
import { formatBdt } from "@/lib/utils";
import Composition from "@/components/storefront/Composition";

type Props = {
  products: Product[];
  segments: Segment[];
  canSeeRevenue: boolean;
  pendingNotifs: Record<string, number>;
};

type StockHealth = "out" | "critical" | "low" | "healthy";
function healthOf(stock: number): StockHealth {
  if (stock === 0) return "out";
  if (stock < 5) return "critical";
  if (stock < 10) return "low";
  return "healthy";
}

const HEALTH_LABEL: Record<StockHealth, string> = {
  out: "Out", critical: "Critical", low: "Low", healthy: "Healthy",
};
const HEALTH_PILL: Record<StockHealth, string> = {
  out: "pill-err", critical: "pill-err", low: "pill-warn", healthy: "pill-ok",
};

export default function InventoryClient({ products, segments, canSeeRevenue, pendingNotifs }: Props) {
  const [filter, setFilter] = useState<"all" | StockHealth>("all");
  const [adjusting, setAdjusting] = useState<{ id: string; name: string; current: number } | null>(null);
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("restock");
  const [busyNotifyId, setBusyNotifyId] = useState<string | null>(null);
  const [notifyResult, setNotifyResult] = useState<string | null>(null);
  const [notifyConfirm, setNotifyConfirm] = useState<{ id: string; count: number } | null>(null);
  const [, startTransition] = useTransition();

  const onNotify = (productId: string) => {
    const count = pendingNotifs[productId] ?? 0;
    if (count === 0) return;
    setNotifyConfirm({ id: productId, count });
  };

  const doNotify = (productId: string) => {
    setNotifyConfirm(null);
    setBusyNotifyId(productId);
    setNotifyResult(null);
    startTransition(async () => {
      const r = await notifyBackInStock(productId);
      setBusyNotifyId(null);
      if (r.ok) setNotifyResult(`Notified ${r.notified} subscriber${r.notified === 1 ? "" : "s"}.`);
      else setNotifyResult(`Could not notify: ${r.error}`);
    });
  };

  const counts = products.reduce(
    (acc, p) => { acc[healthOf(p.stock)]++; return acc; },
    { out: 0, critical: 0, low: 0, healthy: 0 } as Record<StockHealth, number>,
  );

  const list = filter === "all"
    ? [...products].sort((a, b) => a.stock - b.stock)
    : products.filter((p) => healthOf(p.stock) === filter).sort((a, b) => a.stock - b.stock);

  const totalUnits = products.reduce((s, p) => s + p.stock, 0);
  const totalValue = products.reduce((s, p) => s + p.stock * p.priceBdt, 0);

  const onAdjust = () => {
    if (!adjusting) return;
    const d = parseInt(delta) || 0;
    if (d === 0) { setAdjusting(null); return; }
    startTransition(async () => {
      await adjustStock(adjusting.id, d, reason);
      setAdjusting(null);
      setDelta("");
    });
  };

  return (
    <>
      <h1 className="admin-h1">Inventory</h1>
      <p className="admin-sub">
        {products.length} products · {totalUnits} units{canSeeRevenue && <> · {formatBdt(totalValue)} retail value</>}.
      </p>
      {notifyResult && (
        <div style={{ marginBottom: 12, padding: 10, background: "#eef7ee", border: "1px solid #4caf50", fontSize: 13 }}>
          {notifyResult}
        </div>
      )}

      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
        {(["all", "healthy", "low", "critical", "out"] as const).map((k) => (
          <div
            key={k}
            className="stat"
            onClick={() => setFilter(k)}
            style={{ cursor: "pointer", borderColor: filter === k ? "var(--purple-700)" : undefined }}
          >
            <div className="k">{k === "all" ? "All" : HEALTH_LABEL[k]}</div>
            <div className="v">{k === "all" ? products.length : counts[k]}</div>
          </div>
        ))}
      </div>

      <div className="table">
        <table>
          <thead><tr><th>Product</th><th>SKU</th><th>Segment</th><th>Stock</th>{canSeeRevenue && <th>Retail</th>}<th>Health</th><th style={{ textAlign: "right" }}>Action</th></tr></thead>
          <tbody>
            {list.map((p) => {
              const h = healthOf(p.stock);
              const seg = segments.find((s) => s.id === p.segmentId);
              return (
                <tr key={p.id}>
                  <td>
                    <div className="admin-product-cell">
                      <Composition cat={p.segmentId || "clothing"} sku={p.sku} name={p.name} small />
                      <div><div className="n">{p.name}</div></div>
                    </div>
                  </td>
                  <td className="mono" style={{ fontSize: 11, color: "var(--ink-soft)" }}>{p.sku}</td>
                  <td>{seg?.name || "—"}</td>
                  <td style={{ fontWeight: 500, color: h === "critical" || h === "out" ? "var(--err)" : "inherit" }}>{p.stock}</td>
                  {canSeeRevenue && <td>{formatBdt(p.priceBdt)}</td>}
                  <td>
                    <span className={"pill " + HEALTH_PILL[h]}>{HEALTH_LABEL[h]}</span>
                    {pendingNotifs[p.id] > 0 && (
                      <span title={`${pendingNotifs[p.id]} customer${pendingNotifs[p.id] === 1 ? "" : "s"} asked to be notified`}
                            style={{ marginLeft: 6, fontSize: 10, fontFamily: "var(--mono)", color: "var(--gold-deep)" }}>
                        · {pendingNotifs[p.id]} watching
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {p.stock > 0 && pendingNotifs[p.id] > 0 && (
                      notifyConfirm?.id === p.id ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, marginRight: 6 }}>
                          <span style={{ color: "var(--ink-soft)" }}>Send to {notifyConfirm.count}?</span>
                          <button type="button" className="btn btn-primary btn-sm" onClick={() => doNotify(p.id)} style={{ padding: "3px 10px" }}>Confirm</button>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setNotifyConfirm(null)} style={{ padding: "3px 8px" }}>Cancel</button>
                        </span>
                      ) : (
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ marginRight: 6, borderColor: "var(--gold-deep)", color: "var(--gold-deep)" }}
                          onClick={() => onNotify(p.id)}
                          disabled={busyNotifyId === p.id}
                          title="Email everyone who asked to be notified"
                        >
                          {busyNotifyId === p.id ? "Sending…" : `Notify ${pendingNotifs[p.id]}`}
                        </button>
                      )
                    )}
                    <button className="btn btn-ghost btn-sm" onClick={() => { setAdjusting({ id: p.id, name: p.name, current: p.stock }); setDelta(""); setReason("restock"); }}>
                      Adjust
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {adjusting && (
        <>
          <div className="overlay" onClick={() => setAdjusting(null)} />
          <div className="seg-confirm" style={{ width: 460 }}>
            <h3 className="serif" style={{ margin: "0 0 6px" }}>Adjust stock</h3>
            <p style={{ color: "var(--ink-soft)", fontSize: 14, marginTop: 0 }}>
              <b>{adjusting.name}</b> · current stock: <b>{adjusting.current}</b>
            </p>
            <div className="row">
              <div className="field">
                <label>Delta (+ to add, − to remove)</label>
                <input
                  type="number"
                  value={delta}
                  onChange={(e) => setDelta(e.target.value)}
                  placeholder="+ 5"
                  autoFocus
                />
              </div>
              <div className="field">
                <label>Reason</label>
                <select value={reason} onChange={(e) => setReason(e.target.value)}>
                  <option value="restock">Restock</option>
                  <option value="adjustment">Adjustment</option>
                  <option value="return">Return</option>
                  <option value="damage">Damage / loss</option>
                </select>
              </div>
            </div>
            <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: "10px 0 18px" }}>
              New stock: <b style={{ color: "var(--purple-900)" }}>{Math.max(0, adjusting.current + (parseInt(delta) || 0))}</b>
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setAdjusting(null)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={onAdjust}>Apply</button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
