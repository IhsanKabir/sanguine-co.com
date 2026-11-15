"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { EXPRESS_CUTOFF_HOUR } from "@/lib/delivery";

const TICK_MS = 30_000;

/** Minutes left today until the express cutoff, in Dhaka time; 0 once it has passed. */
function minutesToCutoff(now: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return Math.max(0, EXPRESS_CUTOFF_HOUR * 60 - (h * 60 + m));
}

/**
 * "Same-day express: order in the next 2 h 14 m", counting down to the cutoff in Dhaka
 * time; after it, "order now for tomorrow". Worked out in the browser after mount (the
 * page is cached, so a server-made time would be stale); until then it holds its space.
 */
export default function SameDayLine() {
  const t = useTranslations("home.sameDay");
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const update = () => setLeft(minutesToCutoff(new Date()));
    update();
    const timer = setInterval(update, TICK_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="sameday" aria-live="polite">
      <span className="sameday-dot" aria-hidden="true" />
      <span>{left === null ? " " : left > 0 ? t("open", { h: Math.floor(left / 60), m: left % 60 }) : t("closed")}</span>
    </div>
  );
}
