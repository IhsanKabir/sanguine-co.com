import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import Ornament from "@/components/storefront/Ornament";
import JsonLd from "@/components/seo/JsonLd";

type Props = { params: Promise<{ locale: string }> };

const BASE = (process.env.NEXT_PUBLIC_SITE_URL || "https://saanguine-the-retail-shop.vercel.app").replace(/\/$/, "");

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
      siteName: "Saanguine Maison",
      // Maison card — child openGraph replaces the root fallback wholesale.
      images: [{ url: "/api/og", width: 1200, height: 630, alt: "Saanguine Maison" }],
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function AtelierPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const organizationLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Saanguine Maison",
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
        <div className="kicker">The House Atelier · Dhaka · Est. MMXXVI</div>
        <h1>The Saanguine<br />Atelier</h1>
        <p className="ed-lede">
          A workshop built on the conviction that beautiful things deserve to be made slowly.
        </p>
      </div>

      <Ornament variant="tide-line" />

      <div className="ed-body">
        <section className="ed-section">
          <div className="ed-section-kicker">I. The Beginning</div>
          <h2>Where it begins</h2>
          <p>The maison was assembled in a narrow room in Dhaka — not a studio, exactly; more like the back of a thought. A cluster of objects that refused to coexist anywhere else: a folded length of muga silk, a bottle of vetiver absolute, a bound notebook with marbled covers. The first collection was not designed so much as gathered.</p>
          <p>We did not set out to build a brand. We set out to answer a question: what would a house of beautiful things look like if it were built in Bangladesh, with Bangladeshi hands, for people who had always been told that beauty was an import?</p>
        </section>

        <section className="ed-section">
          <div className="ed-section-kicker">II. Materials</div>
          <h2>On cloth and its patience</h2>
          <p>We work principally in fabrics that have waiting built into them. Muslin, voile, velvet — textiles that ask the cutter to slow down, that punish haste with puckering and reward quiet with drape. Our weavers source from mills in Cumilla and Khulna, where the looms are still hand-warped and the pace is set by the warp, not the schedule.</p>
          <blockquote className="ed-pull">
            <p>Velvet asks for the slow knife. The one that waits for the nap to settle before it commits.</p>
          </blockquote>
          <p>Our perfumes begin with attars — thick, resinous concentrates pressed from rose, oud, sandalwood and vetiver — and are built outward from there rather than downward from a brief. The iris in our spring eau was macerated for eleven days past what any formula required.</p>
        </section>

        <section className="ed-section">
          <div className="ed-section-kicker">III. Philosophy</div>
          <h2>Slow is not a style</h2>
          <p>There is a certain kind of deliberateness that looks, from a distance, like inefficiency. It is the florist who ties a ribbon three times before it is right. The perfumer who lets a maceration sit a week past the minimum. The bookbinder who chooses the cloth before the title. We take this as instruction.</p>
          <p>We produce limited quantities for a reason that is not strategic: we cannot make more without compromising what we make. Each season&rsquo;s output is bounded by what a small team can do with full attention, and we consider that boundary a feature, not a constraint.</p>
          <blockquote className="ed-pull">
            <p>A wax seal cools in under a minute but holds for a century. We are interested in that ratio.</p>
          </blockquote>
        </section>

        <section className="ed-section">
          <div className="ed-section-kicker">IV. The Hands</div>
          <h2>Who makes it</h2>
          <p>The maison is small by design. Our core team — cutters, a perfumer, a bookbinder, and two florists — works from the same address in Gulshan. We do not outsource what can be done in this room. Everything that leaves carrying a wax seal has been touched, in some way, by someone whose name we know.</p>
          <p>We pay wages above market, offer flexible hours, and close for the full week of Eid. We consider these facts unremarkable — simply the conditions under which good work is possible.</p>
        </section>
      </div>

      <div className="ed-cta">
        <p>The pieces speak for themselves better than we can.</p>
        <Link href="/" className="btn btn-gold">Wander the boutique →</Link>
      </div>
    </>
  );
}
