"use client";

import { useEffect, useState, useTransition } from "react";
import { getOptionStockAdmin, saveOptionStock, stopOptionStock } from "@/lib/actions/admin";

type Option = { color: string; size: string; stock: number | null };

/**
 * Count stock per size/colour for one piece. Saving replaces every option's
 * number and sets the piece's total to their sum; from then on orders take
 * stock from the option bought, and a sold-out size can't be ordered.
 */
export default function OptionStockEditor({ productId, name, onClose }: { productId: string; name: string; onClose: () => void }) {
  const [options, setOptions] = useState<Option[] | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [tracked, setTracked] = useState(false);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [confirmStop, setConfirmStop] = useState(false);
  const [pending, startTransition] = useTransition();

  const key = (o: { color: string; size: string }) => `${o.color}|${o.size}`;

  useEffect(() => {
    getOptionStockAdmin(productId).then((r) => {
      if (!r.ok) { setError(r.error); return; }
      setOptions(r.options);
      setTracked(r.tracked);
      setTotal(r.total);
      setValues(Object.fromEntries(r.options.map((o) => [key(o), o.stock == null ? "" : String(o.stock)])));
    }).catch(() => setError("Could not load this piece's options."));
  }, [productId]);

  const sum = options?.reduce((s, o) => s + (parseInt(values[key(o)] ?? "", 10) || 0), 0) ?? 0;
  const missing = options?.filter((o) => (values[key(o)] ?? "").trim() === "").length ?? 0;

  const save = () => {
    if (!options) return;
    setError(null);
    startTransition(async () => {
      const r = await saveOptionStock(productId, options.map((o) => ({
        color: o.color, size: o.size, stock: parseInt(values[key(o)] ?? "", 10) || 0,
      })));
      if (r.ok) onClose();
      else setError(r.error);
    });
  };

  const stop = () => {
    setError(null);
    startTransition(async () => {
      const r = await stopOptionStock(productId);
      if (r.ok) onClose();
    });
  };

  const colors = options ? [...new Set(options.map((o) => o.color))] : [];
  const sizes = options ? [...new Set(options.map((o) => o.size))] : [];

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className="seg-confirm" style={{ width: 620, maxWidth: "calc(100vw - 32px)", maxHeight: "85vh", overflow: "auto" }}>
        <h3 className="serif" style={{ margin: "0 0 6px" }}>Stock per option</h3>
        <p style={{ color: "var(--ink-soft)", fontSize: 13, marginTop: 0 }}>
          <b>{name}</b> · {tracked
            ? <>counted per option, total <b>{total}</b>.</>
            : <>one stock number today (<b>{total}</b>). Count each option and save to switch.</>}
        </p>

        {!options && !error && <p style={{ fontSize: 13 }}>Loading…</p>}
        {options && options.length === 0 && (
          <p style={{ fontSize: 13 }}>This piece has no sizes or colours. Add them in Products first.</p>
        )}

        {options && options.length > 0 && (
          <div className="table" style={{ margin: "8px 0 12px" }}>
            <table className="option-stock-grid">
              <thead>
                <tr>
                  <th>{colors[0] ? "Colour" : ""}</th>
                  {sizes.map((s) => <th key={s}>{s || "Stock"}</th>)}
                </tr>
              </thead>
              <tbody>
                {colors.map((c) => (
                  <tr key={c}>
                    <td style={{ fontWeight: 500 }}>{c || "—"}</td>
                    {sizes.map((s) => {
                      const k = `${c}|${s}`;
                      return (
                        <td key={k}>
                          <input
                            type="number"
                            min={0}
                            inputMode="numeric"
                            aria-label={`Stock for ${[c, s].filter(Boolean).join(" · ")}`}
                            value={values[k] ?? ""}
                            placeholder="0"
                            onChange={(e) => setValues({ ...values, [k]: e.target.value })}
                            style={{ width: 72, padding: "6px 8px", border: "1px solid var(--line)" }}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {options && options.length > 0 && (
          <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: "0 0 14px" }}>
            New total: <b style={{ color: "var(--purple-900)" }}>{sum}</b>
            {missing > 0 && <> · {missing} option{missing === 1 ? "" : "s"} left blank will be saved as 0</>}
            {tracked ? null : <> · replaces today&rsquo;s {total}</>}
          </p>
        )}
        {error && <p className="field-err" style={{ margin: "0 0 12px", fontSize: 13 }}>{error}</p>}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", alignItems: "center", flexWrap: "wrap" }}>
          {tracked && !confirmStop && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmStop(true)} style={{ marginRight: "auto" }}>
              Stop counting per option
            </button>
          )}
          {tracked && confirmStop && (
            <span style={{ marginRight: "auto", fontSize: 12, display: "inline-flex", gap: 8, alignItems: "center" }}>
              Keep one number ({total}) and stop checking sizes at checkout?
              <button type="button" className="btn btn-ghost btn-sm" onClick={stop} disabled={pending}>Yes</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmStop(false)}>No</button>
            </span>
          )}
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={pending || !options || options.length === 0}>
            {pending ? "Saving…" : "Save counts"}
          </button>
        </div>
      </div>
    </>
  );
}
