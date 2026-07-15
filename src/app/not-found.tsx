import Link from "next/link";
import { fontClasses } from "./fonts";

// Root-level 404 — reached only for paths outside the [locale] tree (the
// middleware redirects almost everything into a locale). Because the root
// layout is a pass-through, this document renders its own <html>/<body>;
// localized 404s live in [locale]/not-found.tsx.
export default function RootNotFound() {
  return (
    <html lang="en" className={fontClasses}>
      <body>
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            fontFamily: "var(--font-serif), serif",
            background: "#faf7f2",
            color: "#2a2027",
            textAlign: "center",
            padding: 24,
          }}
        >
          <p style={{ fontSize: 13, letterSpacing: ".35em", textTransform: "uppercase", opacity: 0.6 }}>
            Sanguine
          </p>
          <h1 style={{ fontSize: 42, fontWeight: 500, margin: 0 }}>This page has wandered off.</h1>
          <Link href="/en" style={{ color: "#7b2d43", textDecoration: "underline", fontSize: 15 }}>
            Return to the maison
          </Link>
        </main>
      </body>
    </html>
  );
}
