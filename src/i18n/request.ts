import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";
import { applyCopyOverrides, getCopyOverrides } from "@/lib/copy";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as (typeof routing.locales)[number])) {
    locale = routing.defaultLocale;
  }
  const baseMessages = (await import(`../messages/${locale}.json`)).default;
  // Merge admin-managed overrides on top of the static JSON. The Editorial
  // admin writes to site_settings.copy; see lib/copy.ts.
  const overrides = await getCopyOverrides();
  const localeOverrides = locale === "bn" ? overrides.bn : overrides.en;
  const messages = applyCopyOverrides(baseMessages, localeOverrides);
  return { locale, messages };
});
