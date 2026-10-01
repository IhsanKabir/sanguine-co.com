"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { formatBdt, formatDate } from "@/lib/utils";
import ReturnModal from "./ReturnModal";

type OrderRow = {
  id: string;
  number: string;
  status: string;
  totalBdt: number;
  createdAt: string | null;
  shippingCourier: string | null;
  shippingTracking: string | null;
  trackingToken: string | null;
};

type Props = { orders: OrderRow[]; locale: "en" | "bn" };

const STATUS_STYLE: Record<string, string> = {
  pending:          "pill-warn",
  cod_pending:      "pill-warn",
  pending_payment:  "pill-warn",
  paid:             "pill-info",
  processing:       "pill-info",
  shipped:          "pill-info",
  delivered:        "pill-ok",
  cancelled:        "pill-err",
  refunded:         "pill-info",
  return_requested: "pill-warn",
};

// The exact window (per-product, anchored to delivery) is enforced server-side
// in requestReturn — the button shows for any delivered order and the server
// message states the precise window when it has closed.
function canReturn(order: OrderRow) {
  return order.status === "delivered";
}

export default function AccountOrders({ orders, locale }: Props) {
  const t = useTranslations();
  const [returnOrder, setReturnOrder] = useState<OrderRow | null>(null);
  // Known statuses have a translated label; anything new shows its raw value.
  const statusLabel = (s: string) => (t.has(`orderStatus.${s}`) ? t(`orderStatus.${s}`) : s);

  if (orders.length === 0) {
    return (
      <div className="empty-state" style={{ padding: "40px 0" }}>
        <p style={{ color: "var(--ink-soft)", marginBottom: 16 }}>{t("accountOrders.none")}</p>
        <Link href="/" className="btn btn-primary btn-sm">{t("accountOrders.wander")}</Link>
      </div>
    );
  }

  return (
    <>
      <div className="table orders-table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t("accountOrders.colOrder")}</th>
              <th>{t("accountOrders.colDate")}</th>
              <th>{t("accountOrders.colStatus")}</th>
              <th>{t("accountOrders.colTracking")}</th>
              <th>{t("accountOrders.colTotal")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td style={{ fontFamily: "var(--mono)", color: "var(--purple-900)", fontWeight: 500 }}>
                  {o.number}
                </td>
                <td style={{ color: "var(--ink-soft)", fontSize: 13 }}>
                  {o.createdAt ? formatDate(new Date(o.createdAt), locale) : "—"}
                </td>
                <td>
                  <span className={"pill " + (STATUS_STYLE[o.status] ?? "pill-info")}>
                    {statusLabel(o.status)}
                  </span>
                </td>
                <td style={{ fontSize: 12 }}>
                  {o.shippingTracking ? (
                    <span style={{ fontFamily: "var(--mono)", color: "var(--ink-soft)", fontSize: 11 }}>
                      {o.shippingCourier && (
                        <span style={{ color: "var(--gold-text)", marginRight: 6, textTransform: "uppercase", letterSpacing: ".08em" }}>
                          {o.shippingCourier}
                        </span>
                      )}
                      {o.shippingTracking}
                    </span>
                  ) : (
                    <span style={{ color: "var(--line)", fontSize: 11 }}>—</span>
                  )}
                </td>
                <td style={{ fontWeight: 500 }}>
                  {formatBdt(o.totalBdt, locale)}
                </td>
                <td>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <Link
                      href={`/order/${o.number}/track${o.trackingToken ? `?t=${o.trackingToken}` : ""}`}
                      style={{ fontSize: 12, color: "var(--purple-800)", borderBottom: "1px solid var(--gold)", paddingBottom: 1 }}
                    >
                      {t("accountOrders.track")}
                    </Link>
                    <a
                      href={`/api/invoice/${o.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 11, color: "var(--ink-soft)", borderBottom: "1px solid var(--line)", paddingBottom: 1, cursor: "pointer" }}
                    >
                      {t("accountOrders.invoice")}
                    </a>
                    {canReturn(o) && (
                      <button
                        type="button"
                        onClick={() => setReturnOrder(o)}
                        style={{ fontSize: 11, color: "var(--ink-soft)", letterSpacing: ".08em", textTransform: "uppercase", background: "none", border: "none", borderBottom: "1px solid var(--line)", cursor: "pointer", padding: "0 0 1px" }}
                      >
                        {t("accountOrders.return")}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {returnOrder && (
        <ReturnModal
          orderId={returnOrder.id}
          orderNumber={returnOrder.number}
          onClose={() => setReturnOrder(null)}
        />
      )}
    </>
  );
}
