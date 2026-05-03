import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeRedirect } from "@/lib/safe-redirect";

/**
 * Magic-link callback. Supabase appends `?code=...` to the redirect URL.
 * We exchange it for a session, then bounce to /account (default locale path).
 *
 * Open-redirect guard lives in `safeRedirect` (single source of truth across
 * the three callsites that handle `?next=`).
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const next = safeRedirect(searchParams.get("next"), "/en/account");

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[auth callback]", error.message);
      return NextResponse.redirect(`${origin}/en/sign-in?error=auth_failed`);
    }
  }
  return NextResponse.redirect(`${origin}${next}`);
}
