"use client";

import { useState, useTransition } from "react";
import { requestReturn } from "@/lib/actions/returns";
import Icon from "@/components/storefront/Icon";

const REASONS = [
  "Damaged on arrival",
  "Wrong item received",
  "Item not as described",
  "Quality not as expected",
  "Changed my mind",
  "Other",
];

type Props = {
  orderId: string;
  orderNumber: string;
  onClose: () => void;
};

export default function ReturnModal({ orderId, orderNumber, onClose }: Props) {
  const [reason, setReason] = useState(REASONS[0]);
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = () => {
    setError(null);
    const full = notes.trim() ? `${reason} — ${notes.trim()}` : reason;
    startTransition(async () => {
      const r = await requestReturn({ orderId, reason: full });
      if (r.ok) setDone(true);
      else setError(r.error ?? "Could not submit. Please try again.");
    });
  };

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className="seg-modal" style={{ width: 500, maxWidth: "calc(100vw - 32px)" }}>
        <div className="seg-modal-hd">
          <h3 className="serif">Return request · {orderNumber}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="x" />
          </button>
        </div>

        {done ? (
          <div style={{ padding: "48px 32px", textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "oklch(0.92 0.06 150)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 22 }}>✓</div>
            <h4 className="serif" style={{ fontSize: 22, color: "var(--purple-900)", margin: "0 0 8px" }}>
              Request received
            </h4>
            <p style={{ color: "var(--ink-soft)", fontSize: 13, lineHeight: 1.7, maxWidth: 320, margin: "0 auto 24px" }}>
              Our team will be in touch within 1–2 business days to arrange collection at no extra charge.
            </p>
            <button className="btn btn-primary btn-sm" onClick={onClose}>Done</button>
          </div>
        ) : (
          <>
            <div className="seg-modal-body" style={{ display: "block", padding: "24px 28px" }}>
              <div className="field">
                <label>Reason for return</label>
                <select value={reason} onChange={(e) => setReason(e.target.value)}>
                  {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="field" style={{ marginTop: 14 }}>
                <label>Additional notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Describe the issue in more detail…"
                  style={{ resize: "vertical" }}
                />
              </div>
              <div style={{ background: "var(--purple-50)", border: "1px solid var(--line)", borderRadius: 2, padding: "12px 16px", marginTop: 16, fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.6 }}>
                Returns accepted within 30 days of delivery. Items must be in their original condition and packaging.
              </div>
              {error && (
                <p style={{ color: "var(--err)", fontSize: 12, marginTop: 12 }}>{error}</p>
              )}
            </div>
            <div className="seg-modal-foot">
              <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
              <button type="button" className="btn btn-primary btn-sm" onClick={onSubmit} disabled={pending}>
                {pending ? "Submitting…" : "Submit request"}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
