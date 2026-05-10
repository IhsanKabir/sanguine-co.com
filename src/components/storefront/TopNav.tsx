import { getTranslations } from "next-intl/server";
import { getVisibleSegments } from "@/lib/queries";
import { Link } from "@/i18n/routing";
import Icon from "./Icon";
import LocaleSwitcher from "./LocaleSwitcher";
import CartIcon from "./CartIcon";
import SearchDropdown from "./SearchDropdown";
import CatStrip from "./CatStrip";
import MobileMenuButton from "./MobileMenuButton";

export default async function TopNav() {
  const t = await getTranslations();
  let segments: Awaited<ReturnType<typeof getVisibleSegments>> = [];
  try {
    segments = await getVisibleSegments();
  } catch {
    // DB not configured yet — the storefront still renders.
  }

  const segmentData = segments.map((s) => ({ id: s.id, name: s.name }));

  return (
    <>
      <div className="topbar">
        {t("topbar.announcement")}
      </div>
      <nav className="nav" aria-label="Primary">
        <div className="nav-inner">
          <MobileMenuButton segments={segmentData} />
          <Link href="/" className="nav-brand" aria-label={t("brand.name")}>
            {t("brand.name")}<sup aria-hidden="true">SSG</sup>
          </Link>
          <CatStrip segments={segmentData} inline />
          <div className="nav-right">
            <SearchDropdown />
            <span className="nav-hide-sm"><LocaleSwitcher /></span>
            <span className="nav-hide-sm">
              <Link href="/account" className="icon-btn" aria-label={t("nav.account")}>
                <Icon name="user" />
              </Link>
            </span>
            <span className="nav-hide-sm">
              <Link href="/wishlist" className="icon-btn" aria-label={t("nav.wishlist")}>
                <Icon name="heart" />
              </Link>
            </span>
            <CartIcon ariaLabel={t("nav.cart")} />
          </div>
        </div>
      </nav>
    </>
  );
}
