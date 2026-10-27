/**
 * Create or upgrade a user to OWNER in Supabase Auth.
 * Uses the service-role key to bypass email confirmation.
 *
 * Usage:  npx tsx scripts/create-admin.ts your-email@gmail.com YourPassword123
 *
 * - If the user exists: updates password, marks email confirmed, sets role=owner
 * - If the user doesn't exist: creates a new owner user with password
 *
 * "Owner" has every permission, including managing other admin users.
 * For scoped subadmins (orders only / catalogue only / etc.) use:
 *   npx tsx scripts/create-subadmin.ts <email> <password> --template <name>
 *
 * After running this, sign in at /en/sign-in with the email + password.
 */
import * as dotenv from "dotenv";
dotenv.config({ override: true });
import { createClient } from "@supabase/supabase-js";

const email = process.argv[2];
const password = process.argv[3];

if (!email || !email.includes("@") || !password || password.length < 6) {
  console.error("Usage: npx tsx scripts/create-admin.ts your-email@gmail.com YourPassword123");
  console.error("       (password must be at least 6 characters)");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

(async () => {
  // Check if user already exists
  const { data: list, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.error("Failed to list users:", listErr.message);
    process.exit(1);
  }
  const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  if (existing) {
    console.log("→ User already exists, updating…");
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      app_metadata: { ...existing.app_metadata, role: "owner" },
    });
    if (error) {
      console.error("Update failed:", error.message);
      process.exit(1);
    }
    console.log(`✓ Updated ${email}: password reset, email confirmed, role=owner.`);
  } else {
    console.log("→ Creating new admin user…");
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: "owner" },
    });
    if (error) {
      console.error("Create failed:", error.message);
      process.exit(1);
    }
    console.log(`✓ Created ${data.user?.email} (id ${data.user?.id}) with role=owner.`);
  }
  console.log("");
  console.log("Sign in at: http://localhost:3000/en/sign-in");
  console.log(`Email:    ${email}`);
  console.log("Password: (the one you just set)");
})().catch((e) => {
  console.error("✗ failed:", e);
  process.exit(1);
});
