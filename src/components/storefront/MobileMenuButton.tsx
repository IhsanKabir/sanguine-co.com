"use client";

import { useState, useEffect } from "react";
import { Link } from "@/i18n/routing";
import { usePathname } from "next/navigation";
import Icon from "./Icon";
import LocaleSwitcher from "./LocaleSwitcher";

type Segment = { id: string; name: string };

export default function MobileMenuButton({ segments }: { segments: Segment[] }) {
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
        aria-label="Open navigation menu"
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
        aria-label="Site navigation"
      >
        <div className="mobile-drawer-hd">
          <span className="mobile-drawer-brand">Sanguine</span>
          <button
            className="icon-btn"
            onClick={() => setOpen(false)}
            aria-label="Close navigation menu"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        <nav className="mobile-drawer-nav" aria-label="Categories">
          {segments.map((s) => (
            <Link key={s.id} href={`/shop/${s.id}`} className="mobile-nav-link">
              {s.name}
            </Link>
          ))}
          {segments.length === 0 && (
            <span className="mobile-nav-link" style={{ color: "var(--ink-soft)", pointerEvents: "none" }}>
              No categories yet
            </span>
          )}
        </nav>

        <div className="mobile-drawer-links">
          <Link href="/account" className="mobile-nav-link mobile-nav-secondary">
            <Icon name="user" size={16} /> Account
          </Link>
          <Link href="/wishlist" className="mobile-nav-link mobile-nav-secondary">
            <Icon name="heart" size={16} /> Wishlist
          </Link>
        </div>

        <div className="mobile-drawer-footer">
          <LocaleSwitcher />
        </div>
      </div>
    </>
  );
}
