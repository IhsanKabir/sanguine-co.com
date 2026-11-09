"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { estimatedArrival, formatArrival } from "@/lib/delivery";

/**
 * "Arrives by Thu, 13 Nov in Dhaka", for the PDP trust line.
 * The date is computed in the browser after mount: the product page is
 * cached, so a server-rendered date would go stale, and the visitor's
 * "today" is the one that matters. Until then it shows the dispatch promise,
 * one line of the same height, so the swap causes no layout shift.
 */
export default function DeliveryEstimate() {
  const t = useTranslations();
  const locale = useLocale() as "en" | "bn";
  const [dhaka, setDhaka] = useState<string | null>(null);

  useEffect(() => {
    setDhaka(formatArrival(estimatedArrival(new Date(), true), locale));
  }, [locale]);

  return <span>{dhaka ? t("pdp.trustArrives", { date: dhaka }) : t("pdp.trustDispatch")}</span>;
}
