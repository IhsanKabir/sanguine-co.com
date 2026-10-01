import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

export default function NotFound() {
  const t = useTranslations();
  return (
    <section className="section" style={{ minHeight: "60vh", display: "grid", placeItems: "center", textAlign: "center" }}>
      <div>
        <div style={{ fontSize: 11, letterSpacing: ".4em", color: "var(--gold-deep)", marginBottom: 8 }}>404</div>
        <h1 className="serif" style={{ fontSize: 56, margin: 0, color: "var(--purple-900)", fontWeight: 400 }}>
          {t("notFound.title")}
        </h1>
        <p style={{ color: "var(--ink-soft)", marginTop: 12 }}>
          {t("notFound.body")}
        </p>
        <Link href="/" className="btn btn-primary" style={{ marginTop: 24 }}>
          {t("checkout.returnHome")}
        </Link>
      </div>
    </section>
  );
}
