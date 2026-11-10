import localFont from "next/font/local";

// Shared by the [locale] layout (the <html> owner) and the root not-found
// document. Lives in its own module so both can compose the same variables.
//
// Self-hosted (Nov 2026): next/font/google downloaded these at every build,
// and Vercel builds failed twice in one day when that fetch broke. The files
// in ./fonts are the Google Fonts variable woff2 subsets (SIL OFL), declared
// with the same unicode ranges Google serves, so what each page downloads is
// unchanged. next/font needs literal options, so the ranges are repeated
// inline (latin on Inter/Cormorant, bengali on the two Noto families).

export const inter = localFont({
  src: "./fonts/inter-latin.woff2",
  weight: "100 900",
  style: "normal",
  variable: "--font-sans",
  display: "swap",
  declarations: [{ prop: "unicode-range", value: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD" }],
});

export const cormorant = localFont({
  src: [
    { path: "./fonts/cormorant-garamond-latin.woff2", weight: "400 600", style: "normal" },
    { path: "./fonts/cormorant-garamond-latin-italic.woff2", weight: "400 600", style: "italic" },
  ],
  variable: "--font-serif",
  display: "swap",
  adjustFontFallback: "Times New Roman",
  declarations: [{ prop: "unicode-range", value: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD" }],
});

// JetBrains Mono was dropped (Nov 2026): it only set small labels and was a
// fifth font file on every first load. --mono (styles.css) now maps to Inter.

// Bangla. Neither Latin family above has Bengali glyphs, so Bangla text used
// whatever the device had (FreeSans, Nirmala UI, …) and looked different on
// every phone. These sit right after the Latin font in each stack
// (styles.css --serif / --sans / --mono): Latin characters keep Cormorant /
// Inter, Bengali characters get Noto. Only the Bengali subset is shipped, so
// its unicode-range keeps English pages from downloading it, and preload is
// off for the same reason.
export const notoSerifBengali = localFont({
  src: "./fonts/noto-serif-bengali.woff2",
  weight: "400 600",
  style: "normal",
  variable: "--font-bn-serif",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+0951-0952, U+0964-0965, U+0980-09FE, U+1CD0, U+1CD2, U+1CD5-1CD6, U+1CD8, U+1CE1, U+1CEA, U+1CED, U+1CF2, U+1CF5-1CF7, U+200C-200D, U+20B9, U+25CC, U+A8F1, U+11DF0-11DF1" }],
});

export const notoSansBengali = localFont({
  src: "./fonts/noto-sans-bengali.woff2",
  weight: "400 500",
  style: "normal",
  variable: "--font-bn-sans",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+0951-0952, U+0964-0965, U+0980-09FE, U+1CD0, U+1CD2, U+1CD5-1CD6, U+1CD8, U+1CE1, U+1CEA, U+1CED, U+1CF2, U+1CF5-1CF7, U+200C-200D, U+20B9, U+25CC, U+A8F1, U+11DF0-11DF1" }],
});

export const fontClasses = `${inter.variable} ${cormorant.variable} ${notoSerifBengali.variable} ${notoSansBengali.variable}`;
