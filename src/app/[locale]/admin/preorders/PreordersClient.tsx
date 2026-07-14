"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import {
  setPreorderStatus,
  quotePreorderRequest,
  rejectPreorderRequest,
  convertPreorderToOrder,
  markPreorderDepositReceived,
  getPreorderAttachmentUrls,
} from "@/lib/actions/preorders";
import type { PreorderRequest, Segment } from "@/lib/schema";
import { formatBdt, formatDate } from "@/lib/utils";
import { Link } from "@/i18n/routing";
import Icon from "@/components/storefront/Icon";

const STATUS_PILL: Record<string, string> = {
  new: "pill-info",
  reviewing: "pill-warn",
  quoted: "pill-warn",
  confirmed: "pill-ok",
  rejected: "pill-err",
  converted: "pill-ok",
};

const STATUS_FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "reviewing", label: "Reviewing" },
  { key: "quoted", label: "Quoted" },
  { key: "rejected", label: "Rejected" },
  { key: "converted", label: "Converted" },
];

export type LinkedOrderInfo = {
  id: string;
  number: string;
  status: string;
  shippingCourier: string | null;
  shippingTracking: string | null;
};

type Props = {
  requests: PreorderRequest[];
  segments: Segment[];
  linkedOrders: Record<string, LinkedOrderInfo>;
};

