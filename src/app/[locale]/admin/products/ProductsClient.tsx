"use client";

import { useState, useTransition, useRef, useEffect, useMemo } from "react";
import { createProduct, updateProduct, deleteProduct, deleteProducts } from "@/lib/actions/admin";
import type { Segment, Product } from "@/lib/schema";
import Composition from "@/components/storefront/Composition";
import Icon from "@/components/storefront/Icon";
import { formatBdt } from "@/lib/utils";
import ProductImagesEditor from "./ProductImagesEditor";

type Props = { segments: Segment[]; products: Product[] };

function LookPicker({
  selected,
  products,
  currentProductId,
  onChange,
}: {
  selected: string[];
  products: Product[];
  currentProductId?: string;
  onChange: (ids: string[]) => void;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const selectedProducts = useMemo(
    () => selected.map((id) => products.find((p) => p.id === id)).filter((p): p is Product => !!p),
    [selected, products],
  );

  const options = useMemo(
    () =>
      products.filter(
        (p) =>
          p.id !== currentProductId &&
          !selectedSet.has(p.id) &&
          (q === "" ||
            p.name.toLowerCase().includes(q.toLowerCase()) ||
            p.sku.toLowerCase().includes(q.toLowerCase())),
      ),
    [products, currentProductId, selectedSet, q],
  );

  return (
    <div ref={wrapRef}>
      {selectedProducts.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          {selectedProducts.map((p) => (
            <span
              key={p.id}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "3px 8px", background: "var(--purple-50)",
                border: "1px solid var(--line)", fontSize: 12, borderRadius: 2,
              }}
            >
              <span style={{ fontWeight: 500 }}>{p.name}</span>
              <span style={{ color: "var(--ink-soft)", fontSize: 10 }}>{p.sku}</span>
              <button
                type="button"
                onClick={() => onChange(selected.filter((id) => id !== p.id))}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-soft)", padding: "0 0 0 2px", lineHeight: 1, fontSize: 14 }}
                aria-label={`Remove ${p.name}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div style={{ position: "relative" }}>
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search products to add…"
          style={{ width: "100%", padding: "7px 10px", border: "1px solid var(--line)", fontSize: 13, boxSizing: "border-box" }}
        />
        {open && (q || options.length > 0) && (
          <div style={{
            position: "absolute", top: "100%", left: 0, right: 0, zIndex: 200,
            border: "1px solid var(--line)", borderTop: "none",
            background: "white", maxHeight: 200, overflowY: "auto",
            boxShadow: "0 4px 12px rgba(0,0,0,.08)",
          }}>
            {options.length === 0 ? (
              <div style={{ padding: "8px 12px", fontSize: 12, color: "var(--ink-soft)" }}>No matches</div>
            ) : (
              options.slice(0, 10).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); onChange([...selected, p.id]); setQ(""); setOpen(false); }}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    width: "100%", padding: "8px 12px", background: "none", border: "none",
                    cursor: "pointer", fontSize: 13, textAlign: "left", gap: 12,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f9f4ec")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                >
                  <span style={{ fontWeight: 500 }}>{p.name}</span>
                  <span style={{ color: "var(--ink-soft)", fontSize: 11, flexShrink: 0 }}>{p.sku}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

type Editing = {
  id?: string;
  name: string;
  nameBn: string;
  sku: string;
  segmentId: string;
  priceBdt: string;
  wasBdt: string;
  stock: string;
  tag: string;
  description: string;
  descriptionBn: string;
  colors: string;   // comma-separated
  sizes: string;    // comma-separated
  preorderEnabled: boolean;
  preorderOnly: boolean;
  estimatedDelivery: string;
  preorderPriceBdt: string;
  modelNote: string;
  lookProductIds: string[];
};

const empty = (segId: string): Editing => ({
  name: "", nameBn: "", sku: "", segmentId: segId,
  priceBdt: "0", wasBdt: "", stock: "0", tag: "",
  description: "", descriptionBn: "", colors: "", sizes: "",
  preorderEnabled: false, preorderOnly: false,
  estimatedDelivery: "", preorderPriceBdt: "",
  modelNote: "", lookProductIds: [],
});

export default function ProductsClient({ segments, products }: Props) {
  const [editing, setEditing] = useState<Editing | null>(null);
  const [pendingDel, setPendingDel] = useState<Product | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pendingBulkDel, setPendingBulkDel] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [, startTransition] = useTransition();

  const list = useMemo(
    () =>
      products.filter(
        (p) =>
          (filter === "all" || p.segmentId === filter) &&
          p.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [products, filter, search],
  );

  const allVisibleSelected = list.length > 0 && list.every((p) => selected.has(p.id));
  const someSelected = selected.size > 0;

  const toggleAll = () => {
    if (allVisibleSelected) {
      setSelected((prev) => { const next = new Set(prev); list.forEach((p) => next.delete(p.id)); return next; });
    } else {
      setSelected((prev) => { const next = new Set(prev); list.forEach((p) => next.add(p.id)); return next; });
    }
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const onSave = () => {
    if (!editing) return;
    if (!editing.name.trim() || !editing.sku.trim()) return;
    const payload = {
      name: editing.name.trim(),
      nameBn: editing.nameBn || null,
      sku: editing.sku.trim().toUpperCase(),
      segmentId: editing.segmentId,
      priceBdt: parseInt(editing.priceBdt) || 0,
      wasBdt: editing.wasBdt ? parseInt(editing.wasBdt) : null,
      stock: parseInt(editing.stock) || 0,
      tag: editing.tag || null,
      description: editing.description || null,
      descriptionBn: editing.descriptionBn || null,
      colors: editing.colors.split(",").map((s) => s.trim()).filter(Boolean),
      sizes: editing.sizes.split(",").map((s) => s.trim()).filter(Boolean),
      preorderEnabled: editing.preorderEnabled,
      preorderOnly: editing.preorderOnly,
      estimatedDelivery: editing.estimatedDelivery || null,
      preorderPriceBdt: editing.preorderPriceBdt ? parseInt(editing.preorderPriceBdt) : null,
      modelNote: editing.modelNote.trim() || null,
      lookProductIds: editing.lookProductIds,
    };
    startTransition(async () => {
      if (editing.id) await updateProduct(editing.id, payload);
      else await createProduct(payload);
      setEditing(null);
    });
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", marginBottom: 20 }}>
        <div><h1 className="admin-h1">Products</h1><p className="admin-sub">{products.length} pieces across {segments.length} segments.</p></div>
        <div style={{ display: "flex", gap: 8 }}>
          <a href="/admin/products/import" className="btn btn-ghost btn-sm" title="Bulk import from a CSV">
            <Icon name="plus" size={12}/> Import CSV
          </a>
          <button className="btn btn-primary btn-sm" onClick={() => setEditing(empty(segments[0]?.id || "clothing"))}>
            <Icon name="check" size={14}/> New Product
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div className="nav-search" style={{ width: 280 }}>
          <Icon name="search" size={14}/>
          <input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)}/>
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding: "9px 12px", border: "1px solid var(--line)", background: "white", fontSize: 13 }}>
          <option value="all">All segments</option>
          {segments.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {someSelected && (
          <button
            className="btn btn-sm"
            style={{ background: "var(--err)", color: "white", border: "none", marginLeft: "auto" }}
            onClick={() => setPendingBulkDel(true)}
          >
            <Icon name="x" size={12}/> Delete {selected.size} selected
          </button>
        )}
      </div>

      <div className="table">
        <table>
          <thead><tr>
            <th style={{ width: 36 }}>
              <input
                type="checkbox"
                checked={allVisibleSelected}
                ref={(el) => { if (el) el.indeterminate = someSelected && !allVisibleSelected; }}
                onChange={toggleAll}
                aria-label="Select all"
              />
            </th>
            <th>Product</th><th>Segment</th><th>Price</th><th>Stock</th><th>Status</th><th style={{ textAlign: "right" }}>Actions</th>
          </tr></thead>
          <tbody>
            {list.map((p) => {
              const seg = segments.find((s) => s.id === p.segmentId);
              return (
                <tr key={p.id} style={{ background: selected.has(p.id) ? "var(--purple-50)" : undefined }}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggleOne(p.id)}
                      aria-label={`Select ${p.name}`}
                    />
                  </td>
                  <td>
                    <div className="admin-product-cell">
                      <Composition cat={p.segmentId || "clothing"} sku={p.sku} name={p.name} small/>
                      <div><div className="n">{p.name}</div><div className="s">{p.sku}</div></div>
                    </div>
                  </td>
                  <td>{seg?.name || "—"}</td>
                  <td style={{ fontWeight: 500 }}>{formatBdt(p.priceBdt)}</td>
                  <td style={{ color: p.stock < 10 ? "var(--err)" : "inherit", fontWeight: 500 }}>{p.stock}</td>
                  <td>
                    {p.stock === 0 ? <span className="pill pill-err">Out</span>
                      : p.stock < 10 ? <span className="pill pill-warn">Low</span>
                      : <span className="pill pill-ok">Live</span>}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button className="icon-btn" onClick={() => setEditing({
                      id: p.id,
                      name: p.name, nameBn: p.nameBn || "",
                      sku: p.sku, segmentId: p.segmentId || segments[0]?.id || "",
                      priceBdt: String(p.priceBdt), wasBdt: p.wasBdt ? String(p.wasBdt) : "",
                      stock: String(p.stock), tag: p.tag || "",
                      description: p.description || "", descriptionBn: p.descriptionBn || "",
                      colors: ((p.colors as string[] | null) || []).join(", "),
                      sizes:  ((p.sizes as string[] | null) || []).join(", "),
                      preorderEnabled: p.preorderEnabled,
                      preorderOnly: p.preorderOnly,
                      estimatedDelivery: p.estimatedDelivery || "",
                      preorderPriceBdt: p.preorderPriceBdt ? String(p.preorderPriceBdt) : "",
                      modelNote: p.modelNote ?? "",
                      lookProductIds: (p.lookProductIds as string[] | null) ?? [],
                    })}><Icon name="feather" size={14}/></button>
                    <button className="icon-btn" onClick={() => setPendingDel(p)}><Icon name="x" size={14}/></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <>
          <div className="overlay" onClick={() => setEditing(null)}/>
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 640, maxWidth: "calc(100vw - 32px)", maxHeight: "90vh", overflow: "auto", background: "white", zIndex: 101, padding: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 className="serif" style={{ margin: 0, fontSize: 26, color: "var(--purple-900)", fontWeight: 500 }}>
                {editing.id ? "Edit · " + editing.name : "New Product"}
              </h3>
              <button className="icon-btn" onClick={() => setEditing(null)}><Icon name="x"/></button>
            </div>

            <div className="row">
              <div className="field"><label>Name (EN)</label><input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })}/></div>
              <div className="field"><label>Name (বাংলা)</label><input value={editing.nameBn} onChange={(e) => setEditing({ ...editing, nameBn: e.target.value })}/></div>
            </div>
            <div className="row">
              <div className="field"><label>Segment</label>
                <select value={editing.segmentId} onChange={(e) => setEditing({ ...editing, segmentId: e.target.value })}>
                  {segments.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="field"><label>SKU</label><input value={editing.sku} onChange={(e) => setEditing({ ...editing, sku: e.target.value })}/></div>
            </div>
            <div className="row" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr" }}>
              <div className="field"><label>Price (৳)</label><input type="number" value={editing.priceBdt} onChange={(e) => setEditing({ ...editing, priceBdt: e.target.value })}/></div>
              <div className="field"><label>Was (৳)</label><input type="number" value={editing.wasBdt} onChange={(e) => setEditing({ ...editing, wasBdt: e.target.value })}/></div>
              <div className="field"><label>Stock</label><input type="number" value={editing.stock} onChange={(e) => setEditing({ ...editing, stock: e.target.value })}/></div>
              <div className="field"><label>Tag</label>
                <select value={editing.tag} onChange={(e) => setEditing({ ...editing, tag: e.target.value })}>
                  <option value="">— None —</option>
                  <option value="new">New</option>
                  <option value="sale">Sale</option>
                  <option value="limited">Limited</option>
                  <option value="staff-pick">Staff Pick</option>
                </select>
              </div>
            </div>
            <div className="field"><label>Description (EN)</label><textarea rows={3} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })}/></div>
            <div className="field"><label>Description (বাংলা)</label><textarea rows={3} value={editing.descriptionBn} onChange={(e) => setEditing({ ...editing, descriptionBn: e.target.value })}/></div>
            <div className="row">
              <div className="field"><label>Colours (comma-separated)</label><input value={editing.colors} onChange={(e) => setEditing({ ...editing, colors: e.target.value })} placeholder="Aubergine, Obsidian, Rose"/></div>
              <div className="field"><label>Sizes (comma-separated)</label><input value={editing.sizes} onChange={(e) => setEditing({ ...editing, sizes: e.target.value })} placeholder="XS, S, M, L, XL"/></div>
            </div>

            <div className="field" style={{ marginTop: 8 }}>
              <label>Model note (optional)</label>
              <input
                value={editing.modelNote}
                onChange={(e) => setEditing({ ...editing, modelNote: e.target.value })}
                placeholder="Model is 165 cm, wearing size S"
                maxLength={300}
              />
            </div>
            <div className="field" style={{ marginTop: 8 }}>
              <label>Complete the look</label>
              <LookPicker
                selected={editing.lookProductIds}
                products={products}
                currentProductId={editing.id}
                onChange={(ids) => setEditing({ ...editing, lookProductIds: ids })}
              />
            </div>

            <div style={{ borderTop: "1px solid var(--line)", paddingTop: 16, marginTop: 4 }}>
              <div style={{ fontSize: 11, letterSpacing: ".2em", color: "var(--ink-soft)", textTransform: "uppercase", marginBottom: 12 }}>Preorder</div>
              <div className="row" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                  <input type="checkbox" checked={editing.preorderEnabled} onChange={(e) => setEditing({ ...editing, preorderEnabled: e.target.checked, preorderOnly: e.target.checked ? editing.preorderOnly : false })} />
                  Preorder available
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", opacity: editing.preorderEnabled ? 1 : 0.4 }}>
                  <input type="checkbox" checked={editing.preorderOnly} disabled={!editing.preorderEnabled} onChange={(e) => setEditing({ ...editing, preorderOnly: e.target.checked })} />
                  Preorder only (hides Add to Bag)
                </label>
              </div>
              {editing.preorderEnabled && (
                <div className="row" style={{ marginTop: 10 }}>
                  <div className="field"><label>Estimated delivery</label><input value={editing.estimatedDelivery} onChange={(e) => setEditing({ ...editing, estimatedDelivery: e.target.value })} placeholder="e.g. 4–6 weeks"/></div>
                  <div className="field"><label>Preorder price (৳, optional)</label><input type="number" value={editing.preorderPriceBdt} onChange={(e) => setEditing({ ...editing, preorderPriceBdt: e.target.value })} placeholder="Leave blank to use regular price"/></div>
                </div>
              )}
            </div>

            {editing.id ? (
              <ProductImagesEditor productId={editing.id} productSku={editing.sku} />
            ) : (
              <p style={{ marginTop: 14, fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.6 }}>
                <i>Save the product first, then re-open this dialog to add photographs.</i>
              </p>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={onSave}>{editing.id ? "Save" : "Create"}</button>
            </div>
          </div>
        </>
      )}

      {pendingDel && (
        <>
          <div className="overlay" onClick={() => setPendingDel(null)}/>
          <div className="seg-confirm">
            <h3 className="serif" style={{ margin: "0 0 12px" }}>Delete &quot;{pendingDel.name}&quot;?</h3>
            <p style={{ color: "var(--ink-soft)", fontSize: 14, lineHeight: 1.6, margin: "0 0 18px" }}>
              This product will be removed from the storefront. Past orders are unaffected.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setPendingDel(null)}>Cancel</button>
              <button className="btn btn-sm" style={{ background: "var(--err)", color: "white", border: "none" }}
                onClick={() => startTransition(async () => {
                  await deleteProduct(pendingDel.id);
                  setSelected((prev) => { const next = new Set(prev); next.delete(pendingDel.id); return next; });
                  setPendingDel(null);
                })}>
                Delete
              </button>
            </div>
          </div>
        </>
      )}

      {pendingBulkDel && (
        <>
          <div className="overlay" onClick={() => setPendingBulkDel(false)}/>
          <div className="seg-confirm">
            <h3 className="serif" style={{ margin: "0 0 12px" }}>Delete {selected.size} product{selected.size !== 1 ? "s" : ""}?</h3>
            <p style={{ color: "var(--ink-soft)", fontSize: 14, lineHeight: 1.6, margin: "0 0 18px" }}>
              These products will be permanently removed from the storefront. Past order history is preserved.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setPendingBulkDel(false)}>Cancel</button>
              <button className="btn btn-sm" style={{ background: "var(--err)", color: "white", border: "none" }}
                onClick={() => startTransition(async () => {
                  await deleteProducts(Array.from(selected));
                  setSelected(new Set());
                  setPendingBulkDel(false);
                })}>
                Delete {selected.size}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
