"use client";

import { useState, useTransition, type FormEvent, type ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { createPreorderRequest } from "@/lib/actions/preorders";
import Icon from "@/components/storefront/Icon";

type Props = {
  segmentId: string;
  segmentName: string;
  userId: string;
  userEmail: string;
};

type AllowedMime =
  | "image/jpeg" | "image/png" | "image/webp" | "image/gif"
  | "video/mp4" | "video/quicktime" | "video/webm";

const ALLOWED_MIMES: AllowedMime[] = [
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "video/mp4", "video/quicktime", "video/webm",
];

type LocalAttachment = {
  url: string;
  path: string;
  type: "image" | "video";
  sizeBytes: number;
  mime: AllowedMime;
  fileName: string;
};

const MAX_FILES = 5;
const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm";

export default function RequestForm({ segmentId, segmentName, userId, userEmail }: Props) {
  const t = useTranslations();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [budgetHint, setBudgetHint] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [line1, setLine1] = useState("");
  const [area, setArea] = useState("");
  const [city, setCity] = useState("Dhaka");
  const [postcode, setPostcode] = useState("");

  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const onFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // reset so the same file can be re-picked after removal

    if (attachments.length + files.length > MAX_FILES) {
      setUploadError(t("bespoke.errMaxFiles", { max: MAX_FILES }));
      return;
    }
    setUploadError(null);

    const oversized = files.find((f) => f.size > MAX_BYTES);
    if (oversized) {
      setUploadError(t("bespoke.errTooBig", { name: oversized.name }));
      return;
    }

    setUploading(true);
    try {
      const sb = createSupabaseBrowserClient();
      const next: LocalAttachment[] = [];
      for (const file of files) {
        // Reject any mime not in the bucket policy whitelist before upload.
        const mimeMaybe = file.type as AllowedMime;
        if (!ALLOWED_MIMES.includes(mimeMaybe)) {
          setUploadError(t("bespoke.errType", { name: file.name, type: file.type || t("bespoke.unknownType") }));
          break;
        }
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
        const id = crypto.randomUUID();
        const path = `${userId}/${id}.${ext}`;
        const { error: upErr } = await sb.storage
          .from("preorder-attachments")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) {
          setUploadError(t("bespoke.errUpload", { name: file.name, message: upErr.message }));
          break;
        }
        const { data: urlData } = await sb.storage
          .from("preorder-attachments")
          .createSignedUrl(path, 60 * 60 * 24 * 7); // 7 day signed url for the customer's preview
        next.push({
          url: urlData?.signedUrl ?? "",
          path,
          type: file.type.startsWith("video") ? "video" : "image",
          sizeBytes: file.size,
          mime: mimeMaybe,
          fileName: file.name,
        });
      }
      setAttachments((prev) => [...prev, ...next]);
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = async (idx: number) => {
    const item = attachments[idx];
    if (!item) return;
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
    try {
      const sb = createSupabaseBrowserClient();
      await sb.storage.from("preorder-attachments").remove([item.path]);
    } catch { /* best-effort cleanup */ }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const result = await createPreorderRequest({
          segmentId,
          description: description.trim(),
          quantity: Math.max(1, Math.min(50, quantity)),
          budgetHintBdt: budgetHint ? parseInt(budgetHint, 10) : null,
          targetDate: targetDate || null,
          customerName: name.trim(),
          customerPhone: phone.trim() || null,
          deliveryAddress: line1.trim()
            ? { line1: line1.trim(), area: area.trim() || null, city: city.trim(), postcode: postcode.trim() || null }
            : null,
          attachments: attachments.map(({ fileName: _f, ...rest }) => rest),
        });
        if (result.ok) setDone(true);
        else setError(result.error);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("common.genericError"));
      }
    });
  };

  if (done) {
    return (
      <div style={{ padding: 32, background: "#f9f4ec", border: "1px solid var(--gold-deep)" }}>
        <h2 className="serif" style={{ fontSize: 32, color: "var(--purple-900)", margin: 0 }}>{t("bespoke.doneTitle")}</h2>
        <p style={{ fontSize: 15, color: "var(--ink-soft)", lineHeight: 1.7, margin: "12px 0 0" }}>
          {t.rich("bespoke.doneBody", { segment: segmentName, email: userEmail, em: (c) => <em>{c}</em>, b: (c) => <b>{c}</b> })}
        </p>
        <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 18 }}>{t("bespoke.doneNote")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 18 }}>
      {/* Identity */}
      <div className="row">
        <div className="field">
          <label>{t("preorderForm.yourName")}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required minLength={1} maxLength={120} placeholder={t("preorderForm.namePlaceholder")} />
        </div>
        <div className="field">
          <label>{t("preorderForm.phoneCallback")}</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+8801XXXXXXXXX" />
        </div>
      </div>

      {/* The request itself */}
      <div className="field">
        <label>{t("bespoke.what")}</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          minLength={10}
          maxLength={4000}
          rows={6}
          placeholder={t("bespoke.whatPlaceholder")}
          style={{ width: "100%", padding: 12, fontFamily: "inherit", fontSize: 14, lineHeight: 1.6, border: "1px solid var(--line)", background: "white", resize: "vertical" }}
        />
        <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 4 }}>{description.length} / 4000</div>
      </div>

      {/* Attachments */}
      <div>
        <label style={{ fontSize: 11, letterSpacing: ".15em", color: "var(--ink-soft)", textTransform: "uppercase" }}>{t("bespoke.references")}</label>
        <div style={{ marginTop: 8, padding: 16, border: "1px dashed var(--line)", background: "#fcfaf6" }}>
          {attachments.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 12 }}>
              {attachments.map((a, i) => (
                <div key={a.path} style={{ position: "relative", aspectRatio: "1", border: "1px solid var(--line)", overflow: "hidden", background: "white" }}>
                  {a.type === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.url} alt={a.fileName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <video src={a.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />
                  )}
                  <button
                    type="button"
                    onClick={() => removeAttachment(i)}
                    aria-label={t("bespoke.removeFile", { name: a.fileName })}
                    style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", border: "none", background: "rgba(0,0,0,.6)", color: "white", cursor: "pointer", fontSize: 14, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          {attachments.length < MAX_FILES && (
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 16px", border: "1px solid var(--purple-900)", color: "var(--purple-900)", cursor: uploading ? "wait" : "pointer", fontSize: 13, letterSpacing: ".05em" }}>
              <Icon name="plus" size={14} />
              {uploading ? t("bespoke.uploading") : (attachments.length === 0 ? t("bespoke.addReferences") : t("bespoke.addMore"))}
              <input type="file" multiple accept={ACCEPT} onChange={onFileChange} disabled={uploading} style={{ display: "none" }} />
            </label>
          )}
          {uploadError && <p style={{ color: "var(--err)", fontSize: 13, marginTop: 8 }}>{uploadError}</p>}
        </div>
      </div>

      {/* Logistics */}
      <div className="row">
        <div className="field">
          <label>{t("common.quantity")}</label>
          <input type="number" min={1} max={50} value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} />
        </div>
        <div className="field">
          <label>{t("bespoke.budget")}</label>
          <input type="number" min={0} value={budgetHint} onChange={(e) => setBudgetHint(e.target.value)} placeholder={t("bespoke.budgetPlaceholder")} />
        </div>
        <div className="field">
          <label>{t("bespoke.wantedBy")}</label>
          <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
        </div>
      </div>

      {/* Delivery address (optional — admin will follow up if missing) */}
      <div>
        <label style={{ fontSize: 11, letterSpacing: ".15em", color: "var(--ink-soft)", textTransform: "uppercase" }}>{t("preorderForm.addressOptionalCall")}</label>
        <div style={{ marginTop: 8, display: "grid", gap: 10 }}>
          <div className="field">
            <input value={line1} onChange={(e) => setLine1(e.target.value)} placeholder={t("preorderForm.line1Placeholder")} />
          </div>
          <div className="row">
            <div className="field">
              <input value={area} onChange={(e) => setArea(e.target.value)} placeholder={t("preorderForm.areaPlaceholder")} />
            </div>
            <div className="field">
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder={t("preorderForm.cityPlaceholder")} />
            </div>
            <div className="field">
              <input value={postcode} onChange={(e) => setPostcode(e.target.value)} placeholder={t("preorderForm.postcodePlaceholder")} />
            </div>
          </div>
        </div>
      </div>

      {error && <p style={{ color: "var(--err)", fontSize: 13 }}>{error}</p>}

      <div style={{ borderTop: "1px solid var(--line)", paddingTop: 18, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: 0 }}>{t("bespoke.payNote")}</p>
        <button type="submit" className="btn btn-primary" disabled={pending || uploading} style={{ minWidth: 220 }}>
          {pending ? t("preorderForm.sending") : t("bespoke.submit")}
        </button>
      </div>
    </form>
  );
}
