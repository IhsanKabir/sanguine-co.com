import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { occasionLabel, type OccasionId } from "@/lib/occasions";

/**
 * "Shop by occasion" links. Server-rendered plain links (no JS) so the row
 * adds nothing to the page's script cost. Callers pass only occasions that
 * have at least one live product; an empty list renders nothing.
 */
export default async function OccasionChips({
  ids,
  current,
  locale,
}: {
  ids: OccasionId[];
  current?: string;
  locale: string;
}) {
  if (ids.length === 0) return null;
  const t = await getTranslations();
  return (
    <nav className="occasion-chips" aria-label={t("occasion.kicker")}>
      {ids.map((id) => (
        <Link
          key={id}
          href={`/occasion/${id}`}
          className={"occasion-chip" + (id === current ? " is-current" : "")}
          aria-current={id === current ? "page" : undefined}
        >
          {occasionLabel(id, locale)}
        </Link>
      ))}
    </nav>
  );
}
