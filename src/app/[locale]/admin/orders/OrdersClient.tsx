"use client";

import { useState, useEffect, useTransition } from "react";
import type { Order, OrderEvent, OrderLine } from "@/lib/schema";
import { parseShippingAddress } from "@/lib/schema";
import { updateOrderStatus, bookCourier, getOrderTimeline, bulkUpdateOrderStatus } from "@/lib/actions/admin";
import { formatBdt, formatDate } from "@/lib/utils";
import Icon from "@/components/storefront/Icon";
import RefundPanel from "./RefundPanel";

type Props = { orders: Order[]; lines: OrderLine[] };

const STATUSES = ["pending","cod_pending","paid","processing","shipped","delivered","cancelled","refunded"] as const;

export default function OrdersClient({ orders, lines }: Props) {
  const [filter, setFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Order | null>(null);
  const [, startTransition] = useTransition();
  const [courier, setCourier] = useState<"pathao" | "steadfast">("pathao");
  const [pathaoCity, setPathaoCity] = useState("1");
  const [pathaoZone, setPathaoZone] = useState("");
  const [bookError, setBookError] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<OrderEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMsg, setBulkMsg] = useState<string | null>(null);
  const [pendingBulk, setPendingBulk] = useState<typeof STATUSES[number] | null>(null);

  const toggleId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleAllVisible = (visibleIds: string[], allOn: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOn) for (const id of visibleIds) next.delete(id);
      else for (const id of visibleIds) next.add(id);
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());
  const onBulk = (status: typeof STATUSES[number]) => {
    if (selectedIds.size === 0) return;
    setPendingBulk(status);
  };
  const confirmBulk = () => {
    if (!pendingBulk) return;
    const status = pendingBulk;
    setPendingBulk(null);
    setBulkBusy(true);
    setBulkMsg(null);
    startTransition(async () => {
      try {
        const r = await bulkUpdateOrderStatus({ orderIds: Array.from(selectedIds), status });
        if (r.ok) {
          setBulkMsg(`Updated ${r.updated} order${r.updated === 1 ? "" : "s"} to ${status}.`);
          clearSelection();
        } else {
          setBulkMsg(r.error ?? "Update failed.");
        }
      } finally {
        setBulkBusy(false);
      }
    });
  };

  // Load the timeline whenever a different order is opened.
  useEffect(() => {
    if (!selected) { setTimeline([]); return; }
    setTimelineLoading(true);
    getOrderTimeline(selected.id)
      .then(setTimeline)
      .catch(() => setTimeline([]))
      .finally(() => setTimelineLoading(false));
  }, [selected?.id]);

  const list = orders.filter((o) => filter === "all" || o.status === filter);
  const linesFor = (orderId: string) => lines.filter((l) => l.orderId === orderId);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", marginBottom: 16 }}>
        <div>
          <h1 className="admin-h1">Orders</h1>
          <p className="admin-sub">{orders.length} total · {orders.filter((o) => o.status === "cod_pending").length} awaiting fulfilment.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a
            href="/admin/orders/new"
            className="btn btn-ghost btn-sm"
            title="Create a phone-in order on a customer's behalf"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Icon name="plus" size={12} /> New order
          </a>
          <a
            href="/api/admin/orders/export"
            className="btn btn-ghost btn-sm"
            title="Download all orders as a CSV (one row per line item)"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Icon name="arrow" size={12} /> Export CSV
          </a>
        </div>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
        {[
          { k: "All", v: orders.length, val: "all" },
          { k: "Awaiting", v: orders.filter((o) => o.status === "cod_pending" || o.status === "pending").length, val: "cod_pending" },
          { k: "Shipped",  v: orders.filter((o) => o.status === "shipped").length, val: "shipped" },
          { k: "Delivered",v: orders.filter((o) => o.status === "delivered").length, val: "delivered" },
          { k: "Cancelled",v: orders.filter((o) => o.status === "cancelled").length, val: "cancelled" },
        ].map((s) => (
          <div key={s.k} className="stat" onClick={() => setFilter(s.val)} style={{ cursor: "pointer" }}>
            <div className="k">{s.k}</div><div className="v">{s.v}</div>
          </div>
        ))}
      </div>

      {(selectedIds.size > 0 || bulkMsg) && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "var(--purple-50)", border: "1px solid var(--purple-200)", marginBottom: 10, fontSize: 13 }}>
          {selectedIds.size > 0 && !pendingBulk && (
            <>
              <b>{selectedIds.size} selected</b>
              <span style={{ color: "var(--ink-soft)" }}>· bulk update to:</span>
              {(["processing", "shipped", "delivered", "cancelled"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={bulkBusy}
                  onClick={() => onBulk(st)}
                  style={{ padding: "4px 10px" }}
                >
                  {st}
                </button>
              ))}
              <button type="button" className="btn btn-ghost btn-sm" onClick={clearSelection} style={{ marginLeft: "auto", padding: "4px 10px" }}>
                Clear
              </button>
            </>
          )}
          {pendingBulk && (
            <>
              <span>Mark <b>{selectedIds.size}</b> order{selectedIds.size === 1 ? "" : "s"} as <b>{pendingBulk}</b>?</span>
              <button type="button" className="btn btn-primary btn-sm" disabled={bulkBusy} onClick={confirmBulk} style={{ padding: "4px 12px" }}>
                Confirm
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPendingBulk(null)} style={{ padding: "4px 10px" }}>
                Cancel
              </button>
            </>
          )}
          {bulkMsg && selectedIds.size === 0 && (
            <span style={{ color: "var(--ok)" }}>{bulkMsg} <button onClick={() => setBulkMsg(null)} style={{ marginLeft: 8, background: "none", border: "none", cursor: "pointer", color: "var(--ink-soft)" }}>✕</button></span>
          )}
        </div>
      )}

      <div className="table">
        <table>
          <thead>
            <tr>
              <th style={{ width: 28 }}>
                <input
                  type="checkbox"
                  checked={list.length > 0 && list.every((o) => selectedIds.has(o.id))}
                  onChange={() => {
                    const visibleIds = list.map((o) => o.id);
                    const allOn = visibleIds.every((id) => selectedIds.has(id));
                    toggleAllVisible(visibleIds, allOn);
                  }}
                  aria-label="Select all visible orders"
                />
              </th>
              <th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Courier</th><th>Date</th>
            </tr>
          </thead>
          <tbody>
            {list.map((o) => {
              const addr = parseShippingAddress(o.shippingAddress);
              const itemCount = linesFor(o.id).reduce((s, l) => s + l.qty, 0);
              return (
                <tr key={o.id} onClick={() => setSelected(o)} style={{ cursor: "pointer" }}>
                  <td style={{ width: 28 }} onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(o.id)}
                      onChange={() => toggleId(o.id)}
                      aria-label={`Select order ${o.number}`}
                    />
                  </td>
                  <td style={{ fontFamily: "var(--mono)", color: "var(--purple-900)", fontWeight: 500 }}>{o.number}</td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{addr.fullName ?? "—"}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>{o.guestEmail}</div>
                  </td>
                  <td>{itemCount}</td>
                  <td style={{ fontWeight: 500 }}>{formatBdt(o.totalBdt)}</td>
                  <td>
                    <span className={"pill " + (o.status === "delivered" ? "pill-ok" : o.status === "shipped" ? "pill-info" : o.status === "cancelled" ? "pill-err" : "pill-warn")}>
                      {o.status}
                    </span>
                  </td>
                  <td style={{ fontSize: 11, color: "var(--ink-soft)" }}>
                    {o.shippingCourier ? `${o.shippingCourier} · ${o.shippingTracking}` : "—"}
                  </td>
                  <td style={{ color: "var(--ink-soft)", fontSize: 12 }}>{formatDate(o.createdAt!)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selected && (
        <>
          <div className="overlay" onClick={() => setSelected(null)}/>
          <div className="drawer" style={{ width: 520 }}>
            <div className="drawer-hd">
              <div>
                <h3>{selected.number}</h3>
                <div style={{ fontSize: 11, color: "var(--ink-soft)", letterSpacing: ".1em", textTransform: "uppercase" }}>
                  Placed {formatDate(selected.createdAt!)}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <a
                  href={`/en/admin/orders/${selected.id}/pick`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost btn-sm"
                  title="Open the printable packing slip in a new tab"
                >
                  Packing slip ↗
                </a>
                <button className="icon-btn" onClick={() => setSelected(null)}><Icon name="x"/></button>
              </div>
            </div>
            <div className="drawer-body" style={{ padding: "20px 24px" }}>
              <div className="panel" style={{ padding: 16, marginBottom: 14 }}>
                <div className="pdp-label">Customer</div>
                {(() => {
                  const a = parseShippingAddress(selected.shippingAddress);
                  return (
                    <>
                      <div style={{ fontWeight: 500 }}>{a.fullName ?? "—"}</div>
                      <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>
                        {selected.guestEmail}<br/>{a.phone ?? ""}<br/>
                        {a.line1 ?? ""}<br/>{a.area ? a.area + ", " : ""}{a.city ?? ""}{a.postcode ? " — " + a.postcode : ""}
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="panel" style={{ padding: 16, marginBottom: 14 }}>
                <div className="pdp-label">Items</div>
                {linesFor(selected.id).map((l) => (
                  <div key={l.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--line)", fontSize: 13 }}>
                    <span>{l.nameSnapshot} <span style={{ color: "var(--ink-soft)" }}>× {l.qty}</span></span>
                    <span>{formatBdt(l.lineTotalBdt)}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, fontWeight: 500 }}>
                  <span>Total</span><span>{formatBdt(selected.totalBdt)}</span>
                </div>
              </div>

              <div className="panel" style={{ padding: 16, marginBottom: 14 }}>
                <div className="pdp-label">Status</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {STATUSES.map((st) => (
                    <button key={st} className={"filter-pill " + (selected.status === st ? "active" : "")}
                      onClick={() => startTransition(async () => {
                        await updateOrderStatus(selected.id, st);
                        setSelected({ ...selected, status: st });
                        // Refresh timeline so the new event appears immediately.
                        getOrderTimeline(selected.id).then(setTimeline).catch(() => {});
                      })}
                      style={{ padding: "5px 10px", fontSize: 11 }}>
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <RefundPanel
                orderId={selected.id}
                orderTotalBdt={selected.totalBdt}
                onIssued={() => {
                  // Refresh the timeline so the new refund event appears.
                  getOrderTimeline(selected.id).then(setTimeline).catch(() => {});
                }}
              />

              <Timeline events={timeline} loading={timelineLoading} />

              {selected.shippingCourier ? (
                <div className="panel" style={{ padding: 16, background: "var(--purple-50)" }}>
                  <div className="pdp-label">Courier</div>
                  <div style={{ fontSize: 13 }}><b>{selected.shippingCourier}</b> · {selected.shippingTracking}</div>
                </div>
              ) : (
                <div className="panel" style={{ padding: 16, background: "var(--purple-50)" }}>
                  <div className="pdp-label">Book courier</div>
                  <div className="row">
                    <div className="field">
                      <label>Courier</label>
                      <select value={courier} onChange={(e) => setCourier(e.target.value as "pathao" | "steadfast")}>
                        <option value="pathao">Pathao</option>
                        <option value="steadfast">Steadfast</option>
                      </select>
                    </div>
                  </div>
                  {courier === "pathao" && (
                    <div className="row">
                      <div className="field"><label>Pathao city ID</label><input type="number" value={pathaoCity} onChange={(e) => setPathaoCity(e.target.value)}/></div>
                      <div className="field"><label>Pathao zone ID</label><input type="number" value={pathaoZone} onChange={(e) => setPathaoZone(e.target.value)}/></div>
                    </div>
                  )}
                  <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }}
                    onClick={() => {
                      setBookError(null);
                      startTransition(async () => {
                        const r = await bookCourier({
                          orderId: selected.id,
                          courier,
                          ...(courier === "pathao" && {
                            pathaoCity: parseInt(pathaoCity) || 1,
                            pathaoZone: parseInt(pathaoZone) || 1,
                          }),
                        });
                        if (!r.ok) setBookError(r.error);
                      });
                    }}>
                    Book {courier}
                  </button>
                  {bookError && <p style={{ color: "var(--err)", fontSize: 12, marginTop: 8 }}>{bookError}</p>}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

const EVENT_LABEL: Record<string, string> = {
  created: "Order placed",
  status_changed: "Status changed",
  courier_booked: "Courier booked",
  refund_issued: "Refund issued",
  note_added: "Note added",
  email_sent: "Email sent",
  sms_sent: "SMS sent",
  payment_received: "Payment received",
};

function Timeline({ events, loading }: { events: OrderEvent[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="panel" style={{ padding: 16, marginTop: 14 }}>
        <div className="pdp-label">Timeline</div>
        <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: "8px 0 0" }}>Loading…</p>
      </div>
    );
  }
  if (events.length === 0) return null;

  return (
    <div className="panel" style={{ padding: 16, marginTop: 14 }}>
      <div className="pdp-label">Timeline</div>
      <ol style={{ listStyle: "none", padding: 0, margin: "8px 0 0" }}>
        {events.map((e) => {
          const p = (e.payload as Record<string, unknown>) ?? {};
          const date = new Date(e.createdAt);
          let detail: string | null = null;
          if (e.type === "status_changed") detail = `${p.from ?? "—"} → ${p.to ?? "—"}`;
          else if (e.type === "courier_booked") detail = `${p.courier ?? ""} · ${p.tracking ?? ""}`.trim();
          else if (e.type === "refund_issued") detail = `${typeof p.amount === "number" ? `৳${(p.amount as number).toLocaleString("en-IN")}` : ""}${p.method ? ` · ${p.method}` : ""}${p.reason ? ` — ${p.reason}` : ""}`;
          else if (e.type === "note_added" && typeof p.note === "string") detail = p.note;
          return (
            <li key={e.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--line)", fontSize: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <b style={{ color: "var(--purple-900)" }}>{EVENT_LABEL[e.type] ?? e.type}</b>
                <span style={{ color: "var(--ink-soft)", fontFamily: "var(--mono)", fontSize: 10 }}>
                  {date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                </span>
              </div>
              {detail && <div style={{ color: "var(--ink-soft)", marginTop: 2, whiteSpace: "pre-wrap" }}>{detail}</div>}
              {e.actorEmail && (
                <div style={{ color: "var(--ink-soft)", marginTop: 2, fontSize: 10 }}>by {e.actorEmail}</div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
