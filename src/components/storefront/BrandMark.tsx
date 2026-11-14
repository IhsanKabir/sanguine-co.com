import { BRAND_DESIGN_SIZE, BRAND_FILES } from "@/lib/brand-files.generated";

type Locale = "en" | "bn";

interface BrandMarkProps {
  locale: Locale;
  /** The accessible name: the brand name in the page's language. */
  alt: string;
  /** Size of the English capitals in px (the logo's design size). */
  letterPx: number;
  /** On screens up to 640px wide, show only this page's language at this size. */
  narrowLetterPx?: number;
  /** "light" puts plum letters on a light ground, "dark" cream letters on a dark one. */
  tone?: "light" | "dark";
  className?: string;
}

const scaled = (file: { width: number; height: number }, letterPx: number) => ({
  width: Math.round((file.width * letterPx) / BRAND_DESIGN_SIZE),
  height: Math.round((file.height * letterPx) / BRAND_DESIGN_SIZE),
});

/** The file for one language's half of the logo (narrow screens, the mobile menu). */
export function brandHalf(locale: Locale, letterPx: number) {
  const file = locale === "bn" ? BRAND_FILES.bn : BRAND_FILES.en;
  return { src: file.src, ...scaled(file, letterPx) };
}

/**
 * The Sanguine logo: সাঙ্গুইন hangs from a gold line and SANGUINE stands on
 * it (made in brand/, see brand/README.md). Wide screens show both scripts;
 * with `narrowLetterPx`, narrow screens show the half in the page's language.
 *
 * Files, not inline SVG: the outlines are 12 KB, and inline they would be
 * sent twice on every page (in the HTML and again in the React payload),
 * where a file is fetched once and cached.
 */
export default function BrandMark({ locale, alt, letterPx, narrowLetterPx, tone = "light", className }: BrandMarkProps) {
  const wide = tone === "dark" ? BRAND_FILES.lockupCream : BRAND_FILES.lockup;
  const img = (
    // eslint-disable-next-line @next/next/no-img-element -- an SVG logo: next/image would not resize or compress it
    <img src={wide.src} {...scaled(wide, letterPx)} alt={alt} className={className} decoding="async" />
  );
  if (!narrowLetterPx) return img;
  const half = brandHalf(locale, narrowLetterPx);
  return (
    <picture>
      <source media="(max-width: 640px)" srcSet={half.src} width={half.width} height={half.height} />
      {img}
    </picture>
  );
}
