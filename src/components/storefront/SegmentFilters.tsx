"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useMemo, useTransition } from "react";

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
  { id: "price-asc",   label: "Price · low to high" },
  { id: "price-desc",  label: "Price · high to low" },
  { id: "rating",      label: "Most loved" },
];

const TAG_LABELS: Record<string, string> = {
  new: "New",
  sale: "On sale",
  limited: "Limited",
  "staff-pick": "Staff pick",
};

/**
 * URL-state-driven filter strip for the segment shop page.
 * State is held entirely in `?min=&max=&tag=&color=&size=&sort=`. Toggling a
 * value rewrites the URL and the segment page re-renders server-side with
 * the filtered query.
 */
export default function SegmentFilters(props: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const minActive = params.get("min") ?? "";
  const maxActive = params.get("max") ?? "";
  const tagActive = params.get("tag") ?? "";
  const sortActive = params.get("sort") ?? "featured";
  const colorList = useMemo(() => (params.get("color") ?? "").split(",").filter(Boolean), [params]);
  const sizeList  = useMemo(() => (params.get("size") ?? "").split(",").filter(Boolean), [params]);

  const updateParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    startTransition(() => {
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
      router.push(pathname);
    });
  };

  const hasAnyActive =
    minActive || maxActive || tagActive || colorList.length > 0 || sizeList.length > 0 || (sortActive && sortActive !== "featured");

  return (
    <div style={{ marginBottom: 24, padding: 14, background: "#fcfaf6", border: "1px solid var(--line)", position: "sticky", top: 72, zIndex: 20 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" }}>
        {/* Sort */}
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
          <span style={{ color: "var(--ink-soft)", letterSpacing: ".15em", textTransform: "uppercase", fontSize: 10 }}>Sort</span>
          <select
            value={sortActive}
            onChange={(e) => updateParam("sort", e.target.value === "featured" ? null : e.target.value)}
            disabled={pending}
            style={{ padding: "6px 8px", border: "1px solid var(--line)", background: "white", fontSize: 12 }}
          >
            {SORT_OPTIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>

        {/* Tag */}
        {props.availableTags.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "var(--ink-soft)", letterSpacing: ".15em", textTransform: "uppercase", fontSize: 10 }}>Tag</span>
            {props.availableTags.map((t) => (
              <button
                key={t}
                type="button"
                disabled={pending}
                onClick={() => updateParam("tag", tagActive === t ? null : t)}
                className={"filter-pill " + (tagActive === t ? "active" : "")}
                style={{ padding: "5px 10px", fontSize: 11 }}
              >
                {TAG_LABELS[t] ?? t}
              </button>
            ))}
          </div>
        )}

        {/* Price */}
        {props.priceMax > props.priceMin && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
            <span style={{ color: "var(--ink-soft)", letterSpacing: ".15em", textTransform: "uppercase", fontSize: 10 }}>Price</span>
            <input
              type="number"
              placeholder={`৳${props.priceMin}`}
              value={minActive}
              onChange={(e) => updateParam("min", e.target.value || null)}
              disabled={pending}
              style={{ width: 80, padding: "6px 8px", border: "1px solid var(--line)", fontSize: 12 }}
            />
            <span style={{ color: "var(--ink-soft)" }}>–</span>
            <input
              type="number"
              placeholder={`৳${props.priceMax}`}
              value={maxActive}
              onChange={(e) => updateParam("max", e.target.value || null)}
              disabled={pending}
              style={{ width: 80, padding: "6px 8px", border: "1px solid var(--line)", fontSize: 12 }}
            />
          </div>
        )}

        {/* Colours */}
        {props.availableColors.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ color: "var(--ink-soft)", letterSpacing: ".15em", textTransform: "uppercase", fontSize: 10 }}>Colour</span>
            {props.availableColors.map((c) => (
              <button
                key={c}
                type="button"
                disabled={pending}
                onClick={() => toggleListParam("color", c)}
                className={"filter-pill " + (colorList.includes(c) ? "active" : "")}
                style={{ padding: "5px 10px", fontSize: 11 }}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {/* Sizes */}
        {props.availableSizes.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ color: "var(--ink-soft)", letterSpacing: ".15em", textTransform: "uppercase", fontSize: 10 }}>Size</span>
            {props.availableSizes.map((s) => (
              <button
                key={s}
                type="button"
                disabled={pending}
                onClick={() => toggleListParam("size", s)}
                className={"filter-pill " + (sizeList.includes(s) ? "active" : "")}
                style={{ padding: "5px 10px", fontSize: 11, fontFamily: "var(--mono)" }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>
            {props.shownCount} of {props.totalCount} {pending ? "…" : ""}
          </span>
          {hasAnyActive && (
            <button
              type="button"
              disabled={pending}
              onClick={clearAll}
              className="btn btn-ghost btn-sm"
              style={{ padding: "4px 10px", fontSize: 11 }}
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
