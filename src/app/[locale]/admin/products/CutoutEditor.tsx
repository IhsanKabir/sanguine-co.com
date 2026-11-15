"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getCutoutForProduct, removeCutout, saveCutout } from "@/lib/actions/cutouts";
import { prepareCutout } from "@/lib/cutout-prepare";
import type { StoredCutout } from "@/lib/cutout-store";

const MAX_BYTES = 15 * 1024 * 1024;
const BUCKET = "product-images";

interface Props {
  productId: string;
}

/**
 * "Cut-out for the home page": the bouquet with its background removed, which stands in the
 * home page's rail and on the shelf. The browser cleans it (edges, margins, two sizes) and
 * uploads it; without one the product shows its first photo on the shelf.
 */
export default function CutoutEditor({ productId }: Props) {
  const [current, setCurrent] = useState<StoredCutout | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => {
    let live = true;   // a fast switch between products must not show the previous one's cut-out
    setCurrent(null);
    setConfirmRemove(false);
    getCutoutForProduct(productId).then((c) => { if (live) setCurrent(c); }).catch(() => { if (live) setError("Could not load the cut-out."); });
    return () => { live = false; };
  }, [productId]);

  const upload = async (file: File) => {
    const ready = await prepareCutout(file);
    const sb = createSupabaseBrowserClient();
    const id = crypto.randomUUID();
    const put = async (blob: Blob, size: string) => {
      const path = `cutouts/${productId}/${id}-${size}.${ready.ext}`;
      const { error: upErr } = await sb.storage.from(BUCKET).upload(path, blob, { contentType: blob.type, upsert: false });
      if (upErr) throw new Error(upErr.message);
      return { path, url: sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl };
    };
    const uploaded: string[] = [];
    try {
      const large = await put(ready.large, "900");
      uploaded.push(large.path);
      const small = await put(ready.small, "450");
      uploaded.push(small.path);
      const cutout: StoredCutout = { large: large.url, small: small.url, largePath: large.path, smallPath: small.path, width: ready.width, height: ready.height };
      const res = await saveCutout({ productId, cutout });
      if (!res.ok) throw new Error(res.error);
      setCurrent(cutout);
    } catch (err) {
      if (uploaded.length) await sb.storage.from(BUCKET).remove(uploaded);   // leave no half-uploaded files behind
      throw err;
    }
  };

  const onPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_BYTES) { setError("The file is over 15 MB."); return; }
    setError(null);
    setBusy(true);
    try {
      await upload(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The upload failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const onRemove = async () => {
    setConfirmRemove(false);
    setBusy(true);
    try {
      const res = await removeCutout(productId);
      if (!res.ok) throw new Error(res.error);
      setCurrent(null);
    } catch {
      setError("Could not remove the cut-out.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ marginTop: 16, padding: 16, background: "#fcfaf6", border: "1px solid var(--line)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 10 }}>
        <label style={{ fontSize: 11, letterSpacing: ".15em", color: "var(--ink-soft)", textTransform: "uppercase" }}>Cut-out for the home page</label>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", border: "1px solid var(--purple-900)", color: "var(--purple-900)", cursor: busy ? "wait" : "pointer", fontSize: 12 }}>
          {busy ? "Working…" : current ? "Replace" : "Upload cut-out"}
          <input type="file" accept="image/png,image/webp" onChange={onPick} disabled={busy} style={{ display: "none" }} />
        </label>
      </div>
      {current ? (
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <div style={{ width: 120, height: 120, background: "var(--purple-50)", display: "grid", placeItems: "center", border: "1px solid var(--line)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of the uploaded cut-out */}
            <img src={current.small} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
          </div>
          <div style={{ fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.6 }}>
            Shown in the home page&apos;s rail and on the shelf.
            <div style={{ marginTop: 8 }}>
              {confirmRemove ? (
                <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                  Remove it?
                  <button type="button" className="btn btn-primary btn-sm" onClick={onRemove}>Yes</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmRemove(false)}>Cancel</button>
                </span>
              ) : (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmRemove(true)} disabled={busy}>Remove</button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: 0, lineHeight: 1.6 }}>
          A PNG of the bouquet with the background removed (your phone&apos;s &quot;lift subject&quot;, or remove.bg). It is cleaned and
          resized here, then stands in the home page&apos;s rail. Without one, the shelf shows the first photo.
        </p>
      )}
      {error && <p style={{ color: "var(--err)", fontSize: 12, marginTop: 8 }}>{error}</p>}
    </div>
  );
}
