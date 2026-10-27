/**
 * Role-based access control. Stored in Supabase auth.users.app_metadata.
 *
 * Roles:
 *   owner   : created via create-admin.ts. Single source of truth. Manages users.
 *   admin   : full access except /admin/users.
 *   subadmin: granular per-section access via `permissions` array.
 *   customer: default for any signed-in user that is not admin.
 */

export const PERMISSIONS = [
  "dashboard",
  "orders",
  "products",
  "segments",
  "inventory",
  "customers",
  "analytics",
  "behavior",  // sees behavior insights (top searches, page views, real funnel)
  "reports",   // sees Sales Report + COD Reconciliation + CSV export
  "coupons",   // creates / edits / revokes discount codes
  "preorders", // reviews / quotes / converts bespoke pre-order requests
  "reviews",   // moderates customer product reviews
  "editorial",
  "settings",
  "users",
  "revenue",   // sees aggregate financials (revenue, AOV, customer LTV, retail value)
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export type AdminRole = "owner" | "admin" | "subadmin" | "customer";

/**
 * Templates for quick subadmin assignment. Owner picks a template OR
 * customises permission set per user via the admin UI.
 */
export const SUBADMIN_TEMPLATES: Record<string, { name: string; description: string; permissions: Permission[] }> = {
  fulfilment: {
    name: "Fulfilment",
    description: "Books couriers, manages stock, reconciles COD. No analytics or revenue totals.",
    permissions: ["dashboard", "orders", "inventory", "reports", "preorders"],
  },
  catalogue: {
    name: "Catalogue",
    description: "Adds and edits products + segments. No orders, no revenue, no customers.",
    permissions: ["dashboard", "products", "segments"],
  },
  editorial: {
    name: "Editorial",
    description: "Brand voice, announcement bar, product descriptions. No revenue.",
    permissions: ["dashboard", "editorial", "products"],
  },
  analyst: {
    name: "Analyst",
    description: "Full read-only dashboards including revenue, behavior insights, lifetime customer spend.",
    permissions: ["dashboard", "analytics", "behavior", "reports", "customers", "revenue"],
  },
  manager: {
    name: "Manager",
    description: "Everything except creating other admins. Includes revenue, reports, coupons.",
    permissions: ["dashboard", "orders", "products", "segments", "inventory", "customers", "analytics", "behavior", "reports", "coupons", "preorders", "reviews", "editorial", "revenue"],
  },
};

/**
 * Effective permissions for a role.
 * - owner / admin: all permissions
 * - subadmin: whatever is stored in app_metadata.permissions
 * - customer: none
 */
export function effectivePermissions(role: AdminRole, customPermissions: Permission[] | undefined): Permission[] {
  if (role === "owner") return [...PERMISSIONS];
  if (role === "admin") return PERMISSIONS.filter((p) => p !== "users");
  if (role === "subadmin") return customPermissions ?? [];
  return [];
}

/** True if any admin-tier role (used for "is in /admin at all"). */
export function isAdminTier(role: AdminRole): boolean {
  return role === "owner" || role === "admin" || role === "subadmin";
}
