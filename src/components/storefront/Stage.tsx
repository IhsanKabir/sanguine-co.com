"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { flushSync } from "react-dom";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { colorLabel, sizeLabel, uniqueOptions, sameOption } from "@/lib/option-labels";
import type { StageItem } from "@/lib/stage-items";
import StagePanel from "./StagePanel";

interface StageProps {
  items: StageItem[];
  /** The big faint word behind the products: the category or occasion. */
  ghost: string;
  /** The page title (the h1), shown small top left after the scene number. */
  title: string;
  /** "6 pieces". */
  countLabel: string;
  /** The panel's small heading, e.g. "Flowers". */
  segmentLabel: string;
  expressCutoffMin: number;
  /** The occasion links, rendered on the server. */
  nav?: ReactNode;
}

const PARAM = "b";
const SCROLL_SHARE = 0.8;
const PHONE = "(max-width: 760px)";

type DocWithTransitions = Document & { startViewTransition?: (update: () => void) => unknown };

const still = (): boolean => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Runs a state change as one smooth motion where the browser can (View Transitions), else at once. */
function withTransition(update: () => void): void {
  const doc = document as DocWithTransitions;
  if (!doc.startViewTransition || still()) {
    update();
    return;
  }
  doc.startViewTransition(() => flushSync(update));
}

function slugInUrl(): string | null {
  return new URLSearchParams(window.location.search).get(PARAM);
}

function urlWith(slug: string | null): string {
  const url = new URL(window.location.href);
  if (slug) url.searchParams.set(PARAM, slug);
  else url.searchParams.delete(PARAM);
  return url.pathname + url.search + url.hash;
}

/**
 * The shop's stage: the products stand cut out on the page with the category's name faint
 * behind them. Tapping one brings it forward and opens its panel beside it (a sheet on
 * phones) with the pre-order form one tap away, so nobody leaves the page to order. The
 * address carries ?b=<slug>, so the back button closes the panel and the link can be shared.
 * Every product is a real link to its page, so it works without JavaScript and for crawlers.
 */
