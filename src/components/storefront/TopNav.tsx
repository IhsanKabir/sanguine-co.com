import { getTranslations } from "next-intl/server";
import { getVisibleSegments } from "@/lib/queries";
import { Link } from "@/i18n/routing";
import Icon from "./Icon";
import LocaleSwitcher from "./LocaleSwitcher";
import CartIcon from "./CartIcon";
import SearchDropdown from "./SearchDropdown";
import CatStrip from "./CatStrip";

export default async function TopNav() {
  const t = await getTranslations();
  let segments: Awaited<ReturnType<typeof getVisibleSegments>> = [];
  try {
    segments = await getVisibleSegments();
  } catch {
    // DB not configured yet — the storefront still renders.
  }

  return (
    <>
      <div className="topbar">
        {t("topbar.announcement")}
      </div>
      <nav className="nav" aria-label="Primary">
        <div className="nav-inner">
          <div className="nav-left">
            <Link href="/" className="nav-link">{t("nav.maison")}</Link>
            {segments[0] && (
              <Link href={`/shop/${segments[0].id}`} className="nav-link">
                {t("nav.boutique")}
              </Link>
            )}
            <Link href="/wishlist" className="nav-link">{t("nav.wishlist")}</Link>
          </div>
          <Link href="/" className="nav-brand" aria-label={t("brand.name")}>
            {t("brand.name")}<sup aria-hidden="true">SSG</sup>
          </Link>
          <div className="nav-right">
            <SearchDropdown />
            <LocaleSwitcher />
            <Link href="/account" className="icon-btn" aria-label={t("nav.account")}>
              <Icon name="user" />
            </Link>
            <Link href="/wishlist" className="icon-btn" aria-label={t("nav.wishlist")}>
              <Icon name="heart" />
            </Link>
            <CartIcon ariaLabel={t("nav.cart")} />
          </div>
        </div>
        <CatStrip segments={segments.map((s) => ({ id: s.id, name: s.name }))} />
      </nav>
    </>
  );
}
