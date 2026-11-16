import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { SITE_URL } from "@/lib/site-url";
import { crawlSite } from "./site-crawl";
import type { CheckDef } from "./checks";

/**
 * The checks owners asked to run from Admin at any time (16 Nov 2026): every page a customer
 * can reach, and the money and referral records (read only). Same as scripts/check-live.ts.
 */
const NEEDED_COLUMNS: Record<string, string[]> = {
  referral_codes: ["code", "email"],
  referral_credits: ["referrer_email", "referred_email", "status", "order_id", "used_order_id"],
  preorder_requests: ["referral_code", "referral_discount_bdt", "referral_credit_id", "express_fee_bdt"],
};

export const LIVE_CHECKS: CheckDef[] = [
  {
    id: "all-pages",
    label: "Every page loads",
    category: "Features",
    critical: false,
    timeoutMs: 45_000,
    run: async () => {
      if (SITE_URL.includes("localhost") || SITE_URL.includes("127.0.0.1")) {
        return { status: "warn", detail: "Runs against the live site only." };
      }
      const { checked, problems } = await crawlSite(SITE_URL);
      if (problems.length) return { status: "fail", detail: `${problems.length} of ${checked} page(s) broken: ${problems.slice(0, 5).join("; ")}` };
      return { status: "ok", detail: `${checked} pages load: every page in the sitemap, the order forms, search, sign-in, the cat film.` };
    },
  },
  {
    id: "migrations-applied",
    label: "Database matches the code",
    category: "Data",
    critical: true,
    usesDb: true,
    run: async () => {
      const cols = await db.execute<{ table_name: string; column_name: string }>(sql`
        select table_name, column_name from information_schema.columns
        where table_schema = 'public' and table_name in ('referral_codes', 'referral_credits', 'preorder_requests')`);
      const missing = Object.entries(NEEDED_COLUMNS).flatMap(([t, cs]) =>
        cs.filter((c) => !cols.some((r) => r.table_name === t && r.column_name === c)).map((c) => `${t}.${c}`));
      if (missing.length) return { status: "fail", detail: `Missing ${missing.join(", ")}: a migration was not run.` };
      return { status: "ok", detail: "Every column the referral and same-day code reads is there." };
    },
  },
  {
    id: "order-money",
    label: "Every order's money adds up",
    category: "Data",
    critical: false,
    usesDb: true,
    run: async () => {
      const off = await db.execute<{ number: string }>(sql`
        select number from orders
        where total_bdt <> greatest(0, subtotal_bdt + shipping_bdt + cod_fee_bdt - coupon_discount_bdt - deposit_paid_bdt)
        order by created_at desc limit 10`);
      if (off.length) return { status: "fail", detail: `Total does not match its parts on: ${off.map((o) => o.number).join(", ")}` };
      return { status: "ok", detail: "Subtotal + delivery + COD fee - discount - deposit = total, on every order." };
    },
  },
  {
    id: "preorder-flow",
    label: "Pre-orders and referral credits are consistent",
    category: "Data",
    critical: false,
    usesDb: true,
    run: async () => {
      const [row] = await db.execute<{ lost: number; stuck: number }>(sql`
        select
          (select count(*)::int from preorder_requests where status = 'converted' and converted_order_id is null) as lost,
          (select count(*)::int from referral_credits c join orders o on o.id = c.order_id
             where c.status = 'pending' and o.status = 'delivered') as stuck`);
      const issues = [
        row.lost ? `${row.lost} converted pre-order(s) without an order` : null,
        row.stuck ? `${row.stuck} referral credit(s) still pending after delivery` : null,
      ].filter(Boolean);
      if (issues.length) return { status: "warn", detail: issues.join("; ") + "." };
      return { status: "ok", detail: "No pre-order stuck halfway, no referral credit stuck after delivery." };
    },
  },
];
