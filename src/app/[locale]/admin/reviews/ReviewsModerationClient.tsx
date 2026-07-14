"use client";

import { useState, useTransition } from "react";
import { moderateReview } from "@/lib/actions/reviews";
import { formatDate } from "@/lib/utils";
import Icon from "@/components/storefront/Icon";
import type { Review } from "@/lib/schema";

type Props = {
  status: "pending" | "approved" | "rejected";
  counts: { pending: number; approved: number; rejected: number };
  reviews: Review[];
  productNames: Record<string, string>;
};

const STATUS_CHIPS: { id: "pending" | "approved" | "rejected"; label: string }[] = [
  { id: "pending",  label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

export default function ReviewsModerationClient({ status, counts, reviews, productNames }: Props) {
  const [, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<{ id: string; reason: string } | null>(null);

  const setStatusFilter = (s: typeof status) => {
    const params = new URLSearchParams(window.location.search);
    params.set("status", s);
    window.location.search = params.toString();
  };

  const onApprove = (id: string) => {
    setBusyId(id);
    startTransition(async () => {
      await moderateReview({ id, action: "approve", reason: null });
      setBusyId(null);
    });
  };

  const onReject = () => {
    if (!rejecting) return;
    if (rejecting.reason.trim().length === 0) return;
    setBusyId(rejecting.id);
    startTransition(async () => {
      await moderateReview({ id: rejecting.id, action: "reject", reason: rejecting.reason.trim() });
      setBusyId(null);
      setRejecting(null);
    });
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", marginBottom: 20 }}>
        <div>
          <h1 className="admin-h1">Reviews</h1>
          <p className="admin-sub">{counts.pending} awaiting review · {counts.approved} live · {counts.rejected} declined</p>
        </div>
      </div>

      <div className="period-chips" style={{ marginBottom: 18 }}>
        {STATUS_CHIPS.map((c) => (
          <button
            key={c.id}
            type="button"
            className="chip"
            onClick={() => setStatusFilter(c.id)}
            style={{ opacity: status === c.id ? 1 : 0.55, cursor: "pointer", fontWeight: status === c.id ? 600 : 400 }}
          >
            {c.label} <span style={{ marginLeft: 6, fontFamily: "var(--mono)", fontSize: 10, opacity: 0.7 }}>{counts[c.id]}</span>
          </button>
        ))}
      </div>

      {reviews.length === 0 ? (
        <div className="empty-state" style={{ padding: 40 }}>
          <p style={{ color: "var(--ink-soft)" }}>
            {status === "pending" ? "Nothing waiting. The queue is clear." : status === "approved" ? "No approved notes yet." : "No declined notes."}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {reviews.map((r) => (
            <article key={r.id} style={{ padding: 18, background: "white", border: "1px solid var(--line)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, fontSize: 12, color: "var(--ink-soft)" }}>
                <div>
                  <b style={{ color: "var(--purple-900)" }}>{productNames[r.productId] ?? r.productId}</b>
                  <span style={{ marginLeft: 10 }}>{formatDate(new Date(r.createdAt))}</span>
                </div>
                <div style={{ color: "var(--gold-deep)", letterSpacing: ".05em" }}>
                  {"★★★★★".slice(0, r.rating)}<span style={{ color: "var(--line)" }}>{"★★★★★".slice(0, 5 - r.rating)}</span>
                </div>
              </div>

              {r.title && (
                <h3 className="serif" style={{ fontSize: 18, margin: "4px 0 6px", color: "var(--purple-900)", fontWeight: 500 }}>
                  {r.title}
                </h3>
              )}
              {r.body && (
                <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--ink)", margin: 0, whiteSpace: "pre-wrap" }}>{r.body}</p>
              )}

              {r.status === "rejected" && r.rejectionReason && (
                <div style={{ marginTop: 10, padding: 10, background: "#fff4f4", border: "1px solid var(--err)", fontSize: 12, color: "#7a2828" }}>
                  Declined — {r.rejectionReason}
                </div>
              )}

              {r.status === "pending" && (
                <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={busyId === r.id}
                    onClick={() => onApprove(r.id)}
                  >
                    <Icon name="check" size={12} /> Approve
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ borderColor: "var(--err)", color: "var(--err)" }}
                    disabled={busyId === r.id}
                    onClick={() => setRejecting({ id: r.id, reason: "" })}
                  >
                    Decline
                  </button>
                </div>
              )}

              {/* Approved notes must be removable too (mistaken approvals,
                  test data) — moderateReview re-aggregates the product's
                  rating and count from approved rows, so pulling one down
                  keeps the PDP honest. */}
              {r.status === "approved" && (
                <div style={{ marginTop: 14 }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ borderColor: "var(--err)", color: "var(--err)" }}
                    disabled={busyId === r.id}
                    onClick={() => setRejecting({ id: r.id, reason: "" })}
                  >
                    Remove from storefront
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {rejecting && (
        <>
          <div className="overlay" onClick={() => setRejecting(null)} />
          <div className="seg-confirm">
            <h3 className="serif" style={{ margin: "0 0 12px" }}>Decline this note?</h3>
            <p style={{ color: "var(--ink-soft)", fontSize: 14, lineHeight: 1.6, margin: "0 0 12px" }}>
              Internal note — the customer is not shown a reason. Used for your record only.
            </p>
            <textarea
              value={rejecting.reason}
              onChange={(e) => setRejecting((prev) => (prev ? { ...prev, reason: e.target.value } : null))}
              rows={3}
              maxLength={500}
              placeholder="e.g. abusive language, off-topic, not about this piece"
              style={{ width: "100%", padding: 10, fontFamily: "inherit", fontSize: 13, border: "1px solid var(--line)", marginBottom: 12 }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setRejecting(null)}>Cancel</button>
              <button
                className="btn btn-sm"
                style={{ background: "var(--err)", color: "white", border: "none" }}
                disabled={!rejecting.reason.trim() || busyId === rejecting.id}
                onClick={onReject}
              >
                Confirm decline
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
