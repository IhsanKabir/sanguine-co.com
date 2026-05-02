"use client";

import { useMemo, useState, useTransition } from "react";
import { updateBrand, updateCopyOverrides } from "@/lib/actions/admin";
import Icon from "@/components/storefront/Icon";

type Map = Record<string, string>;

type Props = {
  email: string;
  defaultsEn: Map;
  defaultsBn: Map;
  overridesEn: Map;
  overridesBn: Map;
};

const QUICK_PATHS = ["brand.name", "brand.tagline", "topbar.announcement"] as const;

export default function EditorialClient({
  email: initialEmail,
  defaultsEn,
  defaultsBn,
  overridesEn,
  overridesBn,
}: Props) {
  const [email, setEmail] = useState(initialEmail);
  // Keep one map per locale of *current* values (override if set, otherwise
  // the static default). Sending equality with the default on save signals
  // "no override" — we strip those server-side.
  const [en, setEn] = useState<Map>(() => mergeWithDefaults(defaultsEn, overridesEn));
  const [bn, setBn] = useState<Map>(() => mergeWithDefaults(defaultsBn, overridesBn));
  const [filter, setFilter] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ brand: true, topbar: true, home: true });
  const [savedQuick, setSavedQuick] = useState(false);
  const [savedAll, setSavedAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Group all keys by their top-level namespace for the library section.
  const groups = useMemo(() => {
    const byGroup: Record<string, string[]> = {};
    for (const path of Object.keys(defaultsEn)) {
      const ns = path.split(".")[0];
      if (!byGroup[ns]) byGroup[ns] = [];
      byGroup[ns].push(path);
    }
    for (const ns of Object.keys(byGroup)) byGroup[ns].sort();
    return byGroup;
  }, [defaultsEn]);

  const filterLower = filter.trim().toLowerCase();
  const matchesFilter = (path: string): boolean => {
    if (!filterLower) return true;
    if (path.toLowerCase().includes(filterLower)) return true;
    if ((en[path] ?? "").toLowerCase().includes(filterLower)) return true;
    if ((bn[path] ?? "").toLowerCase().includes(filterLower)) return true;
    return false;
  };

  const setValue = (locale: "en" | "bn", path: string, value: string) => {
    if (locale === "en") setEn((m) => ({ ...m, [path]: value }));
    else setBn((m) => ({ ...m, [path]: value }));
  };

  const resetToDefault = (locale: "en" | "bn", path: string) => {
    setValue(locale, path, locale === "en" ? defaultsEn[path] : defaultsBn[path]);
  };

  const buildOverridePayload = (): { en: Map; bn: Map } => {
    // Send only entries that actually differ from the static default. Empties
    // and matches are stripped server-side too, but trimming here keeps the
    // payload small.
    const diff = (current: Map, defaults: Map): Map => {
      const out: Map = {};
      for (const [k, v] of Object.entries(current)) {
        if (v !== defaults[k]) out[k] = v;
      }
      return out;
    };
    return { en: diff(en, defaultsEn), bn: diff(bn, defaultsBn) };
  };

  // Both panels save the same underlying state — the form is one editable
  // surface, the buttons are just two affordances. The brand row holds the
  // (non-i18n) contact email; copy overrides hold every customer-facing
  // string for both locales.
  const persist = (onDone: () => void) => {
    setError(null);
    startTransition(async () => {
      const [r1, r2] = await Promise.all([
        updateBrand({
          name: en["brand.name"] || "Saanguine",
          tagline: en["brand.tagline"] || undefined,
          email: email || undefined,
          announcement: en["topbar.announcement"] || undefined,
        }),
        updateCopyOverrides(buildOverridePayload()),
      ]);
      if (r1.ok && r2.ok) onDone();
      else setError("Could not save your changes.");
    });
  };

  const onSaveQuick = () => persist(() => {
    setSavedQuick(true);
    setTimeout(() => setSavedQuick(false), 2000);
  });

  const onSaveAll = () => persist(() => {
    setSavedAll(true);
    setTimeout(() => setSavedAll(false), 2000);
  });

  const toggleGroup = (g: string) => setOpenGroups((s) => ({ ...s, [g]: !s[g] }));

  return (
    <>
      <h1 className="admin-h1">Editorial</h1>
      <p className="admin-sub">
        House voice. Edit the four headline strings up top, or open any namespace below to edit every customer-facing string.
        Empty a field to fall back to the shipped default.
      </p>

      {/* ── Quick edit ─────────────────────────────────────────────── */}
      <div className="panel" style={{ marginBottom: 20 }}>
        <h3>House details</h3>
        <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: -4, marginBottom: 14 }}>
          The most common edits. Changes appear on the storefront within seconds of saving.
        </p>

        <FieldPair
          label="Brand name"
          path="brand.name"
          en={en} bn={bn} setValue={setValue}
          defaultsEn={defaultsEn} defaultsBn={defaultsBn}
          resetToDefault={resetToDefault}
        />
        <FieldPair
          label="Tagline"
          path="brand.tagline"
          en={en} bn={bn} setValue={setValue}
          defaultsEn={defaultsEn} defaultsBn={defaultsBn}
          resetToDefault={resetToDefault}
        />
        <FieldPair
          label="Announcement bar"
          path="topbar.announcement"
          en={en} bn={bn} setValue={setValue}
          defaultsEn={defaultsEn} defaultsBn={defaultsBn}
          resetToDefault={resetToDefault}
        />

        <div className="field" style={{ marginTop: 12 }}>
          <label>Contact email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 4 }}>
            Not localised — single value used in mailto links across the storefront.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 18 }}>
          <button className="btn btn-primary btn-sm" onClick={onSaveQuick} disabled={pending}>
            {pending ? "Saving…" : "Save house details"}
          </button>
          <span className={"saved-ind " + (savedQuick ? "in" : "")} role="status" aria-live="polite">
            {savedQuick && <><Icon name="check" size={12} /> Saved</>}
          </span>
        </div>
      </div>

      {/* ── Full copy library ───────────────────────────────────────── */}
      <div className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 16, marginBottom: 14, flexWrap: "wrap" }}>
          <div>
            <h3 style={{ marginBottom: 4 }}>Copy library</h3>
            <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: 0 }}>
              Every customer-facing string, English and বাংলা side-by-side. Tokens like
              <code style={{ margin: "0 4px" }}>{`{count}`}</code> must be preserved verbatim.
            </p>
          </div>
          <input
            type="search"
            placeholder="Filter by key or text…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 2, minWidth: 260, fontSize: 13 }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {Object.keys(groups).sort().map((ns) => {
            const visible = groups[ns].filter(matchesFilter);
            if (visible.length === 0) return null;
            const isOpen = filter ? true : openGroups[ns] ?? false;
            return (
              <div key={ns} style={{ border: "1px solid var(--line)", borderRadius: 2 }}>
                <button
                  type="button"
                  onClick={() => toggleGroup(ns)}
                  style={{
                    width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "12px 14px", background: "var(--purple-50)", cursor: "pointer", border: "none",
                    fontFamily: "var(--mono)", fontSize: 12, letterSpacing: ".15em", textTransform: "uppercase",
                    color: "var(--purple-900)",
                  }}
                  aria-expanded={isOpen}
                >
                  <span>{ns} <span style={{ color: "var(--ink-soft)", marginLeft: 8 }}>{visible.length}</span></span>
                  <span aria-hidden style={{ fontFamily: "var(--mono)", fontSize: 14 }}>{isOpen ? "−" : "+"}</span>
                </button>
                {isOpen && (
                  <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
                    {visible.map((path) => (
                      <CopyRow
                        key={path}
                        path={path}
                        en={en[path] ?? ""}
                        bn={bn[path] ?? ""}
                        defaultEn={defaultsEn[path] ?? ""}
                        defaultBn={defaultsBn[path] ?? ""}
                        setValue={setValue}
                        resetToDefault={resetToDefault}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {error && (
          <p style={{ color: "var(--err)", fontSize: 13, marginTop: 14 }}>{error}</p>
        )}

        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 22, paddingTop: 18, borderTop: "1px solid var(--line)" }}>
          <button className="btn btn-primary btn-sm" onClick={onSaveAll} disabled={pending}>
            {pending ? "Saving…" : "Save all copy"}
          </button>
          <span className={"saved-ind " + (savedAll ? "in" : "")} role="status" aria-live="polite">
            {savedAll && <><Icon name="check" size={12} /> Saved</>}
          </span>
          <span style={{ fontSize: 11, color: "var(--ink-soft)", marginLeft: "auto" }}>
            Saves both English + বাংলা overrides at once.
          </span>
        </div>
      </div>
    </>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────

function mergeWithDefaults(defaults: Map, overrides: Map): Map {
  const out: Map = { ...defaults };
  for (const [k, v] of Object.entries(overrides)) {
    if (typeof v === "string" && v.length > 0) out[k] = v;
  }
  return out;
}

function FieldPair({
  label, path, en, bn, setValue, defaultsEn, defaultsBn, resetToDefault,
}: {
  label: string;
  path: string;
  en: Map; bn: Map;
  setValue: (locale: "en" | "bn", path: string, v: string) => void;
  defaultsEn: Map; defaultsBn: Map;
  resetToDefault: (locale: "en" | "bn", path: string) => void;
}) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", marginBottom: 4 }}>
        <label style={{ fontSize: 11, letterSpacing: ".15em", textTransform: "uppercase", color: "var(--ink-soft)" }}>{label}</label>
        <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-soft)" }}>{path}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <LocaleField
          locale="en"
          value={en[path] ?? ""}
          fallback={defaultsEn[path] ?? ""}
          onChange={(v) => setValue("en", path, v)}
          onReset={() => resetToDefault("en", path)}
        />
        <LocaleField
          locale="bn"
          value={bn[path] ?? ""}
          fallback={defaultsBn[path] ?? ""}
          onChange={(v) => setValue("bn", path, v)}
          onReset={() => resetToDefault("bn", path)}
        />
      </div>
    </div>
  );
}

function CopyRow({
  path, en, bn, defaultEn, defaultBn, setValue, resetToDefault,
}: {
  path: string;
  en: string; bn: string;
  defaultEn: string; defaultBn: string;
  setValue: (locale: "en" | "bn", path: string, v: string) => void;
  resetToDefault: (locale: "en" | "bn", path: string) => void;
}) {
  return (
    <div>
      <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-soft)", marginBottom: 4 }}>
        {path}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <LocaleField
          locale="en"
          value={en}
          fallback={defaultEn}
          onChange={(v) => setValue("en", path, v)}
          onReset={() => resetToDefault("en", path)}
        />
        <LocaleField
          locale="bn"
          value={bn}
          fallback={defaultBn}
          onChange={(v) => setValue("bn", path, v)}
          onReset={() => resetToDefault("bn", path)}
        />
      </div>
    </div>
  );
}

