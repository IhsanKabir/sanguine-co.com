import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  effectivePermissions,
  isAdminTier,
  type AdminRole,
  type Permission,
} from "./permissions";

export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/en/sign-in");
  return user;
}

type UserWithRole = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export type AdminContext = {
  user: UserWithRole;
  role: AdminRole;
  permissions: Permission[];
  has(perm: Permission): boolean;
};

/**
 * Read role + permissions from app_metadata. Returns `customer` (no access)
 * for anyone without an admin-tier role assigned.
 */
export async function getAdminContext(): Promise<AdminContext | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const meta = (user.app_metadata ?? {}) as { role?: AdminRole; permissions?: Permission[] };
  const role: AdminRole = (meta.role && ["owner", "admin", "subadmin"].includes(meta.role)) ? meta.role : "customer";
  const permissions = effectivePermissions(role, meta.permissions);
  return {
    user,
    role,
    permissions,
    has: (perm) => permissions.includes(perm),
  };
}

/**
 * Allow any admin-tier role into the section. Used by the /admin layout.
 * Sub-admins still pass: their nav and per-page guards filter them down.
 */
export async function requireAdmin(): Promise<AdminContext> {
  const ctx = await getAdminContext();
  if (!ctx) redirect("/en/sign-in?next=/en/admin");
  if (!isAdminTier(ctx.role)) redirect("/en");
  return ctx;
}

/**
 * Block a specific admin sub-page unless the user has that permission.
 * Owner / admin pass through automatically.
 */
export async function requirePermission(perm: Permission): Promise<AdminContext> {
  const ctx = await requireAdmin();
  if (!ctx.has(perm)) redirect("/en/admin");
  return ctx;
}
