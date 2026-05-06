"use client";

import { useState, useTransition } from "react";
import { updateProfile } from "@/lib/actions/profile";

type Props = {
  initialName: string;
  initialPhone: string;
  initialMarketing: boolean;
};

export default function ProfileEditor({ initialName, initialPhone, initialMarketing }: Props) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [marketing, setMarketing] = useState(initialMarketing);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSave = () => {
    if (!name.trim()) { setError("Full name is required."); return; }
    setError(null);
    startTransition(async () => {
      const r = await updateProfile({ fullName: name.trim(), phone: phone.trim(), acceptsMarketing: marketing });
      if (r.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
      else setError("Could not save changes. Please try again.");
    });
  };

  return (
    <section style={{ marginTop: 48, paddingTop: 40, borderTop: "1px solid var(--line)" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, letterSpacing: ".18em", color: "var(--gold-text)", textTransform: "uppercase", fontFamily: "var(--mono)", marginBottom: 4 }}>
          Account details
        </div>
        <h2 className="serif" style={{ fontSize: 28, color: "var(--purple-900)", fontWeight: 500, margin: 0 }}>
          Profile
        </h2>
      </div>

      <div className="row">
        <div className="field">
          <label>Full name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
          />
        </div>
        <div className="field">
          <label>Phone</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+8801XXXXXXXXX"
          />
        </div>
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, cursor: "pointer", fontSize: 13, color: "var(--ink-soft)" }}>
        <input
          type="checkbox"
          checked={marketing}
          onChange={(e) => setMarketing(e.target.checked)}
          style={{ accentColor: "var(--mauve)", width: 16, height: 16 }}
        />
        Receive Maison seasonal notes &amp; new arrivals
      </label>

      {error && (
        <p style={{ color: "var(--err)", fontSize: 12, marginTop: 10 }}>{error}</p>
      )}

      <div style={{ marginTop: 20 }}>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={onSave}
          disabled={pending}
          style={{ minWidth: 140 }}
        >
          {saved ? "✓ Saved" : pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </section>
  );
}
