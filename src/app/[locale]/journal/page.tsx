import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
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
    // The copy already carries the brand ("The Journal · Sanguine"), so skip
    // the layout template that would append " · Sanguine" a second time.
    title: { absolute: title },
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
      // Maison card: child openGraph replaces the root fallback wholesale.
      images: [{ url: "/api/og", width: 1200, height: 630, alt: "Sanguine" }],
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

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
          <div className="jnl-future">
            <p>{t.rich("journal.future", { br: () => <br /> })}</p>
          </div>
        </div>
      </div>
    </>
  );
}
