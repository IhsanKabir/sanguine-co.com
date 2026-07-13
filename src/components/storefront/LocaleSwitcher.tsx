"use client";

import { Suspense, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter, usePathname, routing, type Locale } from "@/i18n/routing";
import { useLocale } from "next-intl";

function LocaleSwitcherInner() {
  const router = useRouter();
  const pathname = usePathname();
  // next-intl's usePathname drops the query string — without re-appending it,
  // switching language on /order/…/track?t=TOKEN loses the token (404) and
  // shop filters / search context reset.
  const searchParams = useSearchParams();
  const current = useLocale() as Locale;
  const [isPending, startTransition] = useTransition();

  const switchTo = (next: Locale) => {
    const qs = searchParams.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { locale: next });
    });
  };

  return (
    <div className="locale-switch" role="group" aria-label="Language">
      {routing.locales.map((loc) => (
        <button
          key={loc}
          onClick={() => switchTo(loc)}
          aria-pressed={current === loc}
          disabled={isPending || current === loc}
          className={current === loc ? "is-active" : ""}
        >
          {loc === "en" ? "EN" : "বাংলা"}
        </button>
      ))}
    </div>
  );
}

// useSearchParams requires a Suspense boundary during prerender — self-wrap so
// every TopNav/static-page usage stays valid without touching call sites.
export default function LocaleSwitcher() {
  return (
    <Suspense fallback={<div className="locale-switch" aria-hidden="true" />}>
      <LocaleSwitcherInner />
    </Suspense>
  );
}
