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
      siteName: "Saanguine Maison",
      // Maison card — child openGraph replaces the root fallback wholesale.
      images: [{ url: "/api/og", width: 1200, height: 630, alt: "Saanguine Maison" }],
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

const ISSUES = [
  {
    issue: "I.",
    kicker: "Atelier · Note",
    title: "On the cutting of velvet at dusk, and the patience it asks of the hand",
    excerpt: "The first cut is never the deepest. We learned this from an aunt — who learned it from her own — that velvet asks for the slow knife, the one that waits for the nap to settle before it commits.",
    season: "Spring · MMXXVI",
    href: "/shop/clothing" as const,
  },
  {
    issue: "II.",
    kicker: "Garden · Dispatch",
    title: "The iris will not open if you watch it too closely",
    excerpt: "There is something instructive about a flower that refuses to perform on your schedule. The iris opens when it is ready — the arrangement adjusts, not the bloom.",
    season: "Spring · MMXXVI",
    href: "/shop/flowers" as const,
  },
  {
    issue: "III.",
    kicker: "Horology · Aside",
    title: "A watch that belongs to no one yet finds its owner in the turning of a crown",
    excerpt: "The cabochon crown is the last thing a watchmaker touches. It is the hinge between mechanism and wearer — and it is, quietly, the part that introduces the two.",
    season: "Spring · MMXXVI",
    href: "/shop/watches" as const,
  },
  {
    issue: "IV.",
    kicker: "Bibliophile · Letter",
    title: "Notes on first editions and the particular smell of their commitment",
    excerpt: "A first edition is not a book so much as a decision — someone chose to hold back a copy at the moment of highest uncertainty. That hesitation, that act of faith, is what you are really buying.",
    season: "Spring · MMXXVI",
    href: "/shop/books" as const,
  },
];

export default async function JournalPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <div className="ed-hero">
        <div className="kicker">Notes from the Maison</div>
        <h1>The Journal</h1>
        <p className="ed-lede">
          On cloth, scent, time, and the small ceremonies that make a life worth living.
        </p>
      </div>

      <Ornament variant="tide-line" />

      <div className="jnl-wrap">
        <div className="jnl-grid">
          {ISSUES.map((entry) => (
            <Link key={entry.issue} href={entry.href} className="jnl-entry">
              <div className="jnl-entry-kicker">{entry.kicker}</div>
              <div className="jnl-issue" aria-hidden="true">{entry.issue}</div>
              <h2>{entry.title}</h2>
              <p className="jnl-excerpt">{entry.excerpt}</p>
              <span className="jnl-meta">{entry.season}</span>
            </Link>
          ))}
          <div className="jnl-future">
            <p>Further notes are in the making.<br />The journal updates each season.</p>
          </div>
        </div>
      </div>
    </>
  );
}
