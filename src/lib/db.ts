import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Force-load .env over any system env var (Windows boxes often have a
// stale DATABASE_URL pointing at a local Postgres install).
// Skipped in production (Vercel sets env via dashboard, no .env file).
if (process.env.NODE_ENV !== "production") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  try { require("dotenv").config({ override: true }); } catch { /* dotenv not installed in prod */ }
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

/**
 * On Vercel/serverless we need the Supabase Transaction pooler (port 6543).
 * It multiplexes connections via PgBouncer in transaction mode: the only
 * way to handle many concurrent serverless function invocations without
 * blowing past Supabase's session-mode pool limit (15 clients).
 *
 * Locally we keep whatever the env says (usually port 5432 session pooler
 * for a smoother dev experience).
 *
 * Transaction pooler caveat: prepared statements are not supported, so we
 * disable them when port is 6543. db.transaction() still works because
 * BEGIN/COMMIT happen within a single pooled connection's transaction.
 */
const RAW_URL = process.env.DATABASE_URL;
const IS_TXN_POOLER = (() => {
  try { return new URL(RAW_URL).port === "6543"; } catch { return false; }
})();

// Cache the postgres client across Next.js dev hot-reloads. Without this,
// every code change spawns a new client and the old one keeps its TCP
// connection open, eventually exhausting Supabase's connection limit.
type GlobalWithPg = typeof globalThis & { __ssg_pg?: ReturnType<typeof postgres> };
const globalWithPg = globalThis as GlobalWithPg;

const client =
  globalWithPg.__ssg_pg ??
  postgres(RAW_URL, {
    // Transaction pooler multiplexes server-side, so 5 client connections
    // per function instance is plenty for Promise.all of 3-5 queries
    // without serializing them. Session pooler keeps 10 dedicated.
    max: IS_TXN_POOLER ? 5 : 10,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: !IS_TXN_POOLER,
  });

if (process.env.NODE_ENV !== "production") {
  globalWithPg.__ssg_pg = client;
}

export const db = drizzle(client, { schema });
export { schema };
