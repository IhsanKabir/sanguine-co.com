/**
 * Admin system-health checks.
 *
 * Each check is a small, READ-ONLY probe of one subsystem. They run in
 * parallel, each guarded by a timeout and try/catch so one slow/broken
 * integration can never hang or crash the board. Active probes only ever
 * hit safe endpoints (a `select 1`, an account lookup, an auth-token issue) —
 * nothing here sends an email/SMS or creates a courier order.
 *
 * Server-only: imports `db` and the Supabase service client. The client
 * component imports the RESULT types (via `import type`) and re-runs through
 * the `getHealthReport` server action — never this module directly.
 */
import { sql, count } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/site-url";

export type HealthStatus = "ok" | "warn" | "fail";
export type HealthCategory = "Core" | "Integrations" | "Data" | "Config";

export type HealthCheck = {
  id: string;
  label: string;
  category: HealthCategory;
  critical: boolean;
  status: HealthStatus;
  detail: string;
  latencyMs: number;
};

export type HealthReport = {
  overall: "ok" | "degraded" | "down";
  ranAt: string;
  durationMs: number;
  counts: { ok: number; warn: number; fail: number };
  checks: HealthCheck[];
};

type Probe = { status: HealthStatus; detail: string };

type CheckDef = {
  id: string;
  label: string;
  category: HealthCategory;
  critical: boolean;
  timeoutMs?: number;
  run: () => Promise<Probe>;
};

const DEFAULT_TIMEOUT = 6000;

/** Race a promise against a timer; clears the timer once settled. */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
}

/** Returns the subset of env var names that are missing/empty. */
function missingEnv(...names: string[]): string[] {
  return names.filter((n) => !process.env[n]);
}

