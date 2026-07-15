import { Inter, Cormorant_Garamond, JetBrains_Mono } from "next/font/google";

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

export const fontClasses = `${inter.variable} ${cormorant.variable} ${jbMono.variable}`;
