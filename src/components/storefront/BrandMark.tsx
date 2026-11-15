import { BRAND_DESIGN_SIZE, BRAND_FILES } from "@/lib/brand-files.generated";

type Locale = "en" | "bn";

interface BrandMarkProps {
  locale: Locale;
  /** The accessible name: the brand name in the page's language. */
  alt: string;
  /** Height of the capitals in px (the mask is twice as tall). */
  letterPx: number;
  /** On screens up to 640px wide, show the logo at this smaller size. */
  narrowLetterPx?: number;
  /** "light" puts the red name on a light ground, "dark" the paper name on a dark one. */
  tone?: "light" | "dark";
  className?: string;
}

const scaled = (file: { width: number; height: number }, letterPx: number) => ({
  width: Math.round((file.width * letterPx) / BRAND_DESIGN_SIZE),
  height: Math.round((file.height * letterPx) / BRAND_DESIGN_SIZE),
});

/** The logo file for narrow screens and the mobile menu (the same lockup in both languages). */
export function brandHalf(locale: Locale, letterPx: number) {
  const file = locale === "bn" ? BRAND_FILES.bn : BRAND_FILES.en;
  return { src: file.src, ...scaled(file, letterPx) };
}

/**
 * The Sanguine logo: a smiling mask, cut out like a sticker, beside SANGUINE
 * (made in brand/, see brand/README.md). With `narrowLetterPx`, narrow screens
 * show it smaller.
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
