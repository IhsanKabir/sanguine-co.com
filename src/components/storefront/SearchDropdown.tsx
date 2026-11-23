"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { priceDisplayText, type PriceDisplay } from "@/lib/pricing";
import Icon from "./Icon";

type SearchHit = {
  id: string;
  slug: string;
  sku: string;
  name: string;
  nameBn: string | null;
  display: PriceDisplay;
  preorderOnly: boolean;
  cat: string | null;
  img: string | null;
  /** img is a cut-out (shown whole on the cream), not a photo. */
  cut: boolean;
};

export default function SearchDropdown() {
  const t = useTranslations();
  const locale = useLocale() as "en" | "bn";
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Click-outside collapses.
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setExpanded(false);
        setQ("");
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Debounced fetch.
  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); return; }
    const timer = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
        const j = await r.json();
        setHits(j.results || []);
      } catch { setHits([]); }
    }, 220);
    return () => clearTimeout(timer);
  }, [q]);

  const onPick = (slug: string) => {
    setOpen(false);
    setExpanded(false);
    setQ("");
    router.push(`/product/${slug}`);
  };

  // Enter, or "See all results": the full results page with filters and sort.
  const onSeeAll = () => {
    const term = q.trim();
    if (term.length < 2) return;
    setOpen(false);
    setExpanded(false);
    setQ("");
    router.push(`/search?q=${encodeURIComponent(term)}`);
  };

  const handleExpand = () => {
    setExpanded(true);
    // Let the element mount before focusing.
    setTimeout(() => inputRef.current?.focus(), 40);
  };

  // Collapsed state: just the icon button.
  if (!expanded) {
    return (
      <button
        className="icon-btn"
        aria-label={t("nav.search")}
        onClick={handleExpand}
      >
        <Icon name="search" size={18} />
      </button>
    );
  }

  // Expanded state: full search input with dropdown.
  return (
    <div className="nav-search" ref={wrapRef}>
      <Icon name="search" size={16} />
      <input
        ref={inputRef}
        type="search"
        aria-label={t("nav.search")}
        placeholder={t("nav.search")}
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onSeeAll();
          } else if (e.key === "Escape") {
            setOpen(false);
            setExpanded(false);
            setQ("");
          }
        }}
      />
      {open && q.length >= 2 && (
        <div className="search-pop" role="listbox">
          {hits.length === 0 ? (
            <div className="search-empty">{t("search.empty")}</div>
          ) : (
            hits.map((p) => (
              <div
                key={p.id}
                className="search-row"
                role="option"
                aria-selected={false}
                tabIndex={0}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onPick(p.slug)}
              >
                <span className={"search-thumb" + (p.cut ? " is-cut" : "")}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- 44px thumbnail; the optimiser adds a round trip for nothing */}
                  {p.img ? <img src={p.img} alt="" loading="lazy" /> : null}
                </span>
                <div>
                  <div className="ct">{p.cat || ""}</div>
                  <div className="nm">{(locale === "bn" && p.nameBn) || p.name}</div>
                </div>
                <div className="pr">{p.preorderOnly ? t("pdp.preorderOnly")
                  : p.display.kind === "quote" ? t("pdp.priceOnQuote") : priceDisplayText(p.display, locale)}</div>
              </div>
            ))
          )}
          <button
            type="button"
            className="search-all"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onSeeAll}
          >
            {t("search.seeAll")}
          </button>
        </div>
      )}
    </div>
  );
}
