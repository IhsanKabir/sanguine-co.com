import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeRedirect } from "@/lib/safe-redirect";

/**
 * Locale-prefixed magic-link callback. Mirrors /auth/callback so emails
 * sent before middleware exclusion was added still work. Open-redirect
 * guard lives in `safeRedirect`.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const next = safeRedirect(searchParams.get("next"), `/${locale}/account`);

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[auth callback]", error.message);
      return NextResponse.redirect(`${origin}/${locale}/sign-in?error=auth_failed`);
    }
  }
  return NextResponse.redirect(`${origin}${next}`);
}
