"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { estimatedArrival, formatArrival } from "@/lib/delivery";
import Icon from "./Icon";

/**
 * "Order today — arrives by Thu, 9 Oct in Dhaka · Mon, 13 Oct elsewhere".
 * Computed in the browser after mount: the product page is cached, so a
 * date rendered on the server would go stale, and the visitor's "today"
 * is the one that matters.
 */
export default function DeliveryEstimate() {
  const t = useTranslations();
  const locale = useLocale() as "en" | "bn";
  const [dates, setDates] = useState<{ dhaka: string; outside: string } | null>(null);

  useEffect(() => {
    const now = new Date();
    setDates({
      dhaka: formatArrival(estimatedArrival(now, true), locale),
      outside: formatArrival(estimatedArrival(now, false), locale),
    });
  }, [locale]);

  if (!dates) return null;
  return (
    <div className="pdp-shipping-note pdp-delivery-estimate">
      <Icon name="check" size={13} />
      <span>{t("pdp.deliveryEstimate", dates)}</span>
    </div>
  );
}