function LocaleField({
  locale, value, fallback, onChange, onReset,
}: {
  locale: "en" | "bn";
  value: string;
  fallback: string;
  onChange: (v: string) => void;
  onReset: () => void;
}) {
  const isOverride = value !== fallback && value !== "";
  // Multi-line if either the current value or the default is long. Tagline-
  // length copy reads better in a textarea than a single-line input.
  const long = value.length > 60 || fallback.length > 60;
  const fieldStyle: React.CSSProperties = {
    padding: "8px 10px",
    border: "1px solid " + (isOverride ? "var(--purple-400)" : "var(--line)"),
    background: isOverride ? "var(--purple-50)" : "white",
    borderRadius: 2,
    fontSize: 13,
    fontFamily: "inherit",
    width: "100%",
    outline: "none",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10, letterSpacing: ".2em", textTransform: "uppercase", color: locale === "bn" ? "var(--gold-deep)" : "var(--purple-700)" }}>
          {locale === "en" ? "EN" : "বাংলা"}
        </span>
        {isOverride && (
          <button
            type="button"
            onClick={onReset}
            style={{ fontSize: 10, letterSpacing: ".15em", textTransform: "uppercase", color: "var(--ink-soft)", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
          >
            Reset
          </button>
        )}
      </div>
      {long ? (
        <textarea
          rows={2}
          value={value}
          placeholder={fallback}
          onChange={(e) => onChange(e.target.value)}
          style={{ ...fieldStyle, resize: "vertical" }}
          lang={locale === "bn" ? "bn" : "en"}
        />
      ) : (
        <input
          value={value}
          placeholder={fallback}
          onChange={(e) => onChange(e.target.value)}
          style={fieldStyle}
          lang={locale === "bn" ? "bn" : "en"}
        />
      )}
    </div>
  );
}
