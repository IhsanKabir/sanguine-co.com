import type { Metadata } from "next";

import { SITE_URL as BASE } from "@/lib/site-url";

type Slug = "privacy" | "terms" | "returns" | "shipping";

const COPY: Record<Slug, { en: { title: string; description: string }; bn: { title: string; description: string } }> = {
  privacy: {
    en: { title: "Privacy", description: "How Sanguine handles personal information, cookies and analytics — bilingual EN/BN policy." },
    bn: { title: "গোপনীয়তা", description: "সাঙ্গুইন কীভাবে ব্যক্তিগত তথ্য, কুকি ও অ্যানালিটিক্স পরিচালনা করে — দ্বিভাষিক নীতি।" },
  },
  terms: {
    en: { title: "Terms", description: "Terms of service for shopping at Sanguine — orders, payments, courier, refunds." },
    bn: { title: "শর্তাবলী", description: "সাঙ্গুইনে কেনাকাটার সেবার শর্তাবলী — অর্ডার, পেমেন্ট, কুরিয়ার, রিফান্ড।" },
  },
  returns: {
    en: { title: "Returns", description: "Sanguine return policy — eligible items, courier pickup, refund timeline." },
    bn: { title: "ফেরত", description: "সাঙ্গুইনের ফেরত নীতি — যোগ্য পিস, কুরিয়ার পিকআপ, রিফান্ড সময়রেখা।" },
  },
  shipping: {
    en: { title: "Shipping", description: "Shipping rates, courier partners (Pathao, Steadfast) and delivery timeline across Bangladesh." },
    bn: { title: "শিপিং", description: "বাংলাদেশ জুড়ে শিপিং রেট, কুরিয়ার পার্টনার (পাঠাও, স্টেডফাস্ট) ও ডেলিভারি সময়।" },
  },
};

/**
 * Shared `generateMetadata` builder for the four legal pages. Each page imports
 * this and calls `legalMetadata("privacy", params)` etc. so canonical, hreflang
 * (BCP-47 + x-default), per-locale title and description are consistent.
 */
export async function legalMetadata(
  slug: Slug,
  params: Promise<{ locale: string }>,
): Promise<Metadata> {
  const { locale } = await params;
  const isBn = locale === "bn";
  const copy = isBn ? COPY[slug].bn : COPY[slug].en;
  const url = `${BASE}/${locale}/legal/${slug}`;
  return {
    title: copy.title,
    description: copy.description,
    alternates: {
      canonical: url,
      languages: {
        "en-BD": `${BASE}/en/legal/${slug}`,
        "bn-BD": `${BASE}/bn/legal/${slug}`,
        "x-default": `${BASE}/en/legal/${slug}`,
      },
    },
    openGraph: {
      title: copy.title,
      description: copy.description,
      url,
      type: "website",
      locale: isBn ? "bn_BD" : "en_BD",
      siteName: "Sanguine",
      // Maison card — child openGraph replaces the root fallback wholesale.
      images: [{ url: "/api/og", width: 1200, height: 630, alt: "Sanguine" }],
    },
  };
}
