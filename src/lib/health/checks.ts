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
import { sql, count, eq, lte, gt } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/site-url";
import { searchProducts } from "@/lib/queries";

export type HealthStatus = "ok" | "warn" | "fail";
export type HealthCategory = "Core" | "Integrations" | "Data" | "Features" | "Config";

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
  /** Touches Postgres — throttled through dbGate (see below). */
  usesDb?: boolean;
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

/**
 * DB checks run at most N at a time. Empirically (isolated 2026-07-13): when
 * every check fires its query in one synchronous burst, the Supabase
 * transaction pooler + postgres.js (prepare:false) wedges ONE victim query —
 * it never settles, regardless of which check it belongs to. Any burst below
 * the threshold is fine, so a small gate removes the failure mode entirely
 * (~2 waves ≈ +1s board latency, well inside the per-check timeout).
 */
function makeGate(max: number) {
  let active = 0;
  const waiters: Array<() => void> = [];
  return async <T>(fn: () => Promise<T>): Promise<T> => {
    if (active >= max) await new Promise<void>((resolve) => waiters.push(resolve));
    active++;
    try {
      return await fn();
    } finally {
      active--;
      waiters.shift()?.();
    }
  };
}
// NOTE: the gate is created PER RUN (see runHealthChecks) — a module-level
// gate would leak slots forever when a wedged query never settles, degrading
// every subsequent board run in the same server process.
type DbGate = ReturnType<typeof makeGate>;

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
    usesDb: true,
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
    usesDb: true,
    run: async () => {
      // Sequential on purpose: the dbGate budgets one query per slot — a
      // Promise.all here would burst past the gate's accounting.
      const [p] = await db.select({ n: count() }).from(schema.products);
      const [s] = await db.select({ n: count() }).from(schema.segments);
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
    usesDb: true,
    run: async () => {
      const rows = await db.select({ key: schema.siteSettings.key }).from(schema.siteSettings);
      const keys = rows.map((r) => r.key);
      if (!keys.includes("brand"))
        return { status: "warn", detail: "No 'brand' settings row — storefront falls back to JSON defaults." };
      return { status: "ok", detail: `Settings rows present: ${keys.join(", ")}.` };
    },
  },
  // ── Feature probes + data-invariant tripwires (Phase 5) ────────────────
  // These answer "which FEATURE is broken" — each encodes a rule the earlier
  // audit found violated in production, so regressions surface here first.
  {
    id: "pricing-invariants",
    label: "Catalogue pricing rules",
    category: "Data",
    critical: false,
    usesDb: true,
    run: async () => {
      const live = await db.select({
        slug: schema.products.slug,
        priceBdt: schema.products.priceBdt,
        preorderOnly: schema.products.preorderOnly,
        priceMinBdt: schema.products.priceMinBdt,
        priceMaxBdt: schema.products.priceMaxBdt,
      }).from(schema.products).where(eq(schema.products.status, "live"));
      const zeroBuyNow = live.filter((p) => !p.preorderOnly && p.priceBdt < 1);
      const badRange = live.filter((p) => p.priceMinBdt != null && p.priceMaxBdt != null && p.priceMinBdt > p.priceMaxBdt);
      if (zeroBuyNow.length > 0)
        return { status: "fail", detail: `Buy-now product(s) with no real price (customers see ৳0): ${zeroBuyNow.map((p) => p.slug).join(", ")}` };
      if (badRange.length > 0)
        return { status: "fail", detail: `Inverted estimate range: ${badRange.map((p) => p.slug).join(", ")}` };
      return { status: "ok", detail: `${live.length} live product(s) pass the quotation-model price rules.` };
    },
  },
  {
    id: "zero-price-orders",
    label: "Zero-price order tripwire",
    category: "Data",
    critical: false,
    usesDb: true,
    run: async () => {
      const [lines] = await db.select({ n: count() }).from(schema.orderLines).where(lte(schema.orderLines.unitPriceBdt, 0));
      const [orders] = await db.select({ n: count() }).from(schema.orders).where(lte(schema.orders.subtotalBdt, 0));
      const badLines = Number(lines?.n ?? 0);
      const badOrders = Number(orders?.n ?? 0);
      if (badLines > 0 || badOrders > 0)
        return { status: "fail", detail: `${badLines} ৳0 order line(s), ${badOrders} ৳0-subtotal order(s) — the checkout price guard has been bypassed. Investigate immediately.` };
      return { status: "ok", detail: "No ৳0 order lines or subtotals — the checkout guard is holding." };
    },
  },
  {
    id: "segments-stocked",
    label: "Visible segments have live products",
    category: "Data",
    critical: false,
    usesDb: true,
    run: async () => {
      const rows = await db.execute<{ id: string; n: number }>(sql`
        select s.id, count(p.id)::int as n
        from segments s
        left join products p on p.segment_id = s.id and p.status = 'live'
        where s.hidden = false
        group by s.id
      `);
      const empty = rows.filter((r) => Number(r.n) === 0).map((r) => r.id);
      if (rows.length === 0) return { status: "warn", detail: "No visible segments — the shop nav is empty." };
      if (empty.length > 0) return { status: "warn", detail: `Visible segment(s) with zero live products: ${empty.join(", ")}` };
      return { status: "ok", detail: `${rows.length} visible segment(s), all stocked with live products.` };
    },
  },
  {
    id: "returns-stuck",
    label: "Return requests awaiting action",
    category: "Data",
    critical: false,
    usesDb: true,
    run: async () => {
      // Zero bind params (cutoff computed in SQL) + one round trip — keeps
      // this probe cheap under the dbGate that serializes the board's burst.
      const [row] = await db.execute<{ open: number; stale: number }>(sql`
        select count(*)::int as open,
               sum(case when updated_at < now() - interval '7 days' then 1 else 0 end)::int as stale
        from orders where status = 'return_requested'
      `);
      const staleN = Number(row?.stale ?? 0);
      const openN = Number(row?.open ?? 0);
      if (staleN > 0) return { status: "warn", detail: `${staleN} return request(s) untouched for over a week (of ${openN} open).` };
      return { status: "ok", detail: `${openN} open return request(s), none older than a week.` };
    },
  },
  {
    id: "reviews-integrity",
    label: "Review counters match approved reviews",
    category: "Data",
    critical: false,
    usesDb: true,
    run: async () => {
      const mismatched = await db.execute<{ slug: string }>(sql`
        select p.slug
        from products p
        left join (
          select product_id, count(*)::int as n from reviews where status = 'approved' group by product_id
        ) r on r.product_id = p.id
        where coalesce(r.n, 0) <> p.review_count
      `);
      if (mismatched.length > 0)
        return { status: "warn", detail: `review_count out of sync on: ${mismatched.map((m) => m.slug).join(", ")}` };
      return { status: "ok", detail: "Every product's review counter matches its approved reviews." };
    },
  },
  {
    id: "quote-drift",
    label: "Preorder quotes vs advertised estimates",
    category: "Data",
    critical: false,
    usesDb: true,
    run: async () => {
      const quoted = await db.select({
        id: schema.preorderRequests.id,
        quoted: schema.preorderRequests.quotedPriceBdt,
        advMax: schema.preorderRequests.advertisedMaxBdt,
        advMin: schema.preorderRequests.advertisedMinBdt,
      }).from(schema.preorderRequests).where(eq(schema.preorderRequests.status, "quoted"));
      const drifted = quoted.filter((q) =>
        q.quoted != null && q.advMax != null && (q.quoted > q.advMax * 1.5 || (q.advMin != null && q.quoted < q.advMin * 0.5)),
      );
      if (drifted.length > 0)
        return { status: "warn", detail: `${drifted.length} quote(s) diverge >50% from the advertised estimate — customers saw a very different number.` };
      return { status: "ok", detail: `${quoted.length} open quote(s), all within 50% of what was advertised.` };
    },
  },
  {
    id: "search-feature",
    label: "Search returns live products",
    category: "Features",
    critical: false,
    usesDb: true,
    run: async () => {
      // Exercises the REAL search path (same function the storefront calls).
      // The probe product must be one search can actually find: live AND in a
      // non-hidden segment — an arbitrary live product in a hidden segment
      // would produce a false FAIL.
      const [probe] = await db.execute<{ name: string }>(sql`
        select p.name from products p
        join segments s on s.id = p.segment_id and s.hidden = false
        where p.status = 'live'
        limit 1
      `);
      if (!probe) return { status: "warn", detail: "No live products in visible segments to probe search with." };
      const q = probe.name.slice(0, 4);
      const hits = await searchProducts(q);
      return hits.length > 0
        ? { status: "ok", detail: `Search for "${q}" returns ${hits.length} result(s).` }
        : { status: "fail", detail: `Search for "${q}" (a live product's own name) returned nothing.` };
    },
  },
  {
    id: "sitemap-feature",
    label: "Sitemap serves product URLs",
    category: "Features",
    critical: false,
    run: async () => {
      const isLocal = SITE_URL.includes("localhost") || SITE_URL.includes("127.0.0.1");
      try {
        const res = await fetch(`${SITE_URL}/sitemap.xml`, { cache: "no-store" });
        if (!res.ok) return { status: "fail", detail: `GET /sitemap.xml returned ${res.status} — Google can't discover the catalogue.` };
        const body = await res.text();
        if (!body.includes("/product/"))
          return { status: "warn", detail: "Sitemap responds but lists no product URLs." };
        return { status: "ok", detail: "Sitemap responds with product URLs." };
      } catch (e) {
        // Network-level failure: environmental noise on a dev box without a
        // running server; a genuine outage signal in production.
        return isLocal
          ? { status: "warn", detail: `Could not reach ${SITE_URL} (no local server running?).` }
          : { status: "fail", detail: `Fetch of ${SITE_URL}/sitemap.xml failed: ${e instanceof Error ? e.message : "network error"}` };
      }
    },
  },
  {
    id: "events-liveness",
    label: "Analytics events pipeline",
    category: "Features",
    critical: false,
    usesDb: true,
    run: async () => {
      const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
      const [recent] = await db.select({ n: count() }).from(schema.events)
        .where(gt(schema.events.createdAt, cutoff));
      const n = Number(recent?.n ?? 0);
      if (n === 0) return { status: "warn", detail: "No events recorded in 48h — tracking may be broken (or genuinely zero traffic)." };
      return { status: "ok", detail: `${n} event(s) in the last 48h — pipeline alive.` };
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

async function runOne(def: CheckDef, dbGate: DbGate): Promise<HealthCheck> {
  const started = Date.now();
  let probe: Probe;
  try {
    const running = def.usesDb ? dbGate(def.run) : def.run();
    probe = await withTimeout(running, def.timeoutMs ?? DEFAULT_TIMEOUT, def.label);
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
  const dbGate = makeGate(4);   // fresh per run — see note on makeGate
  const checks = await Promise.all(CHECKS.map((def) => runOne(def, dbGate)));
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
