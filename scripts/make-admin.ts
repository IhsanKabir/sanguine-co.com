/**
 * Promote a Supabase Auth user to admin role.
 * Usage:  npx tsx scripts/make-admin.ts your-email@gmail.com
 *
 * Prerequisite: the user must already exist in Supabase Auth: i.e. they
 * signed in once via magic link. This script writes role="admin" into
 * raw_app_meta_data so the requireAdmin() guard in src/lib/auth-utils.ts
 * lets them through.
 */
import * as dotenv from "dotenv";
dotenv.config({ override: true });
import postgres from "postgres";

function toSessionPooler(url: string): string {
  const u = new URL(url);
  if (u.port === "6543") u.port = "5432";
  u.search = "";
  return u.toString();
}

const email = process.argv[2];
if (!email || !email.includes("@")) {
  console.error("Usage: npx tsx scripts/make-admin.ts your-email@gmail.com");
  process.exit(1);
}

const sql = postgres(toSessionPooler(process.env.DATABASE_URL!), { max: 1, prepare: false });

(async () => {
  const rows = await sql`
    update auth.users
    set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
    where email = ${email}
    returning id, email, raw_app_meta_data
  `;
  if (rows.length === 0) {
    console.error(`✗ No user found with email ${email}.`);
    console.error("  Sign in to the storefront once (visit /en/sign-in, request magic link, click it),");
    console.error("  then re-run this script.");
    process.exit(1);
  }
  console.log("✓ Promoted to admin:", rows[0].email);
  console.log("  Sign out and sign back in for the role to take effect.");
  await sql.end();
})().catch(async (e) => {
  console.error("✗ failed:", e.message);
  await sql.end().catch(() => {});
  process.exit(1);
});