const CHECKS: CheckDef[] = [
  {
    id: "database",
    label: "Database (Postgres)",
    category: "Core",
    critical: true,
    run: async () => {
      await db.execute(sql`select 1`);
      return { status: "ok", detail: "Postgres reachable through the connection pooler." };
    },
  },
  {
    id: "supabase-auth",
    label: "Authentication (Supabase)",
    category: "Core",
    critical: true,
    run: async () => {
      const missing = missingEnv("NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY");
      if (missing.length) return { status: "fail", detail: `Missing env: ${missing.join(", ")}` };
      const base = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/+$/, "");
      const res = await fetch(`${base}/auth/v1/health`, {
        headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
        cache: "no-store",
      });
      if (!res.ok) return { status: "fail", detail: `GoTrue /auth/v1/health returned ${res.status}.` };
      return { status: "ok", detail: "GoTrue auth service is healthy — sign-in should work." };
    },
  },
  {
    id: "supabase-storage",
    label: "Storage (Supabase buckets)",
    category: "Integrations",
    critical: false,
    run: async () => {
      if (missingEnv("SUPABASE_SERVICE_ROLE_KEY").length)
        return { status: "warn", detail: "SUPABASE_SERVICE_ROLE_KEY not set — image/audio uploads disabled." };
      const supabase = createSupabaseServiceClient();
      const { data, error } = await supabase.storage.listBuckets();
      if (error) return { status: "fail", detail: error.message };
      return { status: "ok", detail: `${data?.length ?? 0} storage bucket(s) reachable.` };
    },
  },
  {
    id: "email-brevo",
    label: "Email (Brevo)",
    category: "Integrations",
    critical: false,
    run: async () => {
      const key = process.env.BREVO_API_KEY;
      if (!key) return { status: "warn", detail: "BREVO_API_KEY not set — transactional emails will not send." };
      const res = await fetch("https://api.brevo.com/v3/account", {
        headers: { "api-key": key, accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) return { status: "fail", detail: `Brevo /account returned ${res.status} — key invalid or revoked.` };
      const from = process.env.BREVO_FROM_EMAIL;
      return from
        ? { status: "ok", detail: `API key valid · sends as ${from}.` }
        : { status: "warn", detail: "API key valid, but BREVO_FROM_EMAIL is not set." };
    },
  },
  {
    id: "sms-sslwireless",
    label: "SMS (SSL Wireless)",
    category: "Integrations",
    critical: false,
    run: async () => {
      const missing = missingEnv("SSLWIRELESS_API_TOKEN", "SSLWIRELESS_SID");
      if (missing.length) return { status: "warn", detail: `Not configured (${missing.join(", ")}).` };
      return { status: "ok", detail: "Credentials present (config check only — no test SMS sent)." };
    },
  },
  {
    id: "shipping-pathao",
    label: "Courier — Pathao",
    category: "Integrations",
    critical: false,
    run: async () => {
      const base = process.env.PATHAO_BASE_URL;
      const missing = missingEnv(
        "PATHAO_BASE_URL", "PATHAO_CLIENT_ID", "PATHAO_CLIENT_SECRET", "PATHAO_USERNAME", "PATHAO_PASSWORD",
      );
      if (missing.length) return { status: "warn", detail: `Not configured (${missing.join(", ")}).` };
      const res = await fetch(`${base}/aladdin/api/v1/issue-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          client_id: process.env.PATHAO_CLIENT_ID,
          client_secret: process.env.PATHAO_CLIENT_SECRET,
          username: process.env.PATHAO_USERNAME,
          password: process.env.PATHAO_PASSWORD,
          grant_type: "password",
        }),
      });
      if (!res.ok) return { status: "fail", detail: `Token endpoint returned ${res.status} — credentials rejected.` };
      const data = (await res.json().catch(() => ({}))) as { access_token?: string };
      return data.access_token
        ? { status: "ok", detail: "OAuth token issued — credentials valid, courier reachable." }
        : { status: "fail", detail: "Token endpoint returned no access_token." };
    },
  },
  {
    id: "shipping-steadfast",
    label: "Courier — Steadfast",
    category: "Integrations",
    critical: false,
    run: async () => {
      const missing = missingEnv("STEADFAST_BASE_URL", "STEADFAST_API_KEY", "STEADFAST_SECRET_KEY");
      if (missing.length) return { status: "warn", detail: `Not configured (${missing.join(", ")}).` };
      return { status: "ok", detail: "Credentials present (config check only — no test order created)." };
    },
  },
  {
    id: "catalog",
    label: "Catalogue data",
    category: "Data",
    critical: false,
    run: async () => {
      const [[p], [s]] = await Promise.all([
        db.select({ n: count() }).from(schema.products),
        db.select({ n: count() }).from(schema.segments),
      ]);
      const products = Number(p?.n ?? 0);
      const segments = Number(s?.n ?? 0);
      if (products === 0) return { status: "warn", detail: `No products published (${segments} segment(s)).` };
      return { status: "ok", detail: `${products} product(s) across ${segments} segment(s).` };
    },
  },
  {
    id: "site-config",
    label: "Site settings (brand / copy)",
    category: "Data",
    critical: false,
    run: async () => {
      const rows = await db.select({ key: schema.siteSettings.key }).from(schema.siteSettings);
      const keys = rows.map((r) => r.key);
      if (!keys.includes("brand"))
        return { status: "warn", detail: "No 'brand' settings row — storefront falls back to JSON defaults." };
      return { status: "ok", detail: `Settings rows present: ${keys.join(", ")}.` };
    },
  },
  {
    id: "site-url",
    label: "Canonical site URL",
    category: "Config",
    critical: false,
    run: async () => {
      try {
        const u = new URL(SITE_URL);
        if (u.protocol !== "https:") return { status: "warn", detail: `SITE_URL is not https: ${SITE_URL}` };
        if (u.hostname.endsWith("vercel.app"))
          return { status: "warn", detail: `Still resolving to the Vercel host (${u.hostname}) — connect the custom domain.` };
        return { status: "ok", detail: SITE_URL };
      } catch {
        return { status: "fail", detail: `Invalid SITE_URL: ${SITE_URL}` };
      }
    },
  },
];

async function runOne(def: CheckDef): Promise<HealthCheck> {
  const started = Date.now();
  let probe: Probe;
  try {
    probe = await withTimeout(def.run(), def.timeoutMs ?? DEFAULT_TIMEOUT, def.label);
  } catch (e) {
    probe = { status: "fail", detail: e instanceof Error ? e.message : String(e) };
  }
  return {
    id: def.id,
    label: def.label,
    category: def.category,
    critical: def.critical,
    status: probe.status,
    detail: probe.detail,
    latencyMs: Date.now() - started,
  };
}

/** Run every check in parallel and roll them up into an overall verdict. */
export async function runHealthChecks(): Promise<HealthReport> {
  const started = Date.now();
  const checks = await Promise.all(CHECKS.map(runOne));
  const counts = {
    ok: checks.filter((c) => c.status === "ok").length,
    warn: checks.filter((c) => c.status === "warn").length,
    fail: checks.filter((c) => c.status === "fail").length,
  };
  const criticalDown = checks.some((c) => c.critical && c.status === "fail");
  const overall: HealthReport["overall"] = criticalDown
    ? "down"
    : counts.fail > 0 || counts.warn > 0
      ? "degraded"
      : "ok";
  return {
    overall,
    ranAt: new Date().toISOString(),
    durationMs: Date.now() - started,
    counts,
    checks,
  };
}
