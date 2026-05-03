import { getTranslations } from "next-intl/server";
import { getVisibleSegments } from "@/lib/queries";
import { Link } from "@/i18n/routing";

export default async function Footer() {
  const t = await getTranslations();
  let segments: Awaited<ReturnType<typeof getVisibleSegments>> = [];
  try {
    segments = await getVisibleSegments();
  } catch {
    // DB unavailable — render fallback
  }

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-grid">
          <div>
            <p style={{ fontStyle: "italic", fontFamily: "var(--serif)", fontSize: 18, margin: "0 0 8px", color: "var(--cream)" }}>{t("brand.name")}</p>
            <p style={{ fontSize: 13, color: "var(--purple-200)", maxWidth: 300, lineHeight: 1.7 }}>
              {t("brand.tagline")}
            </p>
          </div>
          <div>
            <div className="col-title">{t("footer.shop")}</div>
            <ul>
              {segments.slice(0, 5).map((c) => (
                <li key={c.id}>
                  <Link href={`/shop/${c.id}`}>{c.name}</Link>
                </li>
              ))}
            </ul>
          </div>
          {/* Maison column intentionally omitted until /atelier and /journal
            * are live. Per SEO-AUDIT.md: dead nav-link stubs read as a quality
            * signal. Restore once the editorial routes ship. */}
          <div>
            <div className="col-title">{t("footer.service")}</div>
            <ul>
              <li><Link href="/legal/shipping">Shipping</Link></li>
              <li><Link href="/legal/returns">Returns</Link></li>
              <li>Cash on Delivery</li>
            </ul>
          </div>
          <div>
            <div className="col-title">{t("footer.contact")}</div>
            <ul><li>concierge@saanguine.co</li></ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© MMXXVI {t("brand.name")} Maison · {t("footer.rights")}</span>
          <span>
            <Link href="/legal/privacy">{t("footer.privacy")}</Link>
            {" · "}
            <Link href="/legal/terms">{t("footer.terms")}</Link>
            {" · "}
            <Link href="/legal/returns">Returns</Link>
            {" · "}
            <Link href="/legal/shipping">Shipping</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
