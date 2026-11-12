import { SITE_URL as BASE } from "@/lib/site-url";
import { FACEBOOK_URL, INSTAGRAM_URL, SUPPORT_PHONE_TEL } from "@/lib/contact";

// Canonical entity name is "Sanguine" everywhere: JSON-LD, OG,
// manifest, brand copy. Inconsistent naming delays Google Knowledge Panel
// disambiguation. `sameAs` lists only *claimed* external profiles for the brand.
export const organizationLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Sanguine",
  url: BASE,
  logo: `${BASE}/logo.png`,
  description: "Sanguine is a house of considered things, based in Dhaka, opening one category at a time.",
  email: "concierge@sanguine-co.com",
  telephone: SUPPORT_PHONE_TEL,
  address: {
    "@type": "PostalAddress",
    addressLocality: "Dhaka",
    addressCountry: "BD",
  },
  // Only CLAIMED profiles: unclaimed handles muddy Knowledge Panel
  // disambiguation. Instagram added 13 Nov 2026; add others as they open.
  sameAs: [FACEBOOK_URL, INSTAGRAM_URL],
};

// SearchAction removed 2026-05-03: the query-string URL template
// (`/en/shop?q=`) is disallowed by robots.txt's `/*?*` rule, so emitting
// it as a SearchAction was inaccurate. Restore once we have a stable
// crawlable search results URL.
export const websiteLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  // name drives Google's SERP "site name" (shows "Sanguine" instead of the
  // bare domain); alternateName covers domain-shaped brand queries.
  name: "Sanguine",
  alternateName: "sanguine-co",
  url: BASE,
  inLanguage: ["en-BD", "bn-BD"],
};
