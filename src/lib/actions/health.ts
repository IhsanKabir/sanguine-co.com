"use server";

import { requirePermission } from "@/lib/auth-utils";
import { runHealthChecks, type HealthReport } from "@/lib/health/checks";

/**
 * Re-run the admin health board. Gated behind the `settings` permission
 * (owner / admin / manager). Called by the "Re-run checks" button.
 */
export async function getHealthReport(): Promise<HealthReport> {
  await requirePermission("settings");
  return runHealthChecks();
}
