"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useMemo, useTransition, useState, useOptimistic } from "react";

type Props = {
  segmentSlug: string;
  availableColors: string[];
  availableSizes: string[];
  availableTags: string[];
  priceMin: number;
  priceMax: number;
  shownCount: number;
  totalCount: number;
};

const SORT_OPTIONS: { id: string; label: string }[] = [
  { id: "featured",    label: "Featured" },
  { id: "newest",      label: "Newest" },
  { id: "price-asc",   label: "Price · low → high" },
  { id: "price-desc",  label: "Price · high → low" },
  { id: "rating",      label: "Most loved" },
];

const TAG_LABELS: Record<string, string> = {
  new: "New",
  sale: "On sale",
  limited: "Limited",
  "staff-pick": "Staff pick",
};

export default function SegmentFilters(props: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [filterOpen, setFilterOpen] = useState(false);

  // Optimistic URL state: the tapped pill flips instantly while the RSC
  // render is in flight (the URL stays the source of truth on settle). On BD
  // mobile networks the old server-roundtrip-then-repaint made every filter
  // tap look frozen.
  const [optimisticQs, setOptimisticQs] = useOptimistic(params.toString());
  const active = useMemo(() => new URLSearchParams(optimisticQs), [optimisticQs]);

  const minActive = active.get("min") ?? "";
  const maxActive = active.get("max") ?? "";
  const tagActive = active.get("tag") ?? "";
  const sortActive = active.get("sort") ?? "featured";
  const colorList = useMemo(() => (active.get("color") ?? "").split(",").filter(Boolean), [active]);
  const sizeList  = useMemo(() => (active.get("size") ?? "").split(",").filter(Boolean), [active]);

  const updateParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(active.toString());
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    startTransition(() => {
      setOptimisticQs(qs);
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  };

  const toggleListParam = (key: "color" | "size", value: string) => {
    const list = key === "color" ? colorList : sizeList;
    const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
    updateParam(key, next.join(","));
  };

  const clearAll = () => {
    startTransition(() => {
      setOptimisticQs("");
      router.push(pathname);
    });
    setFilterOpen(false);
  };

  const activeCount =
    (tagActive ? 1 : 0) +
    colorList.length +
    sizeList.length +
    (minActive ? 1 : 0) +
    (maxActive ? 1 : 0) +
    (sortActive && sortActive !== "featured" ? 1 : 0);

  const hasAnyActive = activeCount > 0;

  return (
    <div className="filter-bar">
      {/* ── Mobile compact trigger row ─────────────────────────────── */}
      <div className="filter-trigger-row">
        <button
          type="button"
          className={"filter-trigger-btn" + (filterOpen ? " open" : "") + (activeCount > 0 ? " has-active" : "")}
          onClick={() => setFilterOpen((v) => !v)}
          aria-expanded={filterOpen}
          aria-controls="filter-body"
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <line x1="3" y1="6" x2="17" y2="6" />
            <line x1="6" y1="10" x2="14" y2="10" />
            <line x1="8" y1="14" x2="12" y2="14" />
          </svg>
          Filters{activeCount > 0 ? ` (${activeCount})` : ""}
        </button>

        <label className="filter-sort-inline">
          <select
            value={sortActive}
            onChange={(e) => updateParam("sort", e.target.value === "featured" ? null : e.target.value)}
            aria-busy={pending}
          >
            {SORT_OPTIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>

        <span className="filter-count-inline">
          {props.shownCount} of {props.totalCount}{pending ? " …" : ""}
        </span>
      </div>

      {/* ── Full filter body (always visible on desktop, toggle on mobile) ── */}
      <div id="filter-body" className={"filter-body" + (filterOpen ? " open" : "")}>
        <div className="filter-body-inner">
          {/* Sort — desktop only (mobile has inline select above) */}
          <label className="filter-group filter-sort-desktop">
            <span className="filter-label">Sort</span>
            <select
              value={sortActive}
              onChange={(e) => updateParam("sort", e.target.value === "featured" ? null : e.target.value)}
              aria-busy={pending}
              className="filter-select"
            >
              {SORT_OPTIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>

          {/* Tag */}
          {props.availableTags.length > 0 && (
            <div className="filter-group">
              <span className="filter-label">Tag</span>
              <div className="filter-chips">
                {props.availableTags.map((t) => (
                  <button
                    key={t}
                    type="button"
                    aria-busy={pending}
                    onClick={() => updateParam("tag", tagActive === t ? null : t)}
                    className={"filter-pill " + (tagActive === t ? "active" : "")}
                  >
                    {TAG_LABELS[t] ?? t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Price */}
          {props.priceMax > props.priceMin && (
            <div className="filter-group">
              <span className="filter-label">Price</span>
              <div className="filter-price">
                <input
                  type="number"
                  placeholder={`৳${props.priceMin}`}
                  value={minActive}
                  onChange={(e) => updateParam("min", e.target.value || null)}
                  aria-busy={pending}
                  className="filter-price-input"
                />
                <span className="filter-price-dash">–</span>
                <input
                  type="number"
                  placeholder={`৳${props.priceMax}`}
                  value={maxActive}
                  onChange={(e) => updateParam("max", e.target.value || null)}
                  aria-busy={pending}
                  className="filter-price-input"
                />
              </div>
            </div>
          )}

          {/* Colours */}
          {props.availableColors.length > 0 && (
            <div className="filter-group">
              <span className="filter-label">Colour</span>
              <div className="filter-chips">
                {props.availableColors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-busy={pending}
                    onClick={() => toggleListParam("color", c)}
                    className={"filter-pill " + (colorList.includes(c) ? "active" : "")}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sizes */}
          {props.availableSizes.length > 0 && (
            <div className="filter-group">
              <span className="filter-label">Size</span>
              <div className="filter-chips">
                {props.availableSizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-busy={pending}
                    onClick={() => toggleListParam("size", s)}
                    className={"filter-pill " + (sizeList.includes(s) ? "active" : "")}
                    style={{ fontFamily: "var(--mono)" }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="filter-footer">
            <span className="filter-count-desktop">
              {props.shownCount} of {props.totalCount}{pending ? " …" : ""}
            </span>
            {hasAnyActive && (
              <button
                type="button"
                aria-busy={pending}
                onClick={clearAll}
                className="btn btn-ghost btn-sm"
                style={{ padding: "4px 10px", fontSize: 11 }}
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