export default function Stage({ items, ghost, title, countLabel, segmentLabel, expressCutoffMin, nav }: StageProps) {
  const t = useTranslations("stage");
  const locale = useLocale() as "en" | "bn";
  const [picked, setPicked] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const row = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLElement>(null);
  const lastItem = useRef<HTMLElement | null>(null);

  const colors = useMemo(() => uniqueOptions(items.flatMap((i) => i.colors)), [items]);
  const sizes = useMemo(() => uniqueOptions(items.flatMap((i) => i.sizes)), [items]);
  const shown = useMemo(
    () => items.filter((i) =>
      (!color || i.colors.some((c) => sameOption(c, color))) && (!size || i.sizes.some((s) => sameOption(s, size)))),
    [items, color, size],
  );
  const pickedIndex = items.findIndex((i) => i.slug === picked);
  const item = pickedIndex >= 0 ? items[pickedIndex] : null;

  // A shared link opens its product; the back and forward buttons follow the address.
  // On load this only ever opens: a tap made while the page was still starting up has
  // already picked one, and Next.js rewrites the address once on load (dropping ?b=).
  useEffect(() => {
    const known = (slug: string | null) => (slug && items.some((i) => i.slug === slug) ? slug : null);
    const fromLink = known(slugInUrl());
    if (fromLink) setPicked(fromLink);
    const sync = () => withTransition(() => setPicked(known(slugInUrl())));
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [items]);

  const open = useCallback((slug: string, el: HTMLElement) => {
    lastItem.current = el;
    const already = slugInUrl() !== null;
    if (already) window.history.replaceState(window.history.state, "", urlWith(slug));
    else window.history.pushState(window.history.state, "", urlWith(slug));
    withTransition(() => setPicked(slug));
    // On phones the picked one stands at the top of the stage, above the sheet: bring that into view.
    if (matchMedia(PHONE).matches) stage.current?.scrollIntoView({ block: "start", behavior: still() ? "auto" : "smooth" });
  }, []);

  const close = useCallback(() => {
    window.history.replaceState(window.history.state, "", urlWith(null));
    withTransition(() => setPicked(null));
    lastItem.current?.focus();
  }, []);

  const onItemClick = (e: MouseEvent<HTMLAnchorElement>, slug: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;   // new tab still works
    e.preventDefault();
    open(slug, e.currentTarget);
  };

  const scroll = (dir: 1 | -1) => {
    const el = row.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * SCROLL_SHARE, behavior: still() ? "auto" : "smooth" });
  };

  const hasFilter = colors.length > 1 || sizes.length > 1;

  return (
    <section ref={stage} className={"stage" + (item ? " is-picked" : "")} aria-label={ghost}>
      <div className="stage-ghost" aria-hidden="true" data-ghost={ghost} />
      <div className="stage-top">
        <div className="stage-kicker"><span>01</span><h1>{title}</h1><span>{countLabel}</span></div>
        <div className="stage-tools">
          {nav}
          {hasFilter && (
            <button type="button" className="stage-filter-btn" aria-expanded={filterOpen} onClick={() => setFilterOpen((v) => !v)}>
              {t("filter")}{color || size ? " · 1+" : ""}
            </button>
          )}
        </div>
      </div>
      {hasFilter && filterOpen && (
        <div className="stage-filter">
          {colors.length > 1 && (
            <fieldset><legend>{t("colour")}</legend>
              {colors.map((c) => (
                <button key={c} type="button" aria-pressed={color === c} onClick={() => setColor(color === c ? null : c)}>{colorLabel(c, locale)}</button>
              ))}
            </fieldset>
          )}
          {sizes.length > 1 && (
            <fieldset><legend>{t("size")}</legend>
              {sizes.map((s) => (
                <button key={s} type="button" aria-pressed={size === s} onClick={() => setSize(size === s ? null : s)}>{sizeLabel(s, locale)}</button>
              ))}
            </fieldset>
          )}
          {(color || size) && <button type="button" className="stage-clear" onClick={() => { setColor(null); setSize(null); }}>{t("clear")}</button>}
        </div>
      )}

      {item && (
        <div className="stage-hero">
          <StageFigure item={item} index={pickedIndex} big />
        </div>
      )}

      <div className="stage-row-wrap">
        {!item && shown.length > 3 && (
          <div className="stage-arrows">
            <button type="button" className="rail-ctrl" aria-label={t("prev")} onClick={() => scroll(-1)}>←</button>
            <button type="button" className="rail-ctrl" aria-label={t("next")} onClick={() => scroll(1)}>→</button>
          </div>
        )}
        <div className="stage-row" ref={row}>
          {shown.map((it) => {
            const i = items.indexOf(it);
            const isOn = it.slug === picked;
            return (
              <Link key={it.slug} href={`/product/${it.slug}`} className={"stage-item" + (isOn ? " is-on" : "")}
                aria-current={isOn ? "true" : undefined} onClick={(e) => onItemClick(e, it.slug)}>
                {/* The one in front is drawn large above; its place in the row keeps no motion name. */}
                <StageFigure item={it} index={isOn ? -1 : i} />
                <span className="stage-cap"><b>{it.name}</b>{it.meta}</span>
              </Link>
            );
          })}
          {shown.length === 0 && <p className="stage-none">{t("noMatch")}</p>}
        </div>
      </div>

      {item && (
        <StagePanel key={item.slug} item={item} segmentLabel={segmentLabel} expressCutoffMin={expressCutoffMin}
          initialColor={color} initialSize={size} onClose={close} />
      )}
    </section>
  );
}

/** A product's picture: the cut-out, or its first photo shown round. index < 0: no motion name. */
function StageFigure({ item, index, big = false }: { item: StageItem; index: number; big?: boolean }) {
  const style = index >= 0 ? { viewTransitionName: `stage-${index}` } : undefined;
  if (item.cutout) {
    const h = big ? item.cutout.height : Math.round(item.cutout.height / 2);
    const w = big ? item.cutout.width : Math.round(item.cutout.width / 2);
    return (
      <Image src={big ? item.cutout.large : item.cutout.small} width={w} height={h} alt="" style={style}
        className="stage-cut" sizes={big ? "(max-width: 760px) 70vw, 40vw" : "(max-width: 760px) 45vw, 220px"} priority={big} />
    );
  }
  if (item.photo) {
    return (
      <Image src={item.photo} width={big ? 520 : 240} height={big ? 520 : 240} alt="" style={style}
        className="stage-disc" sizes={big ? "(max-width: 760px) 70vw, 36vw" : "(max-width: 760px) 45vw, 220px"} priority={big} />
    );
  }
  return <span className="stage-disc stage-empty" style={style} />;
}
