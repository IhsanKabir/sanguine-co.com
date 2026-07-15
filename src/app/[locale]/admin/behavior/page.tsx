import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { requirePermission } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

type Range = { days: number; label: string };
const RANGES: Range[] = [
  { days: 7, label: "Last 7 days" },
  { days: 30, label: "Last 30 days" },
  { days: 90, label: "Last 90 days" },
];

// Centralised error sink so all five queries below surface their failure to
// Vercel logs instead of silently rendering zeros. Returns the supplied empty
// fallback so the page still renders.
function logAndFallback<T>(label: string, fallback: T) {
  return (e: unknown) => {
    const msg = e instanceof Error ? `${e.message}\n${e.stack ?? ""}` : String(e);
    console.error(`[admin/behavior] ${label} failed:`, msg);
    return fallback;
  };
}

export default async function AdminBehaviorPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  await requirePermission("behavior");
  const sp = await searchParams;
  const days = parseInt(sp.days || "30") || 30;
  // ISO string, NOT a Date: drizzle's raw sql template passes params
  // unserialized to postgres.js, whose wire encoder rejects Date objects —
  // every query below silently failed into its empty fallback, rendering the
  // whole page as zeros. (Same root cause isolated in the health board.)
  const since = new Date(Date.now() - days * 86400_000).toISOString();

  const funnelRows = await db.execute<{
    sessions: number; product_views: number; adds: number; checkouts: number; orders: number;
  }>(sql`
    select
      count(*) filter (where type = 'session_start')::int   as sessions,
      count(*) filter (where type = 'product_view')::int    as product_views,
      count(*) filter (where type = 'add_to_cart')::int     as adds,
      count(*) filter (where type = 'checkout_start')::int  as checkouts,
      count(*) filter (where type = 'order_placed')::int    as orders
    from events
    where created_at >= ${since}::timestamptz
  `).catch(logAndFallback("funnel", [{ sessions: 0, product_views: 0, adds: 0, checkouts: 0, orders: 0 }] as Array<{
    sessions: number; product_views: number; adds: number; checkouts: number; orders: number;
  }>));
  // Defensive — drizzle has shipped versions where execute() returns
  // `{ rows }` or `Row[]` depending on driver; pull the first row from either.
  const funnel = Array.isArray(funnelRows)
    ? funnelRows[0]
    : (funnelRows as { rows?: unknown[] }).rows?.[0] as typeof funnelRows[number] | undefined;

  const topSearchesRaw = await db.execute<{ query: string; count: number; zero_results: number }>(sql`
    select
      payload->>'query' as query,
      count(*)::int as count,
      sum(case when (payload->>'zero_result')::boolean then 1 else 0 end)::int as zero_results
    from events
    where type = 'search'
      and created_at >= ${since}::timestamptz
      and payload->>'query' is not null
    group by query
    order by count desc
    limit 15
  `).catch(logAndFallback("topSearches", [] as Array<{ query: string; count: number; zero_results: number }>));
  const topSearches = Array.isArray(topSearchesRaw) ? topSearchesRaw : (topSearchesRaw as { rows?: typeof topSearchesRaw }).rows ?? [];

  const topProductsRaw = await db.execute<{ product_id: string; views: number; name: string | null }>(sql`
    select
      coalesce(product_id, path) as product_id,
      count(*)::int as views,
      (select name from products where slug = coalesce(events.product_id, replace(events.path, '/product/', '')) limit 1) as name
    from events
    where type = 'product_view'
      and created_at >= ${since}::timestamptz
    group by product_id
    order by views desc
    limit 10
  `).catch(logAndFallback("topProducts", [] as Array<{ product_id: string; views: number; name: string | null }>));
  const topProducts = Array.isArray(topProductsRaw) ? topProductsRaw : (topProductsRaw as { rows?: typeof topProductsRaw }).rows ?? [];

  const topPagesRaw = await db.execute<{ path: string; views: number }>(sql`
    select path, count(*)::int as views
    from events
    where type = 'page_view'
      and created_at >= ${since}::timestamptz
      and path is not null
    group by path
    order by views desc
    limit 12
  `).catch(logAndFallback("topPages", [] as Array<{ path: string; views: number }>));
  const topPages = Array.isArray(topPagesRaw) ? topPagesRaw : (topPagesRaw as { rows?: typeof topPagesRaw }).rows ?? [];

  const dailyVolumeRaw = await db.execute<{ day: string; sessions: number; orders: number }>(sql`
    select to_char(created_at, 'YYYY-MM-DD') as day,
           count(*) filter (where type = 'session_start')::int as sessions,
           count(*) filter (where type = 'order_placed')::int as orders
    from events
    where created_at >= ${since}::timestamptz
    group by day
    order by day asc
  `).catch(logAndFallback("dailyVolume", [] as Array<{ day: string; sessions: number; orders: number }>));
  const dailyVolume = Array.isArray(dailyVolumeRaw) ? dailyVolumeRaw : (dailyVolumeRaw as { rows?: typeof dailyVolumeRaw }).rows ?? [];

  const safeFunnel = funnel ?? { sessions: 0, product_views: 0, adds: 0, checkouts: 0, orders: 0 };
  const max = Math.max(1, safeFunnel.sessions, safeFunnel.product_views, safeFunnel.adds, safeFunnel.checkouts, safeFunnel.orders);

  // Conversion ratios
  const atcRate = safeFunnel.sessions > 0 ? (safeFunnel.adds / safeFunnel.sessions * 100) : 0;
  const checkoutRate = safeFunnel.adds > 0 ? (safeFunnel.checkouts / safeFunnel.adds * 100) : 0;
  const overall = safeFunnel.sessions > 0 ? (safeFunnel.orders / safeFunnel.sessions * 100) : 0;

  const maxDay = Math.max(1, ...dailyVolume.map((d) => d.sessions));

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", marginBottom: 24 }}>
        <div>
          <h1 className="admin-h1">Behavior Insights</h1>
          <p className="admin-sub">Real events from the storefront. Last {days} days.</p>
        </div>
        <div className="period-chips">
          {RANGES.map((r) => (
            <a key={r.days} href={`?days=${r.days}`} className="chip" style={{ textDecoration: "none" }}>
              {r.label}
            </a>
          ))}
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat kpi"><div className="kpi-top"><div className="k">Sessions</div></div><div className="v">{safeFunnel.sessions}</div></div>
        <div className="stat kpi"><div className="kpi-top"><div className="k">Add-to-cart rate</div></div><div className="v">{atcRate.toFixed(1)}%</div></div>
        <div className="stat kpi"><div className="kpi-top"><div className="k">ATC → checkout</div></div><div className="v">{checkoutRate.toFixed(1)}%</div></div>
        <div className="stat kpi"><div className="kpi-top"><div className="k">Overall conversion</div></div><div className="v">{overall.toFixed(2)}%</div></div>
      </div>

      <div className="chart-row" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
        <div className="chart">
          <div className="chart-hd"><h3>Real Conversion Funnel</h3></div>
          <div className="funnel">
            {[
              ["Sessions",          safeFunnel.sessions],
              ["Product views",     safeFunnel.product_views],
              ["Add to bag",        safeFunnel.adds],
              ["Checkout started",  safeFunnel.checkouts],
              ["Orders placed",     safeFunnel.orders],
            ].map(([label, value], i, arr) => {
              const v = value as number;
              const pct = Math.round((v / max) * 100);
              const prev = i === 0 ? null : arr[i - 1][1] as number;
              const conv = prev !== null && prev > 0 ? Math.round((v / prev) * 100) : null;
              return (
                <div key={label as string} className="funnel-row">
                  <div className="funnel-lbl">
                    <div className="k">{label as string}</div>
                    <div className="v">{v.toLocaleString("en-IN")}</div>
                  </div>
                  <div className="funnel-bar"><div className="funnel-fill" style={{ width: pct + "%" }} /></div>
                  <div className="funnel-conv">{conv === null ? "100%" : `${conv}%`}</div>
                </div>
              );
            })}
          </div>
          <div className="funnel-foot">
            <span>Luxury fashion industry benchmark: ~7.5% ATC, ~0.7-0.8% overall conversion.</span>
          </div>
        </div>

        <div className="chart">
          <div className="chart-hd"><h3>Daily volume</h3></div>
          {dailyVolume.length === 0 ? <p style={{ color: "var(--ink-soft)" }}>No data yet — open the storefront to fire events.</p> : (
            <div className="barchart-wrap">
              <div className="barchart">
                {dailyVolume.map((d) => (
                  <div key={d.day} className="bar" style={{ height: `${(d.sessions / maxDay) * 100}%` }} title={`${d.day}: ${d.sessions} sessions, ${d.orders} orders`} />
                ))}
              </div>
              <div className="barchart-x">
                {dailyVolume.map((d, i) => <div key={d.day}>{i % Math.ceil(dailyVolume.length / 6 || 1) === 0 ? d.day.slice(5) : ""}</div>)}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="chart-row" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="chart">
          <div className="chart-hd"><h3>Top searches</h3></div>
          {topSearches.length === 0 ? <p style={{ color: "var(--ink-soft)", fontSize: 13 }}>No searches yet.</p> : (
            <div className="table" style={{ border: "none" }}>
              <table>
                <thead><tr><th>Query</th><th>Count</th><th>Zero results</th></tr></thead>
                <tbody>
                  {topSearches.map((s) => (
                    <tr key={s.query}>
                      <td style={{ fontWeight: 500 }}>{s.query}</td>
                      <td>{s.count}</td>
                      <td>{s.zero_results > 0 ? <span className="pill pill-err">{s.zero_results}</span> : <span style={{ color: "var(--ink-soft)" }}>0</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 8 }}>
                Zero-result searches are catalogue-expansion signals — what customers want that you don&apos;t sell.
              </p>
            </div>
          )}
        </div>

        <div className="chart">
          <div className="chart-hd"><h3>Most-viewed products</h3></div>
          {topProducts.length === 0 ? <p style={{ color: "var(--ink-soft)", fontSize: 13 }}>No product views yet.</p> : (
            <div className="table" style={{ border: "none" }}>
              <table>
                <thead><tr><th>#</th><th>Product</th><th>Views</th></tr></thead>
                <tbody>
                  {topProducts.map((p, i) => (
                    <tr key={p.product_id}>
                      <td style={{ fontFamily: "var(--serif)", color: "var(--gold-deep)", fontSize: 16 }}>0{i + 1}</td>
                      <td style={{ fontWeight: 500 }}>{p.name || p.product_id}</td>
                      <td>{p.views}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="chart" style={{ marginTop: 16 }}>
        <div className="chart-hd"><h3>Top pages</h3></div>
        {topPages.length === 0 ? <p style={{ color: "var(--ink-soft)", fontSize: 13 }}>No page views yet.</p> : (
          <div className="table" style={{ border: "none" }}>
            <table>
              <thead><tr><th>Path</th><th>Views</th></tr></thead>
              <tbody>
                {topPages.map((p) => (
                  <tr key={p.path}>
                    <td className="mono" style={{ fontSize: 12 }}>{p.path}</td>
                    <td>{p.views}</td>
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
