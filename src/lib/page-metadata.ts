import type { Metadata } from "next";
import { SITE_URL as BASE } from "@/lib/site-url";

type Copy = { title: string; description: string };

/**
 * Metadata for a simple bilingual page (Contact, FAQ): canonical, hreflang,
 * title, description and the shared social card. Mirrors `legalMetadata`
 * for pages that live outside /legal.
 */
export function pageMetadata(path: string, locale: string, copy: { en: Copy; bn: Copy }): Metadata {
  const isBn = locale === "bn";
  const { title, description } = isBn ? copy.bn : copy.en;
  const url = `${BASE}/${locale}${path}`;
  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        "en-BD": `${BASE}/en${path}`,
        "bn-BD": `${BASE}/bn${path}`,
        "x-default": `${BASE}/en${path}`,
      },
    },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      locale: isBn ? "bn_BD" : "en_BD",
      siteName: "Sanguine",
      images: [{ url: "/api/og", width: 1200, height: 630, alt: "Sanguine" }],
    },
  };
}
