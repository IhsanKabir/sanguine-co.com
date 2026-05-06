import { db, schema } from "@/lib/db";
import { sql } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";
import { formatBdt, formatDate } from "@/lib/utils";
import { requirePermission } from "@/lib/auth-utils";
import Link from "next/link";

type CustomerRow = {
  email: string;
  fullName: string | null;
  phone: string | null;
  city: string | null;
  orderCount: number;
  totalSpentBdt: number;
  lastOrderAt: Date | null;
};

const TIERS = [
  { min: 150_000, name: "Grand Élite",       pill: "pill-ok"   },
  { min: 50_000,  name: "Patron de Maison",   pill: "pill-ok"   },
  { min: 10_000,  name: "Atelier Guest",       pill: "pill-info" },
  { min: 0,       name: "Maison Initié",       pill: "pill-warn" },
] as const;

function tierFor(spend: number) {
  return TIERS.find((t) => spend >= t.min) ?? TIERS[TIERS.length - 1];
}

async function getCustomers(): Promise<CustomerRow[]> {
  const rows = await db.execute<{
    email: string;
    full_name: string | null;
    phone: string | null;
    city: string | null;
    order_count: number;
    total_spent: number;
    last_order_at: Date | null;
  }>(sql`
    select
      coalesce(${schema.orders.guestEmail}, '') as email,
      (${schema.orders.shippingAddress}->>'fullName') as full_name,
      coalesce(${schema.orders.guestPhone}, ${schema.orders.shippingAddress}->>'phone') as phone,
      (${schema.orders.shippingAddress}->>'city') as city,
      count(*)::int as order_count,
      sum(${schema.orders.totalBdt})::int as total_spent,
      max(${schema.orders.createdAt}) as last_order_at
    from ${schema.orders}
    where ${schema.orders.guestEmail} is not null
    group by email, full_name, phone, city
    order by total_spent desc nulls last
    limit 200
  `);

  return rows.map((r) => ({
    email: r.email,
    fullName: r.full_name,
    phone: r.phone,
    city: r.city,
    orderCount: r.order_count,
    totalSpentBdt: r.total_spent,
    lastOrderAt: r.last_order_at,
  }));
}

async function getAuthUserCount(): Promise<number> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const { data } = await supabase.auth.admin.listUsers({ perPage: 1 });
    return data.users.length;
  } catch {
    return 0;
  }
}

export default async function AdminCustomersPage() {
  const ctx = await requirePermission("customers");
  const canSeeRevenue = ctx.has("revenue");
  const [customers, authCount] = await Promise.all([
    getCustomers().catch(() => []),
    getAuthUserCount(),
  ]);

  const totalSpend = customers.reduce((s, c) => s + c.totalSpentBdt, 0);
  const repeatBuyers = customers.filter((c) => c.orderCount > 1).length;

  return (
    <>
      <h1 className="admin-h1">Customers</h1>
      <p className="admin-sub">{customers.length} unique buyers · {authCount} signed-in accounts.</p>

      <div className="stat-grid">
        <div className="stat kpi"><div className="kpi-top"><div className="k">Unique buyers</div></div><div className="v">{customers.length}</div></div>
        <div className="stat kpi"><div className="kpi-top"><div className="k">Repeat buyers</div></div><div className="v">{repeatBuyers}</div></div>
        {canSeeRevenue && (
          <div className="stat kpi"><div className="kpi-top"><div className="k">Lifetime spend</div></div><div className="v">{formatBdt(totalSpend)}</div></div>
        )}
        <div className="stat kpi"><div className="kpi-top"><div className="k">Auth accounts</div></div><div className="v">{authCount}</div></div>
      </div>

      {customers.length === 0 ? (
        <div className="empty-state"><h3>No customers yet</h3><p>Once your first orders arrive, customers appear here aggregated by email.</p></div>
      ) : (
        <div className="table">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Email</th>
                <th>Phone</th>
                <th>City</th>
                <th>Orders</th>
                {canSeeRevenue && <th>Spend</th>}
                <th>Last order</th>
                <th>Tier</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => {
                const t = canSeeRevenue ? tierFor(c.totalSpentBdt) : null;
                return (
                  <tr key={c.email} style={{ cursor: "pointer" }}>
                    <td>
                      <Link href={`/admin/customers/${encodeURIComponent(c.email)}`} style={{ display: "flex", alignItems: "center", gap: 10, color: "inherit", textDecoration: "none" }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--purple-100)", color: "var(--purple-900)", display: "grid", placeItems: "center", fontFamily: "var(--serif)", fontSize: 13, fontWeight: 600 }}>
                          {(c.fullName || c.email).split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 500 }}>{c.fullName || c.email.split("@")[0]}</span>
                      </Link>
                    </td>
                    <td style={{ color: "var(--ink-soft)", fontSize: 12 }}>
                      <Link href={`/admin/customers/${encodeURIComponent(c.email)}`} style={{ color: "inherit" }}>{c.email}</Link>
                    </td>
                    <td style={{ fontFamily: "var(--mono)", fontSize: 11 }}>{c.phone || "—"}</td>
                    <td>{c.city || "—"}</td>
                    <td>{c.orderCount}</td>
                    {canSeeRevenue && <td style={{ fontWeight: 500 }}>{formatBdt(c.totalSpentBdt)}</td>}
                    <td style={{ color: "var(--ink-soft)", fontSize: 12 }}>{c.lastOrderAt ? formatDate(c.lastOrderAt) : "—"}</td>
                    <td>
                      {t
                        ? <span className={"pill " + t.pill}>{t.name}</span>
                        : <span className="pill pill-warn">{c.orderCount > 1 ? "Returning" : "New"}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
