"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/en");
}

export async function resendVerificationEmail(): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, error: "Not signed in." };
  if (user.email_confirmed_at) return { ok: false, error: "Email is already verified." };
  const { error } = await supabase.auth.resend({ type: "signup", email: user.email });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
