"use client";

import { useState, useTransition } from "react";
import { updateStylePreferences } from "@/lib/actions/profile";

type Group = {
  key: "perfumeFamily" | "bookGenre" | "flowerPreference";
  label: string;
  options: string[];
};

const GROUPS: Group[] = [
  {
    key: "perfumeFamily",
    label: "Perfume family",
    options: ["Floral", "Oud", "Citrus", "Woody", "Aquatic", "Oriental"],
  },
  {
    key: "bookGenre",
    label: "Book genre",
    options: ["Fiction", "Non-fiction", "Poetry", "Art & Design", "Philosophy", "Mystery"],
  },
  {
    key: "flowerPreference",
    label: "Flowers",
    options: ["Roses", "Lilies", "Seasonal Mix", "Wildflowers", "Exotic"],
  },
];

type Selection = {
  perfumeFamily: string | null;
  bookGenre: string | null;
  flowerPreference: string | null;
};

type Props = {
  initial: Selection;
};

export default function StylePreferences({ initial }: Props) {
  const [selection, setSelection] = useState<Selection>(initial);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = (key: Group["key"], value: string) => {
    setSelection((prev) => ({
      ...prev,
      [key]: prev[key] === value ? null : value,
    }));
  };

  const onSave = () => {
    setError(null);
    startTransition(async () => {
      try {
        const r = await updateStylePreferences(selection);
        if (r.ok) {
          setSaved(true);
          setTimeout(() => setSaved(false), 2500);
        }
      } catch {
        setError("Could not save preferences. Please try again.");
      }
    });
  };

  return (
    <section style={{ marginTop: 48, paddingTop: 40, borderTop: "1px solid var(--line)" }}>
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 10,
            letterSpacing: ".18em",
            color: "var(--gold-text)",
            textTransform: "uppercase",
            fontFamily: "var(--mono)",
            marginBottom: 4,
          }}
        >
          Taste Profile
        </div>
        <h2
          className="serif"
          style={{ fontSize: 28, color: "var(--purple-900)", fontWeight: 500, margin: 0 }}
        >
          Style &amp; Preferences
        </h2>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {GROUPS.map((group) => {
          const selected = selection[group.key];
          return (
            <div key={group.key}>
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: ".18em",
                  color: "var(--ink-soft)",
                  textTransform: "uppercase",
                  fontFamily: "var(--mono)",
                  marginBottom: 10,
                }}
              >
                {group.label}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {group.options.map((option) => {
                  const isSelected = selected === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => toggle(group.key, option)}
                      aria-pressed={isSelected}
                      style={{
                        borderRadius: 2,
                        padding: "6px 14px",
                        fontSize: 11,
                        letterSpacing: ".08em",
                        cursor: "pointer",
                        fontFamily: "var(--mono)",
                        textTransform: "uppercase",
                        background: isSelected ? "var(--purple-900)" : "transparent",
                        color: isSelected ? "var(--cream)" : "var(--ink-soft)",
                        border: isSelected
                          ? "1px solid var(--purple-900)"
                          : "1px solid var(--line)",
                        transition:
                          "background 200ms ease, color 200ms ease, border-color 200ms ease",
                      }}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <p style={{ color: "var(--err)", fontSize: 12, marginTop: 16 }}>{error}</p>
      )}

      <div style={{ marginTop: 24 }}>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={onSave}
          disabled={pending}
          style={{ minWidth: 160 }}
        >
          {saved ? "✓ Saved" : pending ? "Saving…" : "Save preferences"}
        </button>
      </div>
    </section>
  );
}
