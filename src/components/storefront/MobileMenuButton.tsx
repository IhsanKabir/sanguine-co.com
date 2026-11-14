"use client";

import { useState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { usePathname } from "next/navigation";
import Icon from "./Icon";
import LocaleSwitcher from "./LocaleSwitcher";
import { brandHalf } from "./BrandMark";

type Segment = { id: string; name: string };

export default function MobileMenuButton({ segments }: { segments: Segment[] }) {
  const t = useTranslations();
  const brand = brandHalf(useLocale() === "bn" ? "bn" : "en", 22);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <button
        className="nav-menu-btn icon-btn"
        onClick={() => setOpen(true)}
        aria-label={t("nav.openMenu")}
        aria-expanded={open}
        aria-controls="mobile-nav"
      >
        <Icon name="menu" size={20} />
      </button>

      {open && (
        <div
          className="mobile-overlay"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        id="mobile-nav"
        className={`mobile-drawer${open ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={t("nav.siteNavigation")}
      >
        <div className="mobile-drawer-hd">
          <span className="mobile-drawer-brand">
            {/* eslint-disable-next-line @next/next/no-img-element -- an SVG logo; lazy, as the closed drawer is off screen */}
            <img src={brand.src} width={brand.width} height={brand.height} alt={t("brand.name")} loading="lazy" decoding="async" />
          </span>
          <button
            className="icon-btn"
            onClick={() => setOpen(false)}
            aria-label={t("nav.closeMenu")}
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        <nav className="mobile-drawer-nav" aria-label={t("nav.categories")}>
          {segments.map((s) => (
            <Link key={s.id} href={`/shop/${s.id}`} className="mobile-nav-link">
              {s.name}
            </Link>
          ))}
          {segments.length === 0 && (
            <span className="mobile-nav-link" style={{ color: "var(--ink-soft)", pointerEvents: "none" }}>
              {t("nav.noCategories")}
            </span>
          )}
        </nav>

        <div className="mobile-drawer-links">
          <Link href="/account" className="mobile-nav-link mobile-nav-secondary">
            <Icon name="user" size={16} /> {t("nav.account")}
          </Link>
          <Link href="/wishlist" className="mobile-nav-link mobile-nav-secondary">
            <Icon name="heart" size={16} /> {t("nav.wishlist")}
          </Link>
          <Link href="/faq" className="mobile-nav-link mobile-nav-secondary">
            <Icon name="help" size={16} /> {t("footer.faq")}
          </Link>
          <Link href="/contact" className="mobile-nav-link mobile-nav-secondary">
            <Icon name="chat" size={16} /> {t("footer.contactPage")}
          </Link>
        </div>

        <div className="mobile-drawer-footer">
          <LocaleSwitcher />
        </div>
      </div>
    </>
  );
}
