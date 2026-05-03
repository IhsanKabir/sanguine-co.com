"use client";

import { useState, useEffect, useTransition, type ChangeEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  recordProductImage,
  deleteProductImage,
  updateProductImageAlt,
  reorderProductImages,
  listProductImages,
} from "@/lib/actions/product-images";
import type { ProductImage } from "@/lib/schema";
import Icon from "@/components/storefront/Icon";

const MAX_IMAGES = 5;
const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/avif,image/gif";

type Props = {
  productId: string;
  productSku: string;
};

export default function ProductImagesEditor({ productId, productSku }: Props) {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelId, setConfirmDelId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const refresh = async () => {
    setLoading(true);
    try {
      const rows = await listProductImages(productId);
      setImages(rows);
    } catch {
      setError("Could not load images.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const onPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (images.length + files.length > MAX_IMAGES) {
      setError(`Maximum ${MAX_IMAGES} images per product.`);
      return;
    }
    const oversized = files.find((f) => f.size > MAX_BYTES);
    if (oversized) {
      setError(`${oversized.name} is over 8 MB.`);
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const sb = createSupabaseBrowserClient();
      for (const file of files) {
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const id = crypto.randomUUID();
        const path = `${productId}/${id}.${ext}`;
        const { error: upErr } = await sb.storage
          .from("product-images")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) {
          setError(`${file.name}: ${upErr.message}`);
          break;
        }
        const { data: urlData } = sb.storage.from("product-images").getPublicUrl(path);
        const result = await recordProductImage({
          productId,
          url: urlData.publicUrl,
          path,
          alt: `${productSku} — ${file.name.split(".")[0]}`,
        });
        if (!result.ok) {
          setError(result.error ?? "Could not record image.");
          break;
        }
      }
      await refresh();
    } finally {
      setUploading(false);
    }
  };

  const onDelete = (id: string) => {
    setConfirmDelId(id);
  };

  const doDelete = (id: string) => {
    setConfirmDelId(null);
    startTransition(async () => {
      await deleteProductImage(id);
      await refresh();
    });
  };

  const onMoveUp = (idx: number) => {
    if (idx === 0) return;
    const next = [...images];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    setImages(next);
    startTransition(async () => {
      await reorderProductImages({ productId, orderedIds: next.map((x) => x.id) });
    });
  };

  const onMoveDown = (idx: number) => {
    if (idx === images.length - 1) return;
    const next = [...images];
    [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
    setImages(next);
    startTransition(async () => {
      await reorderProductImages({ productId, orderedIds: next.map((x) => x.id) });
    });
  };

  const onAltChange = (id: string, alt: string) => {
    setImages((prev) => prev.map((i) => (i.id === id ? { ...i, alt } : i)));
  };

  const onAltBlur = (id: string, alt: string) => {
    startTransition(async () => {
      await updateProductImageAlt({ id, alt });
    });
  };

  return (
    <div style={{ marginTop: 16, padding: 16, background: "#fcfaf6", border: "1px solid var(--line)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <label style={{ fontSize: 11, letterSpacing: ".15em", color: "var(--ink-soft)", textTransform: "uppercase" }}>
          Photographs ({images.length} / {MAX_IMAGES})
        </label>
        {images.length < MAX_IMAGES && (
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", border: "1px solid var(--purple-900)", color: "var(--purple-900)", cursor: uploading ? "wait" : "pointer", fontSize: 12, letterSpacing: ".05em" }}>
            <Icon name="plus" size={12} />
            {uploading ? "Uploading…" : "Add photo"}
            <input type="file" multiple accept={ACCEPT} onChange={onPick} disabled={uploading} style={{ display: "none" }} />
          </label>
        )}
      </div>

      {loading ? (
        <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: 0 }}>Loading…</p>
      ) : images.length === 0 ? (
        <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: 0, lineHeight: 1.6 }}>
          No photographs yet. Until you add one, the product will render with the maison&apos;s composition art as a placeholder.
          The first photo becomes the hero on the product page.
        </p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {images.map((img, i) => (
            <div key={img.id} style={{ display: "grid", gridTemplateColumns: "60px 1fr auto", gap: 10, alignItems: "center", padding: 6, background: "white", border: "1px solid var(--line)" }}>
              <div style={{ width: 60, height: 60, overflow: "hidden", border: "1px solid var(--line)", background: "#f4ecd8" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.alt ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--ink-soft)", marginBottom: 2 }}>
                  {i === 0 ? <b style={{ color: "var(--gold-deep)" }}>HERO</b> : `Photo ${i + 1}`}
                </div>
                <input
                  type="text"
                  value={img.alt ?? ""}
                  onChange={(e) => onAltChange(img.id, e.target.value)}
                  onBlur={(e) => onAltBlur(img.id, e.target.value)}
                  placeholder="Describe this photograph (alt text for accessibility & SEO)"
                  maxLength={200}
                  style={{ width: "100%", padding: "6px 8px", fontSize: 12, border: "1px solid var(--line)", fontFamily: "inherit" }}
                />
              </div>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <button type="button" className="icon-btn" title="Move up" onClick={() => onMoveUp(i)} disabled={i === 0}>↑</button>
                <button type="button" className="icon-btn" title="Move down" onClick={() => onMoveDown(i)} disabled={i === images.length - 1}>↓</button>
                {confirmDelId === img.id ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                    <span style={{ color: "var(--ink-soft)" }}>Remove?</span>
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => doDelete(img.id)} style={{ padding: "3px 10px" }}>Yes</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmDelId(null)} style={{ padding: "3px 8px" }}>Cancel</button>
                  </span>
                ) : (
                  <button type="button" className="icon-btn" title="Delete" onClick={() => onDelete(img.id)}>
                    <Icon name="x" size={12} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <p style={{ color: "var(--err)", fontSize: 12, marginTop: 8 }}>{error}</p>}
    </div>
  );
}
