"use client";

import { useState } from "react";
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
};

type Props = { orders: OrderRow[]; locale: "en" | "bn" };

const STATUS_STYLE: Record<string, string> = {
  pending:          "pill-warn",
  cod_pending:      "pill-warn",
  paid:             "pill-info",
  processing:       "pill-info",
  shipped:          "pill-info",
  delivered:        "pill-ok",
  cancelled:        "pill-err",
  refunded:         "pill-info",
  return_requested: "pill-warn",
};

const STATUS_LABEL: Record<string, string> = {
  pending:          "Pending",
  cod_pending:      "COD Pending",
  paid:             "Paid",
  processing:       "Processing",
  shipped:          "Shipped",
  delivered:        "Delivered",
  cancelled:        "Cancelled",
  refunded:         "Refunded",
  return_requested: "Return Requested",
};

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function canReturn(order: OrderRow) {
  if (order.status !== "delivered") return false;
  const age = Date.now() - (order.createdAt ? new Date(order.createdAt).getTime() : 0);
  return age <= THIRTY_DAYS_MS;
}

export default function AccountOrders({ orders, locale }: Props) {
  const [returnOrder, setReturnOrder] = useState<OrderRow | null>(null);

  if (orders.length === 0) {
    return (
      <div className="empty-state" style={{ padding: "40px 0" }}>
        <p style={{ color: "var(--ink-soft)", marginBottom: 16 }}>No orders yet.</p>
        <Link href="/" className="btn btn-primary btn-sm">Wander the Maison</Link>
      </div>
    );
  }

  return (
    <>
      <div className="table">
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Date</th>
              <th>Status</th>
              <th>Tracking</th>
              <th>Total</th>
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
                    {STATUS_LABEL[o.status] ?? o.status}
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
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <Link
                      href={`/order/${o.number}`}
                      style={{ fontSize: 12, color: "var(--purple-800)", borderBottom: "1px solid var(--gold)", paddingBottom: 1 }}
                    >
                      View
                    </Link>
                    {canReturn(o) && (
                      <button
                        type="button"
                        onClick={() => setReturnOrder(o)}
                        style={{ fontSize: 11, color: "var(--ink-soft)", letterSpacing: ".08em", textTransform: "uppercase", background: "none", border: "none", borderBottom: "1px solid var(--line)", cursor: "pointer", padding: "0 0 1px" }}
                      >
                        Return
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
