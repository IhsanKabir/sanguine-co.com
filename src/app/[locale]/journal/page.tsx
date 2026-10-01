import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import Ornament from "@/components/storefront/Ornament";
import { SITE_URL as BASE } from "@/lib/site-url";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  const isBn = locale === "bn";
  const url = `${BASE}/${locale}/journal`;
  const title = t("journal.metaTitle");
  const description = t("journal.metaDescription");
  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        "en-BD": `${BASE}/en/journal`,
        "bn-BD": `${BASE}/bn/journal`,
        "x-default": `${BASE}/en/journal`,
      },
    },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      locale: isBn ? "bn_BD" : "en_BD",
      siteName: "Sanguine",
      // Maison card — child openGraph replaces the root fallback wholesale.
      images: [{ url: "/api/og", width: 1200, height: 630, alt: "Sanguine" }],
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

// kicker / title / excerpt / season are message keys (journal.*).
const ISSUES = [
  {
    issue: "I.",
    kicker: "journal.i1Kicker",
    title: "journal.i1Title",
    excerpt: "journal.i1Excerpt",
    season: "journal.season",
    href: "/shop/clothing" as const,
  },
  {
    issue: "II.",
    kicker: "journal.i2Kicker",
    title: "journal.i2Title",
    excerpt: "journal.i2Excerpt",
    season: "journal.season",
    href: "/shop/flowers" as const,
  },
  {
    issue: "III.",
    kicker: "journal.i3Kicker",
    title: "journal.i3Title",
    excerpt: "journal.i3Excerpt",
    season: "journal.season",
    href: "/shop/watches" as const,
  },
  {
    issue: "IV.",
    kicker: "journal.i4Kicker",
    title: "journal.i4Title",
    excerpt: "journal.i4Excerpt",
    season: "journal.season",
    href: "/shop/books" as const,
  },
];

export default async function JournalPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <>
      <div className="ed-hero">
        <div className="kicker">{t("journal.kicker")}</div>
        <h1>{t("journal.title")}</h1>
        <p className="ed-lede">
          {t("journal.lede")}
        </p>
      </div>

      <Ornament variant="tide-line" />

      <div className="jnl-wrap">
        <div className="jnl-grid">
          {ISSUES.map((entry) => (
            <Link key={entry.issue} href={entry.href} className="jnl-entry">
              <div className="jnl-entry-kicker">{t(entry.kicker)}</div>
              <div className="jnl-issue" aria-hidden="true">{entry.issue}</div>
              <h2>{t(entry.title)}</h2>
              <p className="jnl-excerpt">{t(entry.excerpt)}</p>
              <span className="jnl-meta">{t(entry.season)}</span>
            </Link>
          ))}
          <div className="jnl-future">
            <p>{t.rich("journal.future", { br: () => <br /> })}</p>
          </div>
        </div>
      </div>
    </>
  );
}
