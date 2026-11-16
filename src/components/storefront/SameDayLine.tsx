"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { minutesToCutoff } from "@/lib/delivery";

const TICK_MS = 30_000;


/**
 * "Same-day express: order in the next 2 h 14 m", counting down to the cutoff in Dhaka
 * time; after it, "order now for tomorrow". Worked out in the browser after mount (the
 * page is cached, so a server-made time would be stale); until then it holds its space.
 */
/** cutoffMin: the last order time, from Admin, Settings (minutes after midnight, Dhaka). */
export default function SameDayLine({ cutoffMin }: { cutoffMin: number }) {
  const t = useTranslations("home.sameDay");
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const update = () => setLeft(minutesToCutoff(new Date(), cutoffMin));
    update();
    const timer = setInterval(update, TICK_MS);
    return () => clearInterval(timer);
  }, [cutoffMin]);

  return (
    <div className="sameday" aria-live="polite">
      <span className="sameday-dot" aria-hidden="true" />
      <span>{left === null ? " " : left > 0 ? t("open", { h: Math.floor(left / 60), m: left % 60 }) : t("closed")}</span>
    </div>
  );
}
