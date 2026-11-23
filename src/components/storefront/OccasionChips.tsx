import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { occasionLabel, type OccasionId } from "@/lib/occasions";

/**
 * "Shop by occasion" links. Server-rendered plain links (no JS) so the row
 * adds nothing to the page's script cost. Callers pass only occasions that
 * have at least one live product; an empty list renders nothing.
 * variant "line": the quiet text row on the shop stage, led by "Every occasion" (allHref).
 */
export default async function OccasionChips({
  ids,
  current,
  locale,
  variant = "chips",
  allHref,
}: {
  ids: OccasionId[];
  current?: string;
  locale: string;
  variant?: "chips" | "line";
  allHref?: string;
}) {
  if (ids.length === 0) return null;
  const t = await getTranslations();
  const line = variant === "line";
  return (
    <nav className={line ? "occasion-line" : "occasion-chips"} aria-label={t("occasion.kicker")}>
      {line && allHref && (
        <Link href={allHref} aria-current={current ? undefined : "page"}>{t("stage.every")}</Link>
      )}
      {ids.map((id) => (
        <Link
          key={id}
          href={`/occasion/${id}`}
          className={line ? undefined : "occasion-chip" + (id === current ? " is-current" : "")}
          aria-current={id === current ? "page" : undefined}
        >
          {occasionLabel(id, locale)}
        </Link>
      ))}
    </nav>
  );
}
