import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";
import { applyCopyOverrides, expandVariantOverrides, getCopyOverrides } from "@/lib/copy";
import { SCOPE_KEY_SUFFIXES } from "@/lib/delivery-scope";

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
  // An edit of a base string also covers its delivery-scope variants.
  const messages = applyCopyOverrides(baseMessages, expandVariantOverrides(baseMessages, localeOverrides, SCOPE_KEY_SUFFIXES));
  return { locale, messages };
});
