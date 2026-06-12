import { getTranslations, getLocale } from "next-intl/server";
import { getVisibleSegments } from "@/lib/queries";
import {
  getAnnouncement,
  isWithinWindow,
  announcementSignature,
} from "@/lib/announcement";
import { Link } from "@/i18n/routing";
import Icon from "./Icon";
import LocaleSwitcher from "./LocaleSwitcher";
import CartIcon from "./CartIcon";
import SearchDropdown from "./SearchDropdown";
import CatStrip from "./CatStrip";
import MobileMenuButton from "./MobileMenuButton";
import AnnouncementBar from "./AnnouncementBar";

export default async function TopNav() {
  const t = await getTranslations();
  const locale = await getLocale();
  let segments: Awaited<ReturnType<typeof getVisibleSegments>> = [];
  try {
    segments = await getVisibleSegments();
  } catch {
    // DB not configured yet — the storefront still renders.
  }

  const segmentData = segments.map((s) => ({ id: s.id, name: s.name }));

  // Scheduled announcement (admin-managed) wins over the static translation;
  // a disabled/absent row keeps the original always-on topbar untouched.
  const announcement = await getAnnouncement();
  const announcementText = announcement
    ? (locale === "bn" ? announcement.textBn || announcement.textEn : announcement.textEn || announcement.textBn).trim()
    : "";
  const useScheduledBar = Boolean(announcement?.enabled && announcementText);

  return (
    <>
      {useScheduledBar && announcement ? (
        <AnnouncementBar
          text={announcementText}
          tone={announcement.tone}
          dismissible={announcement.dismissible}
          signature={announcementSignature(announcement)}
          startAt={announcement.startAt}
          endAt={announcement.endAt}
          serverActive={isWithinWindow(announcement, new Date())}
        />
      ) : (
        <div className="topbar">
          {t("topbar.announcement")}
        </div>
      )}
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
