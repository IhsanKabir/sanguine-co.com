import { Inter, Cormorant_Garamond, JetBrains_Mono, Noto_Serif_Bengali, Noto_Sans_Bengali } from "next/font/google";

// Shared by the [locale] layout (the <html> owner) and the root not-found
// document. Lives in its own module so both can compose the same variables.
export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

export const jbMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

// Bangla. Neither Latin family above has Bengali glyphs, so Bangla text used
// whatever the device had (FreeSans, Nirmala UI, …) and looked different on
// every phone. These sit right after the Latin font in each stack
// (styles.css --serif / --sans / --mono): Latin characters keep Cormorant /
// Inter, Bengali characters get Noto. Only the "bengali" subset is built, so
// its unicode-range keeps English pages from downloading it, and preload is
// off for the same reason.
export const notoSerifBengali = Noto_Serif_Bengali({
  subsets: ["bengali"],
  weight: ["400", "500", "600"],
  variable: "--font-bn-serif",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
});

export const notoSansBengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  weight: ["400", "500"],
  variable: "--font-bn-sans",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
});

export const fontClasses = `${inter.variable} ${cormorant.variable} ${jbMono.variable} ${notoSerifBengali.variable} ${notoSansBengali.variable}`;
