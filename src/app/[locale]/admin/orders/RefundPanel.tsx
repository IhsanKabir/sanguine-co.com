"use client";

import { useCallback, useEffect, useState, useTransition, type FormEvent } from "react";
import { issueRefund, listRefundsForOrder } from "@/lib/actions/refunds";
import type { Refund } from "@/lib/schema";
import { formatBdt, formatDate } from "@/lib/utils";

type Props = {
  orderId: string;
  orderTotalBdt: number;
  onIssued?: () => void;
};

const METHODS: { id: "bkash" | "bank" | "cash" | "card"; label: string }[] = [
  { id: "bkash", label: "bKash" },
  { id: "bank",  label: "Bank transfer" },
  { id: "cash",  label: "Cash (uncollected)" },
  { id: "card",  label: "Card" },
];

export default function RefundPanel({ orderId, orderTotalBdt, onIssued }: Props) {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [method, setMethod] = useState<"bkash" | "bank" | "cash" | "card">("bkash");
  const [recipientInfo, setRecipientInfo] = useState("");
  const [notes, setNotes] = useState("");
  const [fullRefund, setFullRefund] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const reload = useCallback(() => {
    listRefundsForOrder(orderId).then(setRefunds).catch(() => setRefunds([]));
  }, [orderId]);
  useEffect(() => { reload(); }, [reload]);

  const refundedSoFar = refunds.reduce((s, r) => s + r.amountBdt, 0);
  const remaining = Math.max(0, orderTotalBdt - refundedSoFar);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const amt = parseInt(amount, 10);
    if (!amt || amt <= 0) { setError("Enter a valid refund amount."); return; }
    if (reason.trim().length < 1) { setError("A reason is required."); return; }
    startTransition(async () => {
      const r = await issueRefund({
        orderId,
        amountBdt: amt,
        reason: reason.trim(),
        method,
        recipientInfo: recipientInfo.trim() || null,
        notes: notes.trim() || null,
        fullRefund,
      });
      if (r.ok) {
        setOpen(false);
        setAmount(""); setReason(""); setRecipientInfo(""); setNotes("");
        reload();
        onIssued?.();
      } else {
        setError(r.error);
      }
    });
  };

  return (
    <div className="panel" style={{ padding: 16, marginTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div className="pdp-label" style={{ margin: 0 }}>Refunds</div>
        {remaining > 0 && !open && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setOpen(true); setAmount(String(remaining)); }} style={{ borderColor: "var(--err)", color: "var(--err)" }}>
            Issue refund
          </button>
        )}
      </div>

      {refunds.length === 0 ? (
        <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: 0 }}>No refunds on this order.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {refunds.map((r) => (
            <li key={r.id} style={{ padding: "6px 0", borderBottom: "1px solid var(--line)", fontSize: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <b>{formatBdt(r.amountBdt)} via {r.method}</b>
                <span style={{ color: "var(--ink-soft)", fontFamily: "var(--mono)", fontSize: 10 }}>
                  {formatDate(new Date(r.createdAt))}
                </span>
              </div>
              <div style={{ color: "var(--ink-soft)", marginTop: 2 }}>{r.reason}</div>
              {r.recipientInfo && <div style={{ color: "var(--ink-soft)", fontSize: 11 }}>To: {r.recipientInfo}</div>}
              {r.processedByEmail && <div style={{ color: "var(--ink-soft)", fontSize: 10 }}>by {r.processedByEmail}</div>}
            </li>
          ))}
          <li style={{ display: "flex", justifyContent: "space-between", padding: "8px 0 0", fontSize: 12, fontWeight: 500 }}>
            <span>Total refunded</span>
            <span>{formatBdt(refundedSoFar)} of {formatBdt(orderTotalBdt)}</span>
          </li>
        </ul>
      )}

      {open && (
        <form onSubmit={onSubmit} style={{ marginTop: 12, padding: 12, background: "#fff4f4", border: "1px solid var(--err)" }}>
          <div className="row">
            <div className="field">
              <label>Amount (৳, max {formatBdt(remaining)})</label>
              <input type="number" min={1} max={remaining} value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div className="field">
              <label>Method</label>
              <select value={method} onChange={(e) => setMethod(e.target.value as typeof method)}>
                {METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </div>
          </div>
          <div className="field" style={{ marginTop: 8 }}>
            <label>Reason (shown on order timeline)</label>
            <input value={reason} onChange={(e) => setReason(e.target.value)} required maxLength={500} placeholder="e.g. customer cancelled at door, defective item" />
          </div>
          <div className="field" style={{ marginTop: 8 }}>
            <label>Recipient (optional — bKash number, bank account, …)</label>
            <input value={recipientInfo} onChange={(e) => setRecipientInfo(e.target.value)} maxLength={200} />
          </div>
          <div className="field" style={{ marginTop: 8 }}>
            <label>Internal notes (optional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={1000} style={{ width: "100%", padding: 8, fontFamily: "inherit", fontSize: 13, border: "1px solid var(--line)" }} />
          </div>
          <label className="seg-check" style={{ marginTop: 10 }}>
            <input type="checkbox" checked={fullRefund} onChange={(e) => setFullRefund(e.target.checked)} />
            Mark order as <b>refunded</b> (uncheck for a partial refund)
          </label>
          {error && <p style={{ color: "var(--err)", fontSize: 12, marginTop: 8 }}>{error}</p>}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button type="submit" className="btn btn-sm" style={{ background: "var(--err)", color: "white", border: "none" }} disabled={pending}>
              {pending ? "Issuing…" : "Confirm refund"}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)} disabled={pending}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