export default function PreordersClient({ requests, segments, linkedOrders }: Props) {
  const [filter, setFilter] = useState<string>("all");
  const [selected, setSelected] = useState<PreorderRequest | null>(null);
  const [, startTransition] = useTransition();
  const segName = (id: string | null) => id ? (segments.find((s) => s.id === id)?.name ?? id) : "—";

  const visible = useMemo(
    () => filter === "all" ? requests : requests.filter((r) => r.status === filter),
    [requests, filter],
  );

  const countsByStatus = useMemo(
    () => Object.fromEntries(
      STATUS_FILTERS.map((f) => [
        f.key,
        f.key === "all" ? requests.length : requests.filter((r) => r.status === f.key).length,
      ]),
    ),
    [requests],
  );
  const linkedFor = (r: PreorderRequest): LinkedOrderInfo | undefined =>
    r.convertedOrderId ? linkedOrders[r.convertedOrderId] : undefined;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", marginBottom: 20 }}>
        <div>
          <h1 className="admin-h1">Pre-orders</h1>
          <p className="admin-sub">{requests.length} bespoke requests · {requests.filter((r) => r.status === "new").length} awaiting first review</p>
        </div>
      </div>

      <div className="period-chips" style={{ marginBottom: 18 }}>
        {STATUS_FILTERS.map((f) => {
          const count = countsByStatus[f.key] ?? 0;
          return (
            <button
              key={f.key}
              type="button"
              className="chip"
              onClick={() => setFilter(f.key)}
              style={{ opacity: filter === f.key ? 1 : 0.55, cursor: "pointer", fontWeight: filter === f.key ? 600 : 400 }}
            >
              {f.label} <span style={{ marginLeft: 6, fontFamily: "var(--mono)", fontSize: 10, opacity: 0.7 }}>{count}</span>
            </button>
          );
        })}
      </div>

      <div className="table">
        <table>
          <thead>
            <tr><th>Received</th><th>Customer</th><th>Segment</th><th>Description</th><th>Refs</th><th>Status</th><th style={{ textAlign: "right" }}>Quote</th></tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--ink-soft)", padding: 40 }}>
                {filter === "all" ? "No pre-order requests yet." : `No ${filter} requests.`}
              </td></tr>
            ) : visible.map((r) => (
              <tr key={r.id} style={{ cursor: "pointer" }} onClick={() => startTransition(() => setSelected(r))}>
                <td style={{ fontSize: 12, color: "var(--ink-soft)" }}>{formatDate(new Date(r.createdAt))}</td>
                <td>
                  <div style={{ fontWeight: 500 }}>{r.customerName || "—"}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>{r.customerEmail}</div>
                </td>
                <td>{segName(r.segmentId)}</td>
                <td style={{ maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13, color: "var(--ink-soft)" }}>
                  {r.description}
                </td>
                <td>{(r.attachments ?? []).length}</td>
                <td><span className={"pill " + (STATUS_PILL[r.status] || "pill-info")}>{r.status}</span></td>
                <td style={{ textAlign: "right", fontWeight: 500 }}>{r.quotedPriceBdt ? formatBdt(r.quotedPriceBdt) : <span style={{ color: "var(--ink-soft)" }}>—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <DetailDrawer
          request={selected}
          segmentName={segName(selected.segmentId)}
          linkedOrder={linkedFor(selected)}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

function DetailDrawer({
  linkedOrder,
  request,
  segmentName,
  onClose,
}: {
  request: PreorderRequest;
  segmentName: string;
  linkedOrder?: LinkedOrderInfo;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [signedUrls, setSignedUrls] = useState<string[]>([]);
  const [loadingUrls, setLoadingUrls] = useState(false);

  // Quote inputs
  const [quotePrice, setQuotePrice] = useState(request.quotedPriceBdt?.toString() ?? "");
  const [adminNotes, setAdminNotes] = useState(request.adminNotes ?? "");

  // Reject input
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);

  // Convert confirmation
  const [showConvertConfirm, setShowConvertConfirm] = useState(false);

  useEffect(() => {
    if ((request.attachments ?? []).length === 0) return;
    setLoadingUrls(true);
    getPreorderAttachmentUrls(request.id)
      .then((urls) => setSignedUrls(urls))
      .catch(() => setSignedUrls([]))
      .finally(() => setLoadingUrls(false));
  }, [request.id, request.attachments]);

  const onMarkReviewing = () => {
    setError(null);
    startTransition(async () => {
      await setPreorderStatus(request.id, "reviewing");
      onClose();
    });
  };

  const onQuote = () => {
    setError(null);
    const price = parseInt(quotePrice, 10);
    if (!price || price < 1) { setError("Enter a valid quote price."); return; }
    startTransition(async () => {
      const r = await quotePreorderRequest({
        id: request.id,
        quotedPriceBdt: price,
        adminNotes: adminNotes.trim() || null,
      });
      if (r.ok) onClose();
      else setError(r.error);
    });
  };

  const onReject = () => {
    setError(null);
    if (rejectReason.trim().length < 1) { setError("Reason is required."); return; }
    startTransition(async () => {
      await rejectPreorderRequest({ id: request.id, reason: rejectReason.trim() });
      onClose();
    });
  };

  const onConvert = () => {
    setShowConvertConfirm(true);
  };

  const doConvert = () => {
    setShowConvertConfirm(false);
    setError(null);
    startTransition(async () => {
      const r = await convertPreorderToOrder({ id: request.id });
      if (r.ok) onClose();
      else setError(r.error);
    });
  };

  const attachments = request.attachments ?? [];
  const addr = request.deliveryAddress as { line1?: string; area?: string | null; city?: string; postcode?: string | null } | null;

  return (
    <>
      <div className="overlay" onClick={onClose}/>
      <div className="seg-modal" style={{ width: 760, maxHeight: "90vh", overflow: "auto" }}>
        <div className="seg-modal-hd">
          <h3 className="serif">Pre-order · {request.customerName || request.customerEmail}</h3>
          <button className="icon-btn" onClick={onClose}><Icon name="x"/></button>
        </div>
        <div className="seg-modal-body" style={{ display: "block" }}>
          {/* Meta strip */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, padding: "12px 16px", background: "#fcfaf6", border: "1px solid var(--line)", marginBottom: 18, fontSize: 12 }}>
            <span><b>{segmentName}</b></span>
            <span>·</span>
            <span>{request.quantity}× </span>
            <span>·</span>
            <span className={"pill " + (STATUS_PILL[request.status] || "pill-info")}>{request.status}</span>
            <span style={{ marginLeft: "auto", color: "var(--ink-soft)" }}>{formatDate(new Date(request.createdAt))}</span>
          </div>

          {/* Customer */}
          <div className="field"><label>Customer</label>
            <div style={{ fontSize: 14, lineHeight: 1.6 }}>
              {request.customerName || "—"}<br/>
              <a href={`mailto:${request.customerEmail}`} style={{ color: "var(--purple-900)" }}>{request.customerEmail}</a>
              {request.customerPhone && <> · <a href={`tel:${request.customerPhone}`} style={{ color: "var(--purple-900)" }}>{request.customerPhone}</a></>}
            </div>
          </div>

          {/* Description */}
          <div className="field" style={{ marginTop: 12 }}>
            <label>What they want</label>
            <p style={{ background: "#f9f4ec", borderLeft: "2px solid var(--gold-deep)", padding: "12px 14px", fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap", margin: 0 }}>
              {request.description}
            </p>
          </div>

          {/* Logistics */}
          <div className="row" style={{ marginTop: 12 }}>
            {request.budgetHintBdt != null && (
              <div className="field"><label>Budget hint</label><div style={{ fontSize: 14 }}>{formatBdt(request.budgetHintBdt)}</div></div>
            )}
            {request.targetDate && (
              <div className="field"><label>Wanted by</label><div style={{ fontSize: 14 }}>{request.targetDate}</div></div>
            )}
            {addr && addr.line1 && (
              <div className="field" style={{ flex: 2 }}>
                <label>Delivery address</label>
                <div style={{ fontSize: 14, lineHeight: 1.5 }}>
                  {addr.line1}<br/>
                  {addr.area ? addr.area + ", " : ""}{addr.city}{addr.postcode ? " — " + addr.postcode : ""}
                </div>
              </div>
            )}
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <label style={{ fontSize: 11, letterSpacing: ".15em", color: "var(--ink-soft)", textTransform: "uppercase" }}>References ({attachments.length})</label>
              {loadingUrls ? (
                <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 8 }}>Loading previews…</p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginTop: 8 }}>
                  {attachments.map((a, i) => (
                    <a key={a.path} href={signedUrls[i]} target="_blank" rel="noopener noreferrer" style={{ display: "block", aspectRatio: "1", border: "1px solid var(--line)", overflow: "hidden", background: "white" }}>
                      {a.type === "image" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={signedUrls[i]} alt="reference" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <video src={signedUrls[i]} style={{ width: "100%", height: "100%", objectFit: "cover" }} controls muted />
                      )}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quote section — visible while not yet final */}
          {request.status !== "rejected" && request.status !== "converted" && (
            <div style={{ marginTop: 24, padding: 18, background: "#f9f4ec", border: "1px solid var(--gold-deep)" }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".2em", color: "var(--gold-deep)", marginBottom: 12 }}>QUOTE</div>
              <div className="row">
                <div className="field">
                  <label>Quote price (৳ per unit)</label>
                  <input type="number" min={1} value={quotePrice} onChange={(e) => setQuotePrice(e.target.value)} placeholder="8000" />
                </div>
                <div className="field">
                  <label>Total ({request.quantity}×)</label>
                  <div style={{ fontSize: 18, fontFamily: "var(--serif)", padding: "10px 0" }}>{quotePrice ? formatBdt(parseInt(quotePrice, 10) * request.quantity) : "—"}</div>
                </div>
              </div>
              <div className="field" style={{ marginTop: 8 }}>
                <label>Note to customer (optional)</label>
                <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} maxLength={2000} rows={3} style={{ width: "100%", padding: 10, fontFamily: "inherit", fontSize: 14, border: "1px solid var(--line)" }} placeholder="A short note about timeline, materials, or anything you want them to know." />
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button type="button" className="btn btn-primary btn-sm" onClick={onQuote} disabled={pending}>
                  {pending ? "Sending…" : (request.status === "quoted" ? "Update quote & re-email" : "Send quote to customer")}
                </button>
                {request.status === "new" && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={onMarkReviewing} disabled={pending}>Mark as reviewing</button>
                )}
              </div>
            </div>
          )}

          {/* Deposit gate — a quoted request converts at FULL price until the
              bKash deposit is marked received; 'confirmed' deducts it. */}
          {request.status === "quoted" && request.quotedPriceBdt && request.depositBdt ? (
            <div style={{ marginTop: 16, padding: 18, background: "#fdf6e8", border: "1px solid #e8d8a8" }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".2em", color: "#a07e2c", marginBottom: 8 }}>DEPOSIT · {formatBdt(request.depositBdt)}</div>
              <p style={{ fontSize: 13, color: "#6b5a2a", margin: "0 0 12px", lineHeight: 1.6 }}>
                Once the customer&apos;s bKash prepayment of {formatBdt(request.depositBdt)} arrives, mark it received —
                the converted order will then collect {formatBdt(request.quotedPriceBdt * request.quantity - request.depositBdt)} on delivery.
                Converting <b>without</b> marking it charges the full {formatBdt(request.quotedPriceBdt * request.quantity)} COD.
              </p>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={pending}
                onClick={() => startTransition(async () => {
                  const res = await markPreorderDepositReceived(request.id);
                  if (res && "error" in res && res.error) alert(res.error);
                })}
              >
                Deposit received
              </button>
            </div>
          ) : null}

          {/* Convert action — quoted (full COD) or confirmed (deposit deducted) */}
          {(request.status === "quoted" || request.status === "confirmed") && request.quotedPriceBdt && (
            <div style={{ marginTop: 16, padding: 18, background: "#eef7ee", border: "1px solid #4caf50" }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".2em", color: "#2e7d32", marginBottom: 8 }}>
                {request.status === "confirmed" ? "DEPOSIT RECEIVED — READY TO CONVERT" : "CUSTOMER ACCEPTED?"}
              </div>
              <p style={{ fontSize: 13, color: "#2e4f33", margin: "0 0 12px", lineHeight: 1.6 }}>
                {request.status === "confirmed"
                  ? `The deposit is on record — the courier will collect the remainder on delivery.`
                  : `Click below to convert this request into a real COD order. The customer will appear in your Orders queue and the piece will be paid for on delivery.`}
              </p>
              {showConvertConfirm ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                  <span style={{ color: "var(--ink-soft)" }}>Convert this request into a real COD order?</span>
                  <button type="button" className="btn btn-primary btn-sm" onClick={doConvert} style={{ padding: "3px 10px" }}>Confirm</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowConvertConfirm(false)} style={{ padding: "3px 8px" }}>Cancel</button>
                </span>
              ) : (
                <button type="button" className="btn btn-primary btn-sm" onClick={onConvert} disabled={pending}>
                  Convert to COD order (
                  {request.status === "confirmed"
                    ? `collect ${formatBdt(Math.max(0, request.quotedPriceBdt * request.quantity - (request.depositBdt ?? 0)))}`
                    : formatBdt(request.quotedPriceBdt * request.quantity)}
                  )
                </button>
              )}
            </div>
          )}

          {/* Reject section */}
          {request.status !== "rejected" && request.status !== "converted" && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
              {!showReject ? (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowReject(true)} style={{ borderColor: "var(--err)", color: "var(--err)" }}>
                  Reject request
                </button>
              ) : (
                <div>
                  <label style={{ fontSize: 11, letterSpacing: ".15em", color: "var(--ink-soft)", textTransform: "uppercase" }}>Reason (internal note)</label>
                  <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={2} style={{ width: "100%", padding: 10, fontFamily: "inherit", fontSize: 14, border: "1px solid var(--line)", marginTop: 6 }} placeholder="Why are we declining? (e.g. out of scope, materials unavailable)" />
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button type="button" className="btn btn-sm" onClick={onReject} disabled={pending} style={{ background: "var(--err)", color: "white", border: "none" }}>Confirm rejection</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowReject(false)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Status footers for terminal states */}
          {request.status === "rejected" && request.rejectionReason && (
            <div style={{ marginTop: 16, padding: 14, background: "#fff4f4", border: "1px solid var(--err)", fontSize: 13, color: "#7a2828" }}>
              <b>Rejected</b> — {request.rejectionReason}
            </div>
          )}
          {request.status === "converted" && request.convertedOrderId && (
            <div style={{ marginTop: 16, padding: 14, background: "#eef7ee", border: "1px solid #4caf50", fontSize: 13, color: "#2e4f33" }}>
              <b>Converted</b> — order <Link href="/admin/orders" style={{ color: "#2e7d32", fontFamily: "var(--mono)" }}>{linkedOrder?.number ?? "created"}</Link>.
              <BespokePipeline linkedOrder={linkedOrder} />
            </div>
          )}

          {error && <p style={{ color: "var(--err)", fontSize: 13, marginTop: 14 }}>{error}</p>}
        </div>
        <div className="seg-modal-foot">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </>
  );
}

