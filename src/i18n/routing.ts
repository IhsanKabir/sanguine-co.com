import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";

export const routing = defineRouting({
  locales: ["en", "bn"],
  defaultLocale: "en",
  // 'always' makes the locale prefix mandatory (e.g. /en/shop, /bn/shop).
  // 'as-needed' would let / serve the default. We pick 'always' for clarity.
  localePrefix: "always",
  // Auto-detecting the locale from Accept-Language makes every response vary
  // by request header, so next-intl marks them no-store and writes a
  // NEXT_LOCALE cookie — both of which forbid CDN/edge caching. Disabling it
  // lets the prerendered home/shop pages be edge-cached (a POP near the
  // visitor instead of a Mumbai round-trip). Cost: a bare-root visit lands on
  // the default locale (en) rather than a browser guess; the switcher still
  // works and every SEO entry point already carries an explicit /en or /bn.
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
