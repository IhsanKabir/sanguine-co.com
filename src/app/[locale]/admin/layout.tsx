import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { requireAdmin } from "@/lib/auth-utils";
import { signOut } from "@/lib/actions/auth";
import Icon from "@/components/storefront/Icon";
import type { Permission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

type AdminPath =
  | "/admin"
  | "/admin/orders"
  | "/admin/preorders"
  | "/admin/products"
  | "/admin/segments"
  | "/admin/inventory"
  | "/admin/customers"
  | "/admin/reviews"
  | "/admin/analytics"
  | "/admin/behavior"
  | "/admin/reports"
  | "/admin/coupons"
  | "/admin/editorial"
  | "/admin/audio"
  | "/admin/settings"
  | "/admin/health"
  | "/admin/users";

const NAV: Array<{
  href: AdminPath;
  name: string;
  icon: string;
  group: "Overview" | "Commerce" | "House" | "Team";
  perm: Permission;
}> = [
  { href: "/admin",           name: "Dashboard", icon: "feather", group: "Overview", perm: "dashboard" },
  { href: "/admin/analytics", name: "Analytics", icon: "feather", group: "Overview", perm: "analytics" },
  { href: "/admin/behavior",  name: "Behavior",  icon: "feather", group: "Overview", perm: "behavior"  },
  { href: "/admin/reports",   name: "Reports",   icon: "feather", group: "Overview", perm: "reports"   },
  { href: "/admin/orders",    name: "Orders",    icon: "bag",     group: "Commerce", perm: "orders" },
  { href: "/admin/preorders", name: "Pre-orders", icon: "feather", group: "Commerce", perm: "preorders" },
  { href: "/admin/products",  name: "Products",  icon: "feather", group: "Commerce", perm: "products" },
  { href: "/admin/segments",  name: "Segments",  icon: "feather", group: "Commerce", perm: "segments" },
  { href: "/admin/inventory", name: "Inventory", icon: "feather", group: "Commerce", perm: "inventory" },
  { href: "/admin/customers", name: "Customers", icon: "user",    group: "Commerce", perm: "customers" },
  { href: "/admin/reviews",   name: "Reviews",   icon: "feather", group: "Commerce", perm: "reviews" },
  { href: "/admin/coupons",   name: "Coupons",   icon: "feather", group: "Commerce", perm: "coupons" },
  { href: "/admin/editorial", name: "Editorial", icon: "feather", group: "House",    perm: "editorial" },
  { href: "/admin/audio",     name: "Audio",     icon: "feather", group: "House",    perm: "settings" },
  { href: "/admin/settings",  name: "Settings",  icon: "feather", group: "House",    perm: "settings" },
  { href: "/admin/health",    name: "Health",    icon: "feather", group: "House",    perm: "settings" },
  { href: "/admin/users",     name: "Users",     icon: "user",    group: "Team",     perm: "users" },
];

export default async function AdminLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireAdmin();

  const visibleNav = NAV.filter((n) => ctx.has(n.perm));
  const groups = ["Overview", "Commerce", "House", "Team"] as const;

  return (
    <div className="admin-body">
      <aside className="admin-side">
        <div className="admin-logo">Sanguine<small>ADMIN · v3.0</small></div>
        {groups.map((g) => {
          const items = visibleNav.filter((n) => n.group === g);
          if (items.length === 0) return null;
          return (
            <div key={g}>
              <div className="admin-nav-group">{g}</div>
              {items.map((n) => (
                <Link key={n.href} href={n.href} className="admin-link">
                  <Icon name={n.icon} size={16} /> <span>{n.name}</span>
                </Link>
              ))}
            </div>
          );
        })}
        <div style={{ marginTop: "auto", padding: "12px", borderTop: "1px solid var(--purple-900)", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 11, color: "var(--purple-200)", letterSpacing: ".1em", textTransform: "uppercase" }}>{ctx.user.email}</div>
          <div style={{ fontSize: 10, color: "var(--gold)", fontFamily: "var(--mono)", letterSpacing: ".15em", textTransform: "uppercase" }}>{ctx.role}</div>
          <form action={signOut}>
            <button type="submit" className="btn btn-ghost btn-sm" style={{ width: "100%", borderColor: "var(--purple-700)", color: "var(--purple-200)" }}>
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <div className="admin-main">
        <div className="admin-topbar">
          <div className="crumb">Admin</div>
          <Link href="/" className="icon-btn" aria-label="Exit admin"><Icon name="x" size={16} /></Link>
        </div>
        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}
