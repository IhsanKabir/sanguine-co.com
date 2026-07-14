import { db, schema } from "@/lib/db";
import { sql, desc } from "drizzle-orm";
import { formatBdt } from "@/lib/utils";
import { requirePermission } from "@/lib/auth-utils";

export default async function AdminAnalyticsPage() {
  const ctx = await requirePermission("analytics");
  const canSeeRevenue = ctx.has("revenue");
  // Real aggregates from the orders table
  const [revRow] = await db.execute<{
    total_orders: number; total_revenue: number; aov: number;
  }>(sql`
    select
      count(*)::int as total_orders,
      coalesce(sum(${schema.orders.totalBdt} + ${schema.orders.depositPaidBdt}), 0)::int as total_revenue,
      coalesce(round(avg(${schema.orders.totalBdt}))::int, 0) as aov
    from ${schema.orders}
  `).catch(() => [{ total_orders: 0, total_revenue: 0, aov: 0 }]);

  const statusBreakdown = await db.execute<{ status: string; count: number; total: number }>(sql`
    select ${schema.orders.status} as status, count(*)::int as count, coalesce(sum(${schema.orders.totalBdt} + ${schema.orders.depositPaidBdt}), 0)::int as total
    from ${schema.orders}
    group by ${schema.orders.status}
  `).catch(() => []);

  const topProducts = await db.execute<{ product_id: string; name: string; units: number; revenue: number }>(sql`
    select
      ${schema.orderLines.productId} as product_id,
      ${schema.orderLines.nameSnapshot} as name,
      sum(${schema.orderLines.qty})::int as units,
      sum(${schema.orderLines.lineTotalBdt})::int as revenue
    from ${schema.orderLines}
    group by product_id, name
    order by revenue desc
    limit 10
  `).catch(() => []);

  const recentOrders = await db.select().from(schema.orders).orderBy(desc(schema.orders.createdAt)).limit(30).catch(() => []);

  // Synthetic funnel — until we wire PostHog/analytics, derive a placeholder
  // from order count so the visual still tells a story.
  const orders = revRow.total_orders;
  const funnel = [
    { k: "Sessions",         v: Math.max(orders * 80, 0) },
    { k: "Product views",    v: Math.max(orders * 40, 0) },
    { k: "Add to bag",       v: Math.max(orders * 8,  0) },
    { k: "Checkout started", v: Math.max(orders * 2,  0) },
    { k: "Orders placed",    v: orders },
  ];
  const max = funnel[0].v || 1;

  return (
    <>
      <h1 className="admin-h1">Analytics</h1>
      <p className="admin-sub">Live aggregates from your order history. Once you wire PostHog/Cloudflare Analytics, sessions and views become real.</p>

      <div className="stat-grid">
        {canSeeRevenue && (
          <div className="stat kpi"><div className="kpi-top"><div className="k">Total revenue</div></div><div className="v">{formatBdt(revRow.total_revenue)}</div></div>
        )}
        <div className="stat kpi"><div className="kpi-top"><div className="k">Total orders</div></div><div className="v">{revRow.total_orders}</div></div>
        {canSeeRevenue && (
          <div className="stat kpi"><div className="kpi-top"><div className="k">Avg. basket</div></div><div className="v">{formatBdt(revRow.aov)}</div></div>
        )}
        <div className="stat kpi"><div className="kpi-top"><div className="k">Order lines</div></div><div className="v">{topProducts.reduce((s, p) => s + p.units, 0)}</div></div>
      </div>

      <div className="chart-row" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
        <div className="chart">
          <div className="chart-hd"><h3>Conversion Funnel · all-time</h3></div>
          <div className="funnel">
            {funnel.map((s, i) => {
              const pct = Math.round((s.v / max) * 100);
              const conv = i === 0 ? null : Math.round((s.v / (funnel[i - 1].v || 1)) * 100);
              return (
                <div key={s.k} className="funnel-row">
                  <div className="funnel-lbl">
                    <div className="k">{s.k}</div>
                    <div className="v">{s.v.toLocaleString("en-IN")}</div>
                  </div>
                  <div className="funnel-bar"><div className="funnel-fill" style={{ width: pct + "%" }} /></div>
                  <div className="funnel-conv">{conv === null ? "100%" : `${conv}%`}</div>
                </div>
              );
            })}
          </div>
          <div className="funnel-foot">
            <span>Note: top-of-funnel numbers are derived placeholders until web analytics are wired.</span>
          </div>
        </div>
        <div className="chart">
          <div className="chart-hd"><h3>Status breakdown</h3></div>
          {statusBreakdown.length === 0 ? (
            <p style={{ color: "var(--ink-soft)", fontSize: 13 }}>No data yet.</p>
          ) : (
            <div>
              {statusBreakdown.map((s) => (
                <div key={s.status} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--line)", fontSize: 13 }}>
                  <span><span className={"pill " + (s.status === "delivered" ? "pill-ok" : s.status === "shipped" ? "pill-info" : s.status === "cancelled" ? "pill-err" : "pill-warn")} style={{ marginRight: 8 }}>{s.status}</span></span>
                  <span><b>{s.count}</b>{canSeeRevenue && <> · {formatBdt(s.total)}</>}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="chart" style={{ marginTop: 16 }}>
        <div className="chart-hd"><h3>Top products by revenue</h3></div>
        {topProducts.length === 0 ? (
          <p style={{ color: "var(--ink-soft)", fontSize: 13 }}>No product orders yet.</p>
        ) : (
          <div className="table" style={{ border: "none" }}>
            <table>
              <thead><tr><th>Rank</th><th>Product</th><th>Units sold</th>{canSeeRevenue && <th>Revenue</th>}</tr></thead>
              <tbody>
                {topProducts.map((p, i) => (
                  <tr key={p.product_id}>
                    <td style={{ fontFamily: "var(--serif)", color: "var(--gold-deep)", fontSize: 18 }}>0{i + 1}</td>
                    <td style={{ fontWeight: 500 }}>{p.name}</td>
                    <td>{p.units}</td>
                    {canSeeRevenue && <td style={{ fontWeight: 500 }}>{formatBdt(p.revenue)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="chart" style={{ marginTop: 16 }}>
        <div className="chart-hd"><h3>Recent 30 orders</h3></div>
        <div className="table" style={{ border: "none" }}>
          <table>
            <thead><tr><th>Order</th>{canSeeRevenue && <th>Total</th>}<th>Status</th><th>Method</th></tr></thead>
            <tbody>
              {recentOrders.map((o) => (
                <tr key={o.id}>
                  <td className="mono" style={{ fontSize: 11 }}>{o.number}</td>
                  {canSeeRevenue && <td style={{ fontWeight: 500 }}>{formatBdt(o.totalBdt)}</td>}
                  <td><span className={"pill " + (o.status === "delivered" ? "pill-ok" : o.status === "shipped" ? "pill-info" : o.status === "cancelled" ? "pill-err" : "pill-warn")}>{o.status}</span></td>
                  <td>{o.paymentMethod}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
