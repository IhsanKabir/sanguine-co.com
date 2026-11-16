/**
 * One health check for the live shop, cheap to run after any merge:
 *   npx tsx scripts/check-live.ts
 * 1. Pages: every page in the sitemap, plus the flows that are not in it (pre-order forms,
 *    search, sign-in, account and admin redirects, a shared ?ref= link, the cat film,
 *    cut-outs, OG images). Each must answer without a server error.
 * 2. Database (read only): the referral tables match the code, and every order's money adds up
 *    (subtotal + delivery + COD fee - discount - deposit = total).
 * Prints one line per problem and a summary; exits 1 when anything failed.
 */
import { config } from "dotenv";
import postgres from "postgres";
import { crawlSite } from "../src/lib/health/site-crawl";

// The shop's own .env wins over a DATABASE_URL left in the terminal by another project.
config({ path: ".env", override: true });

const SITE = process.env.CHECK_SITE ?? "https://sanguine-co.com";
// What Next.js prints when a page breaks (not words like "Something went wrong", which every page carries in its translations).
const problems: string[] = [];
let passed = 0;

async function pages() {
  const { checked, problems: found } = await crawlSite(SITE);
  passed += checked - found.length;
  problems.push(...found);
  console.log(`pages: ${checked} checked`);
}

async function database() {
  const url = process.env.DATABASE_URL;
  if (!url) { problems.push("DATABASE_URL missing in .env: database checks skipped"); return; }
  const sql = postgres(url, { max: 1, prepare: false });
  try {
    await sql.begin("read only", async (tx) => {
      const need: Record<string, string[]> = {
        referral_codes: ["code", "email"],
        referral_credits: ["referrer_email", "referred_email", "status", "order_id", "used_order_id"],
        preorder_requests: ["referral_code", "referral_discount_bdt", "referral_credit_id", "express_fee_bdt"],
      };
      const cols = await tx<{ table_name: string; column_name: string }[]>`
        select table_name, column_name from information_schema.columns
        where table_schema = 'public' and table_name in ('referral_codes', 'referral_credits', 'preorder_requests')`;
      for (const [table, wanted] of Object.entries(need)) {
        for (const c of wanted) {
          if (cols.some((r) => r.table_name === table && r.column_name === c)) passed++;
          else problems.push(`database: ${table}.${c} is missing (a migration was not run)`);
        }
      }
      const off = await tx<{ number: string; total_bdt: number; should: number }[]>`
        select number, total_bdt, (subtotal_bdt + shipping_bdt + cod_fee_bdt - coupon_discount_bdt - deposit_paid_bdt) as should
        from orders where total_bdt <> greatest(0, subtotal_bdt + shipping_bdt + cod_fee_bdt - coupon_discount_bdt - deposit_paid_bdt)
        order by created_at desc limit 20`;
      for (const o of off) problems.push(`order ${o.number}: total ${o.total_bdt}, parts add up to ${o.should}`);
      if (off.length === 0) passed++;
      const lost = await tx<{ id: string }[]>`
        select id from preorder_requests where status = 'converted' and converted_order_id is null limit 20`;
      for (const r of lost) problems.push(`pre-order ${r.id} is "converted" but has no order`);
      if (lost.length === 0) passed++;
      const stuck = await tx<{ id: string }[]>`
        select c.id from referral_credits c join orders o on o.id = c.order_id
        where c.status = 'pending' and o.status = 'delivered' limit 20`;
      for (const r of stuck) problems.push(`referral credit ${r.id}: the friend's order is delivered but the credit is still pending`);
      if (stuck.length === 0) passed++;
    });
    console.log("database: checked (read only)");
  } catch (err) {
    problems.push(`database: ${(err as Error).message}`);
  } finally {
    await sql.end();
  }
}

async function main() {
  await pages();
  await database();
  console.log(`\n${passed} passed, ${problems.length} problem${problems.length === 1 ? "" : "s"}`);
  for (const p of problems) console.log(`  PROBLEM  ${p}`);
  process.exit(problems.length ? 1 : 0);
}
main();
