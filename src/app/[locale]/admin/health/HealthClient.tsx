"use client";

import { useState, useTransition } from "react";
import { getHealthReport } from "@/lib/actions/health";
import type { HealthReport, HealthStatus, HealthCategory } from "@/lib/health/checks";

const PILL: Record<HealthStatus, string> = { ok: "pill-ok", warn: "pill-warn", fail: "pill-err" };
const WORD: Record<HealthStatus, string> = { ok: "OK", warn: "WARN", fail: "FAIL" };

const OVERALL: Record<HealthReport["overall"], { pill: string; word: string; blurb: string }> = {
  ok: { pill: "pill-ok", word: "All systems operational", blurb: "Every check passed." },
  degraded: {
    pill: "pill-warn",
    word: "Degraded",
    blurb: "Some features need attention — see the warnings and failures below.",
  },
  down: {
    pill: "pill-err",
    word: "Down",
    blurb: "A critical system is failing — the storefront may be unavailable to customers.",
  },
};

const CATEGORIES: HealthCategory[] = ["Core", "Integrations", "Data", "Config"];

export default function HealthClient({ initial }: { initial: HealthReport }) {
  const [report, setReport] = useState<HealthReport>(initial);
  const [pending, startTransition] = useTransition();

  function rerun() {
    startTransition(async () => {
      try {
        setReport(await getHealthReport());
      } catch {
        // requirePermission may redirect; nothing to surface here.
      }
    });
  }

  const o = OVERALL[report.overall];

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 className="admin-h1">System health</h1>
          <p className="admin-sub">
            Live status of the storefront&rsquo;s core services and integrations. Run this whenever a
            feature seems broken to see exactly what&rsquo;s failing.
          </p>
        </div>
        <button className="btn btn-primary" onClick={rerun} disabled={pending}>
          {pending ? "Checking…" : "Re-run checks"}
        </button>
      </div>

      <div
        className="panel"
        style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18, flexWrap: "wrap" }}
      >
        <span className={`pill ${o.pill}`} style={{ fontSize: 12, padding: "6px 12px" }}>
          {o.word}
        </span>
        <div style={{ fontSize: 13, color: "var(--ink-soft)", flex: 1, minWidth: 200 }}>{o.blurb}</div>
        <div
          style={{
            fontSize: 11,
            color: "var(--ink-soft)",
            fontFamily: "var(--mono)",
            textAlign: "right",
            lineHeight: 1.7,
          }}
        >
          <div>
            {report.counts.ok} ok · {report.counts.warn} warn · {report.counts.fail} fail
          </div>
          <div>
            ran {new Date(report.ranAt).toLocaleTimeString()} · {report.durationMs}ms
          </div>
        </div>
      </div>

      {CATEGORIES.map((cat) => {
        const items = report.checks.filter((c) => c.category === cat);
        if (items.length === 0) return null;
        return (
          <div className="panel" key={cat} style={{ marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 6px" }}>{cat}</h3>
            {items.map((c, i) => (
              <div
                key={c.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 0",
                  borderBottom: i === items.length - 1 ? "none" : "1px solid var(--line)",
                }}
              >
                <span className={`pill ${PILL[c.status]}`} style={{ minWidth: 54, textAlign: "center" }}>
                  {WORD[c.status]}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500 }}>
                    {c.label}
                    {c.critical && (
                      <span
                        style={{
                          fontSize: 10,
                          color: "var(--gold)",
                          marginLeft: 8,
                          fontFamily: "var(--mono)",
                          letterSpacing: ".1em",
                        }}
                      >
                        CRITICAL
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink-soft)", wordBreak: "break-word" }}>
                    {c.detail}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--ink-soft)",
                    fontFamily: "var(--mono)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.latencyMs}ms
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </>
  );
}
