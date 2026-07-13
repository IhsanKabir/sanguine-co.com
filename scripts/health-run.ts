/**
 * Run the /admin/health probes from the CLI against the live database:
 *   npx tsx scripts/health-run.ts
 * Exits non-zero when a critical check fails (usable as a cron/CI canary).
 */
import * as dotenv from "dotenv";
dotenv.config({ override: true });

const main = async () => {
  const m = await import("../src/lib/health/checks");
  const r = await m.runHealthChecks();
  for (const c of r.checks) {
    console.log(`[${c.status.padEnd(4)}] ${String(c.latencyMs).padStart(5)}ms ${c.id.padEnd(22)} ${c.detail.slice(0, 110)}`);
  }
  console.log("OVERALL:", r.overall, `(${r.durationMs}ms)`);
  process.exit(r.overall === "down" ? 1 : 0);
};

main().catch((e) => {
  console.error("RUN FAILED:", e instanceof Error ? e.stack : e);
  process.exit(1);
});
