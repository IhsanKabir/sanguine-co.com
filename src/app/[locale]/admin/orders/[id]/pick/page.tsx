import { notFound } from "next/navigation";
import { db, schema } from "@/lib/db";
import { parseShippingAddress } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { setRequestLocale } from "next-intl/server";
import { requirePermission } from "@/lib/auth-utils";
import { formatBdt, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Packing slip",
  robots: { index: false, follow: false, nocache: true },
};

type Props = { params: Promise<{ id: string; locale: string }> };

/**
 * Print-friendly packing slip / pick list.
 *
 * Renders one A4-page-shaped sheet with: order number, date, customer +
 * delivery address, line items (SKU, name, color/size, qty), total, and a
 * signature/notes block at the foot. Triggered from the admin order drawer
 * via window.open() into a new tab so the courier-handler can simply
 * Ctrl/Cmd+P.
 *
 * Auth-gated by the `orders` permission. Hidden from indexers.
 */
export default async function PackingSlipPage({ params }: Props) {
  await requirePermission("orders");
  const { locale, id } = await params;
  setRequestLocale(locale);

  const [order] = await db.select().from(schema.orders).where(eq(schema.orders.id, id)).limit(1);
  if (!order) notFound();
  const lines = await db.select().from(schema.orderLines).where(eq(schema.orderLines.orderId, order.id));
  const addr = parseShippingAddress(order.shippingAddress);

  return (
    <>
      {/* Print-only stylesheet — applies on every render so Cmd/Ctrl+P just works. */}
      <style>{`
        @page { size: A4; margin: 16mm 14mm; }
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
        }
        .pack-slip {
          font-family: Georgia, serif;
          color: #1a1330;
          background: white;
          padding: 28px 32px;
          max-width: 760px;
          margin: 24px auto;
          border: 1px solid #d8ccaf;
        }
        .pack-slip .row { display: flex; justify-content: space-between; gap: 16px; }
        .pack-slip h1 { font-size: 24px; font-weight: 400; margin: 0; }
        .pack-slip h2 { font-size: 13px; font-weight: 500; margin: 0 0 6px; letter-spacing: .15em; text-transform: uppercase; color: #a07e2c; font-family: 'Courier New', monospace; }
        .pack-slip .order-number { font-family: 'Courier New', monospace; font-size: 18px; letter-spacing: .12em; }
        .pack-slip table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 13px; }
        .pack-slip th, .pack-slip td { padding: 8px 6px; border-bottom: 1px solid #e8d8a8; text-align: left; }
        .pack-slip th { background: #f9f4ec; font-weight: 500; }
        .pack-slip .total-row td { font-weight: 600; border-top: 2px solid #1a1330; border-bottom: none; padding-top: 12px; }
        .pack-slip .checkbox { display: inline-block; width: 14px; height: 14px; border: 1px solid #444; vertical-align: middle; }
        .pack-slip .sig-line { height: 40px; border-bottom: 1px solid #aaa; margin-top: 24px; }
      `}</style>

      <div className="pack-slip">
        <div className="row" style={{ borderBottom: "2px solid #1a1330", paddingBottom: 14, marginBottom: 18 }}>
          <div>
            <h1 style={{ fontStyle: "italic" }}>Sanguine</h1>
            <div style={{ fontFamily: "'Courier New', monospace", fontSize: 10, letterSpacing: ".4em", color: "#a07e2c", marginTop: 4 }}>
              MAISON · MMXXVI · DHAKA
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <h2>PACKING SLIP</h2>
            <div className="order-number">{order.number}</div>
            <div style={{ fontSize: 11, color: "#7a6a52", marginTop: 4 }}>
              {order.createdAt ? formatDate(new Date(order.createdAt)) : ""}
            </div>
          </div>
        </div>

        <div className="row">
          <div style={{ flex: 1 }}>
            <h2>Deliver to</h2>
            <div style={{ fontSize: 14, lineHeight: 1.6 }}>
              <b>{addr.fullName ?? "—"}</b><br />
              {addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}<br />
              {addr.area ? `${addr.area}, ` : ""}{addr.city}{addr.postcode ? ` — ${addr.postcode}` : ""}<br />
              {addr.phone}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <h2>Payment</h2>
            <div style={{ fontSize: 14, lineHeight: 1.6 }}>
              <b style={{ textTransform: "capitalize" }}>{order.paymentMethod}</b>{order.paymentMethod === "cod" && <> &mdash; collect <b>{formatBdt(order.totalBdt)}</b></>}<br />
              {order.shippingCourier && <>Courier: <span style={{ textTransform: "capitalize" }}>{order.shippingCourier}</span><br /></>}
              {order.shippingTracking && <>Tracking: <span style={{ fontFamily: "'Courier New', monospace" }}>{order.shippingTracking}</span></>}
            </div>
          </div>
        </div>

        <h2 style={{ marginTop: 22 }}>Pieces ({lines.reduce((s, l) => s + l.qty, 0)} units)</h2>
        <table>
          <thead>
            <tr>
              <th style={{ width: 24 }}>✓</th>
              <th style={{ width: 90 }}>SKU</th>
              <th>Piece</th>
              <th style={{ width: 60, textAlign: "center" }}>Qty</th>
              <th style={{ width: 100, textAlign: "right" }}>Line</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id}>
                <td><span className="checkbox" /></td>
                <td style={{ fontFamily: "'Courier New', monospace", fontSize: 11 }}>{l.skuSnapshot}</td>
                <td>
                  {l.nameSnapshot}
                  {(l.color || l.size) && (
                    <div style={{ fontSize: 11, color: "#7a6a52", marginTop: 2 }}>
                      {[l.color, l.size].filter(Boolean).join(" · ")}
                    </div>
                  )}
                </td>
                <td style={{ textAlign: "center", fontWeight: 600 }}>{l.qty}</td>
                <td style={{ textAlign: "right" }}>{formatBdt(l.lineTotalBdt)}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={3} style={{ textAlign: "right", color: "#7a6a52" }}>Subtotal</td>
              <td colSpan={2} style={{ textAlign: "right" }}>{formatBdt(order.subtotalBdt)}</td>
            </tr>
            {order.couponDiscountBdt > 0 && (
              <tr>
                <td colSpan={3} style={{ textAlign: "right", color: "#7a6a52" }}>
                  Coupon{order.couponCode ? ` (${order.couponCode})` : ""}
                </td>
                <td colSpan={2} style={{ textAlign: "right" }}>− {formatBdt(order.couponDiscountBdt)}</td>
              </tr>
            )}
            <tr>
              <td colSpan={3} style={{ textAlign: "right", color: "#7a6a52" }}>Shipping</td>
              <td colSpan={2} style={{ textAlign: "right" }}>{order.shippingBdt === 0 ? "Complimentary" : formatBdt(order.shippingBdt)}</td>
            </tr>
            {order.codFeeBdt > 0 && (
              <tr>
                <td colSpan={3} style={{ textAlign: "right", color: "#7a6a52" }}>COD handling</td>
                <td colSpan={2} style={{ textAlign: "right" }}>{formatBdt(order.codFeeBdt)}</td>
              </tr>
            )}
            <tr className="total-row">
              <td colSpan={3} style={{ textAlign: "right" }}>Total to collect</td>
              <td colSpan={2} style={{ textAlign: "right", fontSize: 16 }}>{formatBdt(order.totalBdt)}</td>
            </tr>
          </tbody>
        </table>

        {order.notes && (
          <div style={{ marginTop: 22, padding: 12, background: "#f9f4ec", border: "1px solid #e8d8a8" }}>
            <h2 style={{ marginBottom: 6 }}>Notes</h2>
            <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{order.notes}</div>
          </div>
        )}

        <div className="row" style={{ marginTop: 36 }}>
          <div style={{ flex: 1 }}>
            <h2>Picked + packed by</h2>
            <div className="sig-line"></div>
          </div>
          <div style={{ flex: 1 }}>
            <h2>Handed to courier on</h2>
            <div className="sig-line"></div>
          </div>
        </div>
      </div>

      <div className="no-print" style={{ textAlign: "center", margin: "16px 0 32px", color: "var(--ink-soft)", fontSize: 13 }}>
        Use <kbd style={{ padding: "2px 6px", background: "#f4ecd8", border: "1px solid #d8ccaf", fontFamily: "var(--mono)", fontSize: 11 }}>Cmd/Ctrl + P</kbd> to print, or save as PDF.
      </div>
    </>
  );
}
