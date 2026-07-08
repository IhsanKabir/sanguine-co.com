"use client";

import { useState, useTransition } from "react";
import { exportSalesCsv } from "@/lib/actions/reports";
import { formatBdt } from "@/lib/utils";
import Icon from "@/components/storefront/Icon";

type SalesData = Awaited<ReturnType<typeof import("@/lib/actions/reports").getSalesData>>;
type CodData = Awaited<ReturnType<typeof import("@/lib/actions/reports").getCodReconciliation>>;

type Props = {
  initialPreset: "7d" | "30d" | "mtd" | "qtd" | "ytd";
  initialFrom: string;
  initialTo: string;
  sales: SalesData;
  cod: CodData;
};

const PRESETS: Array<{ id: Props["initialPreset"]; label: string }> = [
  { id: "7d",  label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "mtd", label: "Month to date" },
  { id: "qtd", label: "Quarter to date" },
  { id: "ytd", label: "Year to date" },
];

export default function ReportsClient({ initialFrom, initialTo, sales, cod }: Props) {
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [tab, setTab] = useState<"sales" | "cod">("sales");
  const [, startTransition] = useTransition();

  const setPreset = (p: Props["initialPreset"]) => {
    const params = new URLSearchParams(window.location.search);
    params.set("preset", p);
    params.delete("from");
    params.delete("to");
    window.location.search = params.toString();
  };

  const applyCustom = () => {
    const params = new URLSearchParams();
    params.set("from", from);
    params.set("to", to);
    window.location.search = params.toString();
  };

  const exportCsv = () => {
    startTransition(async () => {
      const csv = await exportSalesCsv({ from: new Date(from), to: new Date(to) });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sanguine-sales-${from}-${to}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", marginBottom: 24 }}>
        <div>
          <h1 className="admin-h1">Reports</h1>
          <p className="admin-sub">Sales and Cash-on-Delivery reconciliation. {from} → {to}.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={exportCsv}>
          <Icon name="arrow" size={14} /> Export CSV
        </button>
      </div>

      {/* Date range controls */}
      <div className="panel" style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div className="period-chips" role="tablist" aria-label="Date range">
            {PRESETS.map((p) => (
              <button key={p.id} className="chip" onClick={() => setPreset(p.id)} type="button">
                {p.label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ padding: "8px 10px", border: "1px solid var(--line)", fontSize: 13 }} />
            <span style={{ color: "var(--ink-soft)", fontSize: 12 }}>to</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ padding: "8px 10px", border: "1px solid var(--line)", fontSize: 13 }} />
            <button className="btn btn-ghost btn-sm" onClick={applyCustom}>Apply</button>
          </div>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="filter-bar" style={{ marginBottom: 18 }}>
        <button className={"filter-pill " + (tab === "sales" ? "active" : "")} onClick={() => setTab("sales")}>Sales</button>
        <button className={"filter-pill " + (tab === "cod" ? "active" : "")} onClick={() => setTab("cod")}>COD reconciliation</button>
      </div>

      {tab === "sales" ? <SalesView data={sales} /> : <CodView data={cod} />}
    </>
  );
}

function SalesView({ data }: { data: SalesData }) {
  const { canSeeRevenue, summary, byStatus, byPayment, bySegment, byCity, byDay, topProducts } = data;
  const maxDay = Math.max(1, ...byDay.map((d) => d.total));

  return (
    <>
      <div className="stat-grid">
        <div className="stat kpi"><div className="kpi-top"><div className="k">Orders</div></div><div className="v">{summary.orders}</div></div>
        <div className="stat kpi"><div className="kpi-top"><div className="k">Units sold</div></div><div className="v">{summary.units}</div></div>
        {canSeeRevenue && (
          <>
            <div className="stat kpi"><div className="kpi-top"><div className="k">Revenue</div></div><div className="v">{formatBdt(summary.revenue)}</div></div>
            <div className="stat kpi"><div className="kpi-top"><div className="k">Avg. basket</div></div><div className="v">{formatBdt(summary.aov)}</div></div>
          </>
        )}
      </div>

      <div className="chart-row" style={{ gridTemplateColumns: "2fr 1fr" }}>
        <div className="chart">
          <div className="chart-hd"><h3>Orders by day</h3></div>
          {byDay.length === 0 ? <p style={{ color: "var(--ink-soft)" }}>No orders in range.</p> : (
            <div className="barchart-wrap">
              <div className="barchart">
                {byDay.map((d) => (
                  <div key={d.day} className="bar" style={{ height: `${(d.total / maxDay) * 100}%` }} title={`${d.day}: ${d.count} orders, ${formatBdt(d.total)}`} />
                ))}
              </div>
              <div className="barchart-x">
                {byDay.map((d, i) => (
                  <div key={d.day}>{i % Math.ceil(byDay.length / 8 || 1) === 0 ? d.day.slice(5) : ""}</div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="chart">
          <div className="chart-hd"><h3>By status</h3></div>
          {byStatus.map((s) => (
            <div key={s.status} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--line)", fontSize: 13 }}>
              <span><span className={"pill " + (s.status === "delivered" ? "pill-ok" : s.status === "shipped" ? "pill-info" : s.status === "cancelled" ? "pill-err" : "pill-warn")}>{s.status}</span></span>
              <span><b>{s.count}</b>{canSeeRevenue && <> · {formatBdt(s.total)}</>}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="chart-row" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
        <div className="chart">
          <div className="chart-hd"><h3>By segment</h3></div>
          {bySegment.length === 0 ? <p style={{ color: "var(--ink-soft)", fontSize: 13 }}>No data.</p> : bySegment.map((s) => (
            <div key={s.segment_id || "—"} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--line)", fontSize: 13 }}>
              <span>{s.segment_name || s.segment_id || "—"}</span>
              <span><b>{s.units}</b> units{canSeeRevenue && <> · {formatBdt(s.revenue)}</>}</span>
            </div>
          ))}
        </div>
        <div className="chart">
          <div className="chart-hd"><h3>By payment method</h3></div>
          {byPayment.map((p) => (
            <div key={p.method} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--line)", fontSize: 13 }}>
              <span style={{ textTransform: "capitalize" }}>{p.method}</span>
              <span><b>{p.count}</b>{canSeeRevenue && <> · {formatBdt(p.total)}</>}</span>
            </div>
          ))}
        </div>
        <div className="chart">
          <div className="chart-hd"><h3>By city</h3></div>
          {byCity.map((c) => (
            <div key={c.city} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--line)", fontSize: 13 }}>
              <span>{c.city}</span>
              <span><b>{c.count}</b>{canSeeRevenue && <> · {formatBdt(c.total)}</>}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="chart" style={{ marginTop: 16 }}>
        <div className="chart-hd"><h3>Top products in range</h3></div>
        {topProducts.length === 0 ? <p style={{ color: "var(--ink-soft)", fontSize: 13 }}>No product orders.</p> : (
          <div className="table" style={{ border: "none" }}>
            <table>
              <thead><tr><th>#</th><th>Product</th><th>SKU</th><th>Units</th>{canSeeRevenue && <th>Revenue</th>}</tr></thead>
              <tbody>
                {topProducts.map((p, i) => (
                  <tr key={p.product_id}>
                    <td style={{ fontFamily: "var(--serif)", color: "var(--gold-deep)", fontSize: 18 }}>0{i + 1}</td>
                    <td style={{ fontWeight: 500 }}>{p.name}</td>
                    <td className="mono" style={{ fontSize: 11, color: "var(--ink-soft)" }}>{p.sku}</td>
                    <td>{p.units}</td>
                    {canSeeRevenue && <td style={{ fontWeight: 500 }}>{formatBdt(p.revenue)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function CodView({ data }: { data: CodData }) {
  const { summary, stale } = data;
  const grouped: Record<string, { status: string; count: number; total: number }[]> = {};
  for (const r of summary) {
    grouped[r.courier ?? "—"] ??= [];
    grouped[r.courier ?? "—"].push({ status: r.status, count: r.count, total: r.total });
  }
  const totalOutstanding = summary
    .filter((s) => s.status === "cod_pending" || s.status === "shipped")
    .reduce((sum, s) => sum + s.total, 0);

  return (
    <>
      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="stat kpi"><div className="kpi-top"><div className="k">Outstanding COD</div></div><div className="v" style={{ color: "var(--err)" }}>{formatBdt(totalOutstanding)}</div></div>
        <div className="stat kpi"><div className="kpi-top"><div className="k">Stale orders (&gt;7 days)</div></div><div className="v">{stale.length}</div></div>
        <div className="stat kpi"><div className="kpi-top"><div className="k">Courier groups</div></div><div className="v">{Object.keys(grouped).length}</div></div>
      </div>

      <div className="chart-row" style={{ gridTemplateColumns: "1fr" }}>
        <div className="chart">
          <div className="chart-hd"><h3>By courier × status</h3></div>
          {Object.keys(grouped).length === 0 ? <p style={{ color: "var(--ink-soft)" }}>No COD orders in range.</p> : (
            <div className="table" style={{ border: "none" }}>
              <table>
                <thead><tr><th>Courier</th><th>Status</th><th>Orders</th><th>Total COD</th></tr></thead>
                <tbody>
                  {Object.entries(grouped).flatMap(([courier, rows]) =>
                    rows.map((r) => (
                      <tr key={`${courier}-${r.status}`}>
                        <td style={{ textTransform: "capitalize", fontWeight: 500 }}>{courier}</td>
                        <td><span className={"pill " + (r.status === "delivered" ? "pill-ok" : r.status === "shipped" ? "pill-info" : r.status === "cancelled" ? "pill-err" : "pill-warn")}>{r.status}</span></td>
                        <td>{r.count}</td>
                        <td style={{ fontWeight: 500 }}>{formatBdt(r.total)}</td>
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="chart" style={{ marginTop: 16 }}>
        <div className="chart-hd"><h3>Stale orders requiring follow-up</h3></div>
        {stale.length === 0 ? (
          <p style={{ color: "oklch(.45 .15 145)", fontSize: 13 }}>✓ No stale orders. Every COD order is either delivered, cancelled, or under 7 days old.</p>
        ) : (
          <div className="table" style={{ border: "none" }}>
            <table>
              <thead><tr><th>Order</th><th>Days old</th><th>Status</th><th>Courier</th><th>Tracking</th><th>Total</th></tr></thead>
              <tbody>
                {stale.map((s) => (
                  <tr key={s.id}>
                    <td className="mono" style={{ fontSize: 11 }}>{s.number}</td>
                    <td><span className={"pill " + (s.days_old > 14 ? "pill-err" : "pill-warn")}>{s.days_old} days</span></td>
                    <td><span className={"pill " + (s.status === "shipped" ? "pill-info" : "pill-warn")}>{s.status}</span></td>
                    <td style={{ textTransform: "capitalize" }}>{s.courier || "— not booked"}</td>
                    <td className="mono" style={{ fontSize: 11 }}>{s.tracking || "—"}</td>
                    <td style={{ fontWeight: 500 }}>{formatBdt(s.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
