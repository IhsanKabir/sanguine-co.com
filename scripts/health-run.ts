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
  // Any FAIL is alert-worthy for a cron canary — the data tripwires
  // (zero-price orders, pricing invariants) are deliberately critical:false
  // so they don't mark the whole site "down", but they must still exit red.
  process.exit(r.overall === "down" || r.counts.fail > 0 ? 1 : 0);
};

main().catch((e) => {
  console.error("RUN FAILED:", e instanceof Error ? e.stack : e);
  process.exit(1);
});