/**
 * 4-stage progress visualisation for a converted bespoke piece.
 * Maps the linked order's status to:  Sourcing → Preparing → Shipped → Delivered.
 * Renders nothing if no linked order yet.
 */
function BespokePipeline({ linkedOrder }: { linkedOrder?: LinkedOrderInfo }) {
  if (!linkedOrder) return null;
  // Order status -> pipeline index. Bespoke pieces start in 'cod_pending' which
  // is "sourcing" for our purposes; the admin moves them through the standard
  // status enum and the pipeline reflects it.
  const STAGES: { key: string; label: string; statuses: string[] }[] = [
    { key: "sourcing",  label: "Sourcing",  statuses: ["pending", "cod_pending"] },
    { key: "preparing", label: "Preparing", statuses: ["paid", "processing"] },
    { key: "shipped",   label: "Shipped",   statuses: ["shipped"] },
    { key: "delivered", label: "Delivered", statuses: ["delivered"] },
  ];
  const idx = STAGES.findIndex((s) => s.statuses.includes(linkedOrder.status));
  const current = idx < 0 ? 0 : idx;

  return (
    <div style={{ marginTop: 12, padding: "10px 12px", background: "white", border: "1px solid #c8e6c9" }}>
      <div style={{ fontSize: 10, letterSpacing: ".2em", color: "#2e7d32", textTransform: "uppercase", marginBottom: 8 }}>Production pipeline</div>
      <ol style={{ display: "flex", listStyle: "none", padding: 0, margin: 0, gap: 0, alignItems: "center" }}>
        {STAGES.map((s, i) => {
          const reached = i <= current;
          const isCurrent = i === current && linkedOrder.status !== "cancelled" && linkedOrder.status !== "refunded";
          return (
            <li key={s.key} style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, color: reached ? "#2e7d32" : "var(--ink-soft)" }}>
              <span style={{
                width: 22, height: 22, borderRadius: "50%",
                background: reached ? "#4caf50" : "transparent",
                border: "1.5px solid " + (reached ? "#4caf50" : "var(--line)"),
                color: reached ? "white" : "var(--ink-soft)",
                display: "grid", placeItems: "center",
                fontFamily: "var(--mono)", fontSize: 10,
                fontWeight: isCurrent ? 700 : 400,
              }}>
                {reached ? "✓" : i + 1}
              </span>
              <span style={{ fontSize: 11, fontWeight: isCurrent ? 600 : 400 }}>{s.label}</span>
              {i < STAGES.length - 1 && (
                <span style={{ flex: 1, height: 1, background: i < current ? "#4caf50" : "var(--line)", marginLeft: 4 }} />
              )}
            </li>
          );
        })}
      </ol>
      {(linkedOrder.status === "cancelled" || linkedOrder.status === "refunded") && (
        <p style={{ fontSize: 11, color: "var(--err)", margin: "8px 0 0" }}>
          Order <b>{linkedOrder.status}</b>. The bespoke piece was not completed.
        </p>
      )}
      {linkedOrder.shippingCourier && linkedOrder.shippingTracking && (
        <p style={{ fontSize: 11, color: "var(--ink-soft)", margin: "8px 0 0" }}>
          Courier: <b style={{ textTransform: "capitalize" }}>{linkedOrder.shippingCourier}</b>
          <span className="mono" style={{ marginLeft: 8 }}>{linkedOrder.shippingTracking}</span>
        </p>
      )}
    </div>
  );
}
