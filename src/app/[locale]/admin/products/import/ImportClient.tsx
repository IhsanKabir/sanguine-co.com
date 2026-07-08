"use client";

import { useState, useTransition, type ChangeEvent } from "react";
import { importProductsCsv, type ImportPreview } from "@/lib/actions/product-import";
import { Link } from "@/i18n/routing";
import Icon from "@/components/storefront/Icon";

const TEMPLATE = [
  ["sku", "name", "name_bn", "segment_id", "price_bdt", "was_bdt", "stock", "tag", "description", "description_bn", "colors", "sizes"],
  ["VEL-001", "Plum velvet opera coat", "মেইসন কোট", "clothing", "12500", "", "3", "limited", "Hand-finished velvet, cropped at the waist.", "হাতে সম্পন্ন ভেলভেট, কোমর পর্যন্ত।", "Aubergine,Obsidian", "S,M,L"],
  ["IRS-050", "Iris and rain · 50ml", "আইরিস ও বৃষ্টি · ৫০মিলি", "perfume", "8500", "", "12", "new", "Iris, vetiver, the smell of rain on stone.", "আইরিস, ভেটিভার, পাথরে বৃষ্টির গন্ধ।", "", ""],
];

export default function ImportClient() {
  const [csv, setCsv] = useState("");
  const [filename, setFilename] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmApply, setConfirmApply] = useState(false);
  const [pending, startTransition] = useTransition();

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2_000_000) { setError("File is over 2 MB. Split it into multiple uploads."); return; }
    const text = await f.text();
    setCsv(text);
    setFilename(f.name);
    setPreview(null);
    setError(null);
  };

  const dryRun = () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await importProductsCsv({ csv, commit: false });
        setPreview(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Import failed.");
      }
    });
  };

  const commit = () => {
    if (!preview) return;
    setConfirmApply(true);
  };

  const doApply = () => {
    setConfirmApply(false);
    setError(null);
    startTransition(async () => {
      try {
        const result = await importProductsCsv({ csv, commit: true });
        setPreview(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Commit failed.");
      }
    });
  };

  const downloadTemplate = () => {
    const csvText = TEMPLATE.map((row) => row.map((v) => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v).join(",")).join("\r\n") + "\r\n";
    const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sanguine-products-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", marginBottom: 18 }}>
        <div>
          <h1 className="admin-h1">Bulk import products</h1>
          <p className="admin-sub">Upload a CSV to create or update many products at once. Existing SKUs are updated; new SKUs become new pieces.</p>
        </div>
        <Link href="/admin/products" className="btn btn-ghost btn-sm">Back to products</Link>
      </div>

      <div className="panel" style={{ padding: 18, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <label className="btn btn-ghost btn-sm" style={{ cursor: "pointer" }}>
            <Icon name="plus" size={12} /> Choose CSV
            <input type="file" accept=".csv,text/csv" onChange={onFile} style={{ display: "none" }} />
          </label>
          {filename && <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>Selected: <b>{filename}</b></span>}
          <button type="button" className="btn btn-ghost btn-sm" onClick={downloadTemplate}>
            <Icon name="arrow" size={12} /> Download template
          </button>
        </div>
        <div style={{ marginTop: 14 }}>
          <details>
            <summary style={{ cursor: "pointer", fontSize: 12, color: "var(--ink-soft)" }}>Required + optional columns</summary>
            <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 8, lineHeight: 1.7 }}>
              <p style={{ margin: 0 }}><b>Required:</b> sku, name, segment_id, price_bdt, stock</p>
              <p style={{ margin: "4px 0" }}>
                <b>Optional:</b> name_bn, was_bdt, tag (new / sale / limited / staff-pick), description, description_bn, colors (comma-separated), sizes (comma-separated)
              </p>
              <p style={{ margin: "4px 0" }}>
                <b>SKU rule:</b> if a row&rsquo;s SKU already exists, the existing piece is <b>updated</b>. Otherwise a new piece is <b>created</b>.
              </p>
            </div>
          </details>
        </div>
        {csv && (
          <div style={{ marginTop: 14, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button type="button" className="btn btn-primary btn-sm" onClick={dryRun} disabled={pending}>
              {pending ? "Checking…" : "Check (dry run)"}
            </button>
            {preview && preview.validRows > 0 && !preview.committed && (
              confirmApply ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                  <span style={{ color: "var(--ink-soft)" }}>Apply {preview.toCreate} new, {preview.toUpdate} updated — cannot be undone</span>
                  <button type="button" className="btn btn-primary btn-sm" onClick={doApply} style={{ padding: "3px 10px" }}>Confirm</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmApply(false)} style={{ padding: "3px 8px" }}>Cancel</button>
                </span>
              ) : (
                <button type="button" className="btn btn-sm" style={{ background: "var(--gold-deep)", color: "white", border: "none" }} onClick={commit} disabled={pending}>
                  {pending ? "Importing…" : `Apply (${preview.toCreate} new, ${preview.toUpdate} updated)`}
                </button>
              )
            )}
          </div>
        )}
        {error && <p style={{ color: "var(--err)", fontSize: 13, marginTop: 12 }}>{error}</p>}
      </div>

      {preview && (
        <>
          <div className="stat-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
            <div className="stat kpi"><div className="kpi-top"><div className="k">Total rows</div></div><div className="v">{preview.totalRows}</div></div>
            <div className="stat kpi"><div className="kpi-top"><div className="k">Valid</div></div><div className="v" style={{ color: preview.validRows > 0 ? "inherit" : "var(--err)" }}>{preview.validRows}</div></div>
            <div className="stat kpi"><div className="kpi-top"><div className="k">To create</div></div><div className="v">{preview.toCreate}</div></div>
            <div className="stat kpi"><div className="kpi-top"><div className="k">To update</div></div><div className="v">{preview.toUpdate}</div></div>
          </div>

          {preview.committed && (
            <div style={{ padding: 16, background: "#eef7ee", border: "1px solid #4caf50", marginTop: 16, fontSize: 14 }}>
              <b>Imported.</b> {preview.toCreate} created, {preview.toUpdate} updated. Visit{" "}
              <Link href="/admin/products" style={{ color: "#2e7d32", fontWeight: 500 }}>products</Link> to verify.
            </div>
          )}

          {preview.errors.length > 0 && (
            <div className="panel" style={{ padding: 16, marginTop: 16, borderColor: "var(--err)" }}>
              <h3 style={{ margin: "0 0 10px", color: "var(--err)", fontSize: 16 }}>Issues ({preview.errors.length})</h3>
              <ul style={{ paddingLeft: 22, margin: 0, fontSize: 13, color: "var(--err)", maxHeight: 220, overflow: "auto" }}>
                {preview.errors.map((e, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>
                    {e.row === 0 ? <b>Header:</b> : <>Row <b>{e.row}</b>:</>} {e.messages.join("; ")}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {preview.preview.length > 0 && (
            <div className="table" style={{ marginTop: 16 }}>
              <table>
                <thead>
                  <tr><th>Row</th><th>SKU</th><th>Name</th><th>Segment</th><th>Price</th><th>Stock</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {preview.preview.map((p) => (
                    <tr key={p.rowIndex}>
                      <td style={{ fontSize: 11, color: "var(--ink-soft)" }}>{p.rowIndex}</td>
                      <td className="mono" style={{ fontSize: 11 }}>{p.sku}</td>
                      <td>{p.name}</td>
                      <td>{p.segmentId}</td>
                      <td>৳{p.priceBdt.toLocaleString("en-IN")}</td>
                      <td>{p.stock}</td>
                      <td>
                        {p.errors.length > 0
                          ? <span className="pill pill-err">{p.errors.length} issue{p.errors.length === 1 ? "" : "s"}</span>
                          : <span className="pill pill-ok">ok</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.totalRows > preview.preview.length && (
                <p style={{ fontSize: 11, color: "var(--ink-soft)", padding: 10, margin: 0 }}>
                  Showing first {preview.preview.length} of {preview.totalRows} rows.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}
