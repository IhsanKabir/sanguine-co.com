import type { Metadata } from "next";

// Sign-in is a per-user flow with no indexable content. Without `noindex`
// it gets surfaced in branded SERPs ("Sanguine sign in") and wastes crawl
// budget on a page Googlebot can never sign in to. Server layout because
// the page itself is "use client" and can't export Metadata directly.
export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return children;
}
