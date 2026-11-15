"use client";

import { useState, useTransition, type ChangeEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { updateMoments } from "@/lib/actions/moments";
import type { Moments } from "@/lib/moments";
import Icon from "@/components/storefront/Icon";

const MAX_BYTES = 3 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

interface Props {
  initial: Moments;
}

/** ISO (UTC) to the value of an <input type="datetime-local"> in the admin's own clock. */
function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function localInputToIso(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * The home page's "Moments" band (lib/moments.ts): one campaign at a time, with an optional
 * window so the next one can be set up ahead. Sits on the Editorial page beside the
 * announcement bar.
 */
export default function MomentsEditor({ initial }: Props) {
  const [m, setM] = useState<Moments>(initial);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof Moments>(key: K, value: Moments[K]) => setM((prev) => ({ ...prev, [key]: value }));

  const onImage = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_BYTES) { setError("The picture is over 3 MB."); return; }
    const ext = TYPES[file.type];
    if (!ext) { setError("Please use a JPG, PNG or WebP picture."); return; }
    setError(null);
    setUploading(true);
    try {
      const sb = createSupabaseBrowserClient();
      const path = `moments/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await sb.storage.from("product-images").upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw new Error(upErr.message);
      set("image", sb.storage.from("product-images").getPublicUrl(path).data.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const onSave = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateMoments(m);
      if (result.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); } else setError(result.error);
    });
  };

  const text = (key: keyof Moments, label: string, rows = 1, bn = false) => (
    <div className="field">
      <label>{label}</label>
      <textarea rows={rows} value={String(m[key] ?? "")} lang={bn ? "bn" : undefined} onChange={(e) => set(key, e.target.value as never)} />
    </div>
  );

  return (
    <div className="panel" style={{ marginBottom: 20 }}>
      <h3>Moments (home page campaign)</h3>
      <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: -4, marginBottom: 14 }}>
        One campaign at a time, under the shelf on the home page. Mark one phrase of the title with &lt;em&gt;…&lt;/em&gt; for the accent colour.
        &quot;{"{cutoff}"}&quot; becomes the same-day cutoff (2 PM). Links stay inside the site, like /occasion/anniversary or #shelf.
      </p>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 14 }}>
        <input type="checkbox" checked={m.enabled} onChange={(e) => set("enabled", e.target.checked)} /> Show the band
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 14, alignItems: "start", marginBottom: 12 }}>
        <div style={{ width: 120, aspectRatio: "9 / 16", background: "var(--purple-950)", overflow: "hidden" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- admin preview */}
          <img src={m.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
        <div>
          <label className="btn btn-ghost btn-sm" style={{ cursor: uploading ? "wait" : "pointer" }}>
            {uploading ? "Uploading…" : "Change picture (tall, 9:16)"}
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onImage} disabled={uploading} style={{ display: "none" }} />
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
            {text("imageAltEn", "Picture description: EN")}
            {text("imageAltBn", "Picture description: বাংলা", 1, true)}
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {text("titleEn", "Title: EN", 2)}
        {text("titleBn", "Title: বাংলা", 2, true)}
        {text("bodyEn", "Text: EN", 2)}
        {text("bodyBn", "Text: বাংলা", 2, true)}
        {text("ctaEn", "Button: EN")}
        {text("ctaBn", "Button: বাংলা", 1, true)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 12 }}>
        {text("href", "Button link")}
        <div className="field"><label>Show from</label><input type="datetime-local" value={isoToLocalInput(m.startAt)} onChange={(e) => set("startAt", localInputToIso(e.target.value))} /></div>
        <div className="field"><label>Until</label><input type="datetime-local" value={isoToLocalInput(m.endAt)} onChange={(e) => set("endAt", localInputToIso(e.target.value))} /></div>
      </div>
      {error && <p style={{ color: "var(--err)", fontSize: 13, marginTop: 8 }}>{error}</p>}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12 }}>
        <button className="btn btn-primary btn-sm" onClick={onSave} disabled={pending || uploading}>{pending ? "Saving…" : "Save the band"}</button>
        <span className={"saved-ind " + (saved ? "in" : "")} role="status" aria-live="polite">{saved && <><Icon name="check" size={12} /> Saved</>}</span>
      </div>
    </div>
  );
}
