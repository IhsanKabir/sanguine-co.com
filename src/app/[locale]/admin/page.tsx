import { db, schema } from "@/lib/db";
import { desc, sql } from "drizzle-orm";
import { formatBdt, formatDate } from "@/lib/utils";
import { Link } from "@/i18n/routing";
import { requirePermission } from "@/lib/auth-utils";

export default async function AdminDashboard() {
  const ctx = await requirePermission("dashboard");
  const canSeeRevenue = ctx.has("revenue");
  // Aggregate KPIs from real data
  const [{ count: orderCount = 0 } = { count: 0 }] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.orders).catch(() => [{ count: 0 }] as never);
  const [{ revenue = 0 } = { revenue: 0 }] = await db.select({ revenue: sql<number>`coalesce(sum(${schema.orders.totalBdt} + ${schema.orders.depositPaidBdt}), 0)::int` }).from(schema.orders).catch(() => [{ revenue: 0 }] as never);
  const [{ count: productCount = 0 } = { count: 0 }] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.products).catch(() => [{ count: 0 }] as never);
  const [{ count: lowStock = 0 } = { count: 0 }] = await db.select({ count: sql<number>`count(*)::int` })
    .from(schema.products).where(sql`${schema.products.stock} < 5`).catch(() => [{ count: 0 }] as never);

  const recent = await db.select().from(schema.orders).orderBy(desc(schema.orders.createdAt)).limit(8).catch(() => []);
  const lowStockProducts = await db.select().from(schema.products)
    .where(sql`${schema.products.stock} < 10`)
    .orderBy(schema.products.stock)
    .limit(6).catch(() => []);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <>
      <h1 className="admin-h1">{greeting}</h1>
      <p className="admin-sub">Soft-launch dashboard · COD-only · {formatDate(new Date())}</p>

      <div className="stat-grid">
        {canSeeRevenue && (
          <div className="stat kpi">
            <div className="kpi-top"><div className="k">Revenue · all time</div></div>
            <div className="v">{formatBdt(revenue)}</div>
          </div>
        )}
        <div className="stat kpi">
          <div className="kpi-top"><div className="k">Orders · all time</div></div>
          <div className="v">{orderCount}</div>
        </div>
        <div className="stat kpi">
          <div className="kpi-top"><div className="k">Products live</div></div>
          <div className="v">{productCount}</div>
        </div>
        <div className="stat kpi">
          <div className="kpi-top">
            <div className="k">Low stock</div>
            {lowStock > 0 && <div className="d down"><span className="d-arrow">↓</span> {lowStock}</div>}
          </div>
          <div className="v">{lowStock}</div>
        </div>
      </div>

      <div className="chart-row" style={{ gridTemplateColumns: "1.5fr 1fr" }}>
        <div className="chart">
          <div className="chart-hd"><h3>Recent orders</h3></div>
          {recent.length === 0 ? (
            <p style={{ color: "var(--ink-soft)", fontSize: 13 }}>No orders yet.</p>
          ) : (
            <div className="table" style={{ border: "none" }}>
              <table>
                <thead><tr><th>Order</th>{canSeeRevenue && <th>Total</th>}<th>Status</th><th>Date</th></tr></thead>
                <tbody>
                  {recent.map((o) => (
                    <tr key={o.id}>
                      <td style={{ fontFamily: "var(--mono)" }}>
                        <Link href="/admin/orders">{o.number}</Link>
                      </td>
                      {canSeeRevenue && <td>{formatBdt(o.totalBdt)}</td>}
                      <td>
                        <span className={"pill " + (o.status === "delivered" ? "pill-ok" : o.status === "shipped" ? "pill-info" : o.status === "cancelled" ? "pill-err" : "pill-warn")}>
                          {o.status}
                        </span>
                      </td>
                      <td style={{ color: "var(--ink-soft)", fontSize: 12 }}>{formatDate(o.createdAt!)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="chart">
          <div className="chart-hd"><h3>Low stock</h3></div>
          {lowStockProducts.length === 0 ? (
            <p style={{ color: "var(--ink-soft)", fontSize: 13 }}>All inventory healthy.</p>
          ) : (
            <div>
              {lowStockProducts.map((p, i) => (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: i < lowStockProducts.length - 1 ? "1px solid var(--line)" : "none" }}>
                  <div>
                    <div style={{ fontSize: 13, color: "var(--purple-900)", fontWeight: 500 }}>{p.name}</div>
                    <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-soft)" }}>{p.sku}</div>
                  </div>
                  <span className={"pill " + (p.stock < 5 ? "pill-err" : "pill-warn")}>{p.stock} left</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
