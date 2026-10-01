import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import Ornament from "@/components/storefront/Ornament";
import JsonLd from "@/components/seo/JsonLd";
import { SITE_URL as BASE } from "@/lib/site-url";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  const isBn = locale === "bn";
  const url = `${BASE}/${locale}/atelier`;
  const title = t("atelier.metaTitle");
  const description = t("atelier.metaDescription");
  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        "en-BD": `${BASE}/en/atelier`,
        "bn-BD": `${BASE}/bn/atelier`,
        "x-default": `${BASE}/en/atelier`,
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

export default async function AtelierPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const organizationLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Sanguine",
    description: "A curated Bangladeshi maison for perfume, flora, books and small ceremonies.",
    url: BASE,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Dhaka",
      addressCountry: "BD",
    },
    foundingDate: "2026",
  };

  return (
    <>
      <JsonLd data={[organizationLd]} />

      <div className="ed-hero">
        <div className="kicker">{t("atelier.kicker")}</div>
        <h1>{t("atelier.titleLine1")}<br />{t("atelier.titleLine2")}</h1>
        <p className="ed-lede">
          {t("atelier.lede")}
        </p>
      </div>

      <Ornament variant="tide-line" />

      <div className="ed-body">
        <section className="ed-section">
          <div className="ed-section-kicker">{t("atelier.s1Kicker")}</div>
          <h2>{t("atelier.s1Title")}</h2>
          <p>{t("atelier.s1p1")}</p>
          <p>{t("atelier.s1p2")}</p>
        </section>

        <section className="ed-section">
          <div className="ed-section-kicker">{t("atelier.s2Kicker")}</div>
          <h2>{t("atelier.s2Title")}</h2>
          <p>{t("atelier.s2p1")}</p>
          <blockquote className="ed-pull">
            <p>{t("atelier.s2Quote")}</p>
          </blockquote>
          <p>{t("atelier.s2p2")}</p>
        </section>

        <section className="ed-section">
          <div className="ed-section-kicker">{t("atelier.s3Kicker")}</div>
          <h2>{t("atelier.s3Title")}</h2>
          <p>{t("atelier.s3p1")}</p>
          <p>{t("atelier.s3p2")}</p>
          <blockquote className="ed-pull">
            <p>{t("atelier.s3Quote")}</p>
          </blockquote>
        </section>

        <section className="ed-section">
          <div className="ed-section-kicker">{t("atelier.s4Kicker")}</div>
          <h2>{t("atelier.s4Title")}</h2>
          <p>{t("atelier.s4p1")}</p>
          <p>{t("atelier.s4p2")}</p>
        </section>
      </div>

      <div className="ed-cta">
        <p>{t("atelier.ctaText")}</p>
        <Link href="/" className="btn btn-gold">{t("atelier.ctaButton")}</Link>
      </div>
    </>
  );
}
