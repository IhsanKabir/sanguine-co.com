import { setRequestLocale } from "next-intl/server";
import { requirePermission } from "@/lib/auth-utils";
import { runHealthChecks } from "@/lib/health/checks";
import HealthClient from "./HealthClient";

// Always fresh: the checks probe live services, so caching would be misleading.
export const dynamic = "force-dynamic";
// The board visits every page of the site (lib/health/live-checks.ts): room for that.
export const maxDuration = 60;

export default async function HealthPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission("settings");
  const report = await runHealthChecks();
  return <HealthClient initial={report} />;
}
