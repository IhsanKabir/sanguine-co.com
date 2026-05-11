"use client";

import { Suspense, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { safeRedirect } from "@/lib/safe-redirect";

type Mode = "password" | "magic";

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInInner />
    </Suspense>
  );
}

function SignInInner() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeRedirect(searchParams.get("next"), "/en/account");

  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    setInfo(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setPending(false);
    if (error) { setError(error.message); return; }
    router.push(next.startsWith("/en/") || next.startsWith("/bn/") ? next.replace(/^\/(en|bn)/, "") as "/account" : "/account");
    router.refresh();
  };

  const onMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError("Enter your email first."); return; }
    setPending(true);
    setError(null);
    setInfo(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        shouldCreateUser: true,
      },
    });
    setPending(false);
    if (error) { setError(error.message); return; }
    setInfo("Check your inbox — we sent you a sign-in link.");
  };

  const onOAuth = async (provider: "google") => {
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) setError(error.message);
    // On success the browser is redirected to the provider; nothing to do here.
  };

  return (
    <section className="section sign-in-section" style={{ maxWidth: 440 }}>
      <div style={{ fontSize: 11, letterSpacing: ".4em", color: "var(--gold-deep)", marginBottom: 8, textAlign: "center" }}>WELCOME</div>
      <h1 className="serif page-h1" style={{ margin: "0 0 8px", color: "var(--purple-900)", fontWeight: 400, textAlign: "center" }}>
        {t("account.signIn")}
      </h1>
      <p style={{ color: "var(--ink-soft)", fontSize: 14, margin: "0 0 28px", textAlign: "center" }}>
        Choose how you would like to enter the maison.
      </p>

      {/* OAuth providers */}
      <button
        type="button"
        onClick={() => onOAuth("google")}
        className="btn btn-block"
        style={{
          background: "white",
          color: "#3a2a64",
          border: "1px solid var(--line)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          padding: "12px 16px",
          fontSize: 14,
          fontWeight: 500,
        }}
      >
        <GoogleIcon />
        Continue with Google
      </button>

      {/* Divider */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0", color: "var(--ink-soft)", fontSize: 11, letterSpacing: ".15em" }}>
        <div style={{ flex: 1, borderTop: "1px solid var(--line)" }} />
        <span>OR BY EMAIL</span>
        <div style={{ flex: 1, borderTop: "1px solid var(--line)" }} />
      </div>

      {/* Mode toggle */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, padding: 4, background: "#f4ecd8", borderRadius: 4 }}>
        <button
          type="button"
          onClick={() => { setMode("password"); setError(null); setInfo(null); }}
          style={{ flex: 1, padding: "8px 10px", border: "none", background: mode === "password" ? "white" : "transparent", fontSize: 12, fontFamily: "var(--mono)", letterSpacing: ".1em", cursor: "pointer", textTransform: "uppercase", color: mode === "password" ? "var(--purple-900)" : "var(--ink-soft)" }}
        >
          Password
        </button>
        <button
          type="button"
          onClick={() => { setMode("magic"); setError(null); setInfo(null); }}
          style={{ flex: 1, padding: "8px 10px", border: "none", background: mode === "magic" ? "white" : "transparent", fontSize: 12, fontFamily: "var(--mono)", letterSpacing: ".1em", cursor: "pointer", textTransform: "uppercase", color: mode === "magic" ? "var(--purple-900)" : "var(--ink-soft)" }}
        >
          Magic link
        </button>
      </div>

      <form className="panel" onSubmit={mode === "password" ? onPasswordSubmit : onMagicLink}>
        <div className="field">
          <label>Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@mail.co"
            autoComplete="email"
            autoFocus
          />
        </div>

        {mode === "password" && (
          <div className="field" style={{ marginTop: 12 }}>
            <label>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              minLength={6}
            />
          </div>
        )}

        <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 16 }} disabled={pending}>
          {pending
            ? (mode === "password" ? "Signing in…" : "Sending link…")
            : (mode === "password" ? "Sign in" : "Send me a sign-in link")}
        </button>

        {mode === "magic" && (
          <p style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 10, textAlign: "center", lineHeight: 1.5 }}>
            We will email you a one-tap link. No password required.
          </p>
        )}

        {error && <p style={{ color: "var(--err)", fontSize: 13, marginTop: 12 }}>{error}</p>}
        {info && <p style={{ color: "var(--ok)", fontSize: 13, marginTop: 12, background: "#eef7ee", padding: 10, border: "1px solid #4caf50" }}>{info}</p>}

        <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 18, textAlign: "center" }}>
          Or simply <Link href="/checkout">place an order as a guest</Link>.
        </p>
      </form>
    </section>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  );
}

