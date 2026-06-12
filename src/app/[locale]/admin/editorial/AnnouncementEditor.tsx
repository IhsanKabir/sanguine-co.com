"use client";

import { useState, useTransition } from "react";
import { updateAnnouncement } from "@/lib/actions/announcement";
import type { Announcement } from "@/lib/announcement";
import Icon from "@/components/storefront/Icon";

type Props = { initial: Announcement | null };

const EMPTY: Announcement = {
  enabled: false,
  textEn: "",
  textBn: "",
  startAt: null,
  endAt: null,
  dismissible: true,
  tone: "neutral",
};

/** ISO (UTC) → value for <input type="datetime-local"> in the admin's TZ. */
function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * datetime-local value → ISO UTC. Empty → null.
 * `new Date("YYYY-MM-DDTHH:MM")` parses in the BROWSER's OS timezone — which
 * is Asia/Dhaka only if the curator's machine is set that way. The hint text
 * under the form states this; a fixed-TZ conversion (Temporal/date-fns-tz)
 * is the upgrade path if remote admins ever schedule announcements.
 */
function localInputToIso(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Scheduled announcement panel (EXECUTION-PLAN 4.3) on the Editorial page.
 * Sits above the copy library: when disabled, the storefront keeps showing
 * the static `topbar.announcement` string that the library already edits.
 */
export default function AnnouncementEditor({ initial }: Props) {
  const [a, setA] = useState<Announcement>(initial ?? EMPTY);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof Announcement>(key: K, value: Announcement[K]) =>
    setA((prev) => ({ ...prev, [key]: value }));

  const onSave = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateAnnouncement(a);
      if (result.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        setError(result.error);
      }
    });
  };

  const windowHint =
    !a.startAt && !a.endAt
      ? "No window set — shows continuously while enabled."
      : "Times are interpreted in your browser's OS timezone (set your machine to Asia/Dhaka) and stored as UTC.";

  return (
    <div className="panel" style={{ marginBottom: 20 }}>
      <h3>Announcement bar</h3>
      <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: -4, marginBottom: 14 }}>
        Scheduled message across the very top of the storefront. While this is off, the static
        “Announcement bar” string from the copy library below is shown instead.
      </p>

      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 14 }}>
        <input
          type="checkbox"
          checked={a.enabled}
          onChange={(e) => set("enabled", e.target.checked)}
        />
        Enable scheduled announcement
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div className="field">
          <label>Text — EN</label>
          <textarea
            rows={2}
            maxLength={200}
            value={a.textEn}
            onChange={(e) => set("textEn", e.target.value)}
            placeholder="Eid collection ships free until Thursday"
          />
        </div>
        <div className="field">
          <label>Text — বাংলা</label>
          <textarea
            rows={2}
            maxLength={200}
            value={a.textBn}
            onChange={(e) => set("textBn", e.target.value)}
            lang="bn"
            placeholder="ঈদ কালেকশন — বৃহস্পতিবার পর্যন্ত ফ্রি ডেলিভারি"
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginTop: 12 }}>
        <div className="field">
          <label>Visible from</label>
          <input
            type="datetime-local"
            value={isoToLocalInput(a.startAt)}
            onChange={(e) => set("startAt", localInputToIso(e.target.value))}
          />
        </div>
        <div className="field">
          <label>Until</label>
          <input
            type="datetime-local"
            value={isoToLocalInput(a.endAt)}
            onChange={(e) => set("endAt", localInputToIso(e.target.value))}
          />
        </div>
        <div className="field">
          <label>Tone</label>
          <select value={a.tone} onChange={(e) => set("tone", e.target.value as Announcement["tone"])}>
            <option value="neutral">Neutral (plum)</option>
            <option value="celebration">Celebration (gold)</option>
          </select>
        </div>
        <div className="field" style={{ alignSelf: "end" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <input
              type="checkbox"
              checked={a.dismissible}
              onChange={(e) => set("dismissible", e.target.checked)}
            />
            Visitor can dismiss
          </label>
        </div>
      </div>

      <p style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 8 }}>{windowHint}</p>

      {error && <p style={{ color: "var(--err)", fontSize: 13, marginTop: 8 }}>{error}</p>}

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12 }}>
        <button className="btn btn-primary btn-sm" onClick={onSave} disabled={pending}>
          {pending ? "Saving…" : "Save announcement"}
        </button>
        <span className={"saved-ind " + (saved ? "in" : "")} role="status" aria-live="polite">
          {saved && <><Icon name="check" size={12} /> Saved</>}
        </span>
      </div>
    </div>
  );
}
