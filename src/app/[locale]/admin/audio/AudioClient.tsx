"use client";

import { useState, type ChangeEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { saveAudioFile, clearAudioFile } from "@/lib/actions/audio";
// audio-shared, not audio-settings: the latter imports the postgres client,
// which must never reach a "use client" bundle.
import { AUDIO_KINDS, type AudioKind, type AudioSettings } from "@/lib/audio-shared";
import Icon from "@/components/storefront/Icon";

const MAX_BYTES = 250 * 1024;
const ACCEPT = "audio/ogg,audio/mpeg,.ogg,.mp3";

const KIND_COPY: Record<AudioKind, { name: string; when: string }> = {
  gong: { name: "Gong", when: "First user gesture after arriving — the maison's doorbell." },
  chime: { name: "Chime", when: "Unmuting sound — a small confirmation." },
  seal: { name: "Seal", when: "Route transitions — the wax-seal press." },
};

/**
 * Upload UI for the three ambient sounds (EXECUTION-PLAN 4.2). Files go
 * browser-direct to the `audio` bucket with the admin's session JWT
 * (RLS gates on the `settings` permission), then the URL is recorded via
 * the server action. While no file is uploaded the storefront keeps the
 * synthesised WebAudio tone — "Reset to synth" is the one-click rollback.
 */
export default function AudioClient({ initial }: { initial: AudioSettings }) {
  const [settings, setSettings] = useState<AudioSettings>(initial);
  const [busyKind, setBusyKind] = useState<AudioKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onPick = async (kind: AudioKind, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setError(`${file.name} is over the 250 KB limit.`);
      return;
    }
    if (!["audio/ogg", "audio/mpeg"].includes(file.type)) {
      setError("Only .ogg or .mp3 files are accepted.");
      return;
    }
    setError(null);
    setBusyKind(kind);
    try {
      const sb = createSupabaseBrowserClient();
      // Extension from the MIME type, not the filename — a renamed mp3 keeps
      // an honest storage path.
      const ext = file.type === "audio/mpeg" ? "mp3" : "ogg";
      const path = `${kind}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await sb.storage
        .from("audio")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) {
        setError(`${file.name}: ${upErr.message}`);
        return;
      }
      const { data: urlData } = sb.storage.from("audio").getPublicUrl(path);
      const result = await saveAudioFile({
        kind,
        url: urlData.publicUrl,
        path,
        label: file.name,
        sizeBytes: file.size,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSettings((s) => ({
        ...s,
        [kind]: { url: urlData.publicUrl, path, label: file.name, uploadedAt: new Date().toISOString() },
      }));
    } finally {
      setBusyKind(null);
    }
  };

  const onClear = async (kind: AudioKind) => {
    setError(null);
    setBusyKind(kind);
    try {
      const result = await clearAudioFile(kind);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSettings((s) => ({ ...s, [kind]: null }));
    } finally {
      setBusyKind(null);
    }
  };

  return (
    <>
      <h1 className="admin-h1">Ambient audio</h1>
      <p className="admin-sub">
        The storefront&apos;s three ambient cues. Without an upload each one is synthesised in the
        browser — upload a curated recording (.ogg or .mp3, ≤ 250 KB, CC0 or commissioned) to
        replace it. Keep the licence note in the file name.
      </p>

      {error && <p style={{ color: "var(--err)", fontSize: 13, marginBottom: 12 }}>{error}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {AUDIO_KINDS.map((kind) => {
          const file = settings[kind];
          const busy = busyKind === kind;
          return (
            <div key={kind} className="panel">
              <h3 style={{ marginBottom: 2 }}>{KIND_COPY[kind].name}</h3>
              <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 0, marginBottom: 12 }}>
                {KIND_COPY[kind].when}
              </p>

              {file ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ fontSize: 12, fontFamily: "var(--mono)", wordBreak: "break-all" }}>
                    {file.label || file.path}
                  </div>
                  {/* Native controls double as the preview player. */}
                  <audio controls preload="none" src={file.url} style={{ width: "100%" }} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <label className="btn btn-ghost btn-sm" style={{ cursor: "pointer" }}>
                      {busy ? "Working…" : "Replace"}
                      <input type="file" accept={ACCEPT} hidden disabled={busy} onChange={(e) => onPick(kind, e)} />
                    </label>
                    <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => onClear(kind)}>
                      Reset to synth
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ fontSize: 12, color: "var(--ink-soft)", display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon name="feather" size={14} /> Using the synthesised tone
                  </div>
                  <label className="btn btn-primary btn-sm" style={{ cursor: "pointer", alignSelf: "start" }}>
                    {busy ? "Uploading…" : "Upload recording"}
                    <input type="file" accept={ACCEPT} hidden disabled={busy} onChange={(e) => onPick(kind, e)} />
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 16 }}>
        Changes reach the storefront on the next page load. Sounds stay consent-gated and muted
        by default — uploading a file never makes the site louder, only nicer once a visitor
        opts in.
      </p>
    </>
  );
}
