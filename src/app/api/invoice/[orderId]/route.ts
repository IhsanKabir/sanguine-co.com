import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { parseShippingAddress } from "@/lib/schema";
import { getCurrentUser } from "@/lib/auth-utils";
import { eq, or } from "drizzle-orm";

export const dynamic = "force-dynamic";

function fmt(n: number) {
  return "৳" + new Intl.NumberFormat("en-IN").format(n);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const [order] = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.id, orderId))
    .limit(1)
    .catch(() => []);

  if (!order) return new NextResponse("Not found", { status: 404 });

  const ownsOrder =
    (order.customerId && order.customerId === user.id) ||
    (order.guestEmail && order.guestEmail === user.email);

  if (!ownsOrder) return new NextResponse("Forbidden", { status: 403 });

  const lines = await db
    .select()
    .from(schema.orderLines)
    .where(eq(schema.orderLines.orderId, order.id))
    .catch(() => []);

  const addr = parseShippingAddress(order.shippingAddress);
  const placed = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString("en-BD", { day: "numeric", month: "long", year: "numeric" })
    : "—";

  const lineRows = lines
    .map(
      (l) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #e8e4de;font-size:13px">
        ${l.nameSnapshot}
        ${l.color || l.size ? `<span style="color:#888;margin-left:8px">· ${[l.color, l.size].filter(Boolean).join(" · ")}</span>` : ""}
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #e8e4de;font-size:13px;text-align:center;color:#666">${l.qty}</td>
      <td style="padding:10px 0;border-bottom:1px solid #e8e4de;font-size:13px;text-align:right">${fmt(l.unitPriceBdt)}</td>
      <td style="padding:10px 0;border-bottom:1px solid #e8e4de;font-size:13px;text-align:right;font-weight:500">${fmt(l.lineTotalBdt)}</td>
    </tr>`,
    )
    .join("");

  const discountRow =
    order.couponDiscountBdt && order.couponDiscountBdt > 0
      ? `<tr><td colspan="3" style="text-align:right;padding:6px 0;font-size:13px;color:#666">Discount${order.couponCode ? ` · ${order.couponCode}` : ""}</td><td style="text-align:right;padding:6px 0;font-size:13px;color:#2d7d46">− ${fmt(order.couponDiscountBdt)}</td></tr>`
      : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Invoice · ${order.number}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:system-ui,sans-serif;background:#faf9f6;color:#1a1520;padding:48px 40px;max-width:760px;margin:0 auto}
  .logo{font-family:'Cormorant Garamond',serif;font-size:32px;font-weight:500;color:#2d1b4e;letter-spacing:.04em}
  .logo sup{font-size:11px;letter-spacing:.2em;vertical-align:super;font-weight:400;color:#8b7bb0}
  .mono{font-family:'JetBrains Mono',monospace}
  .divider{border:none;border-top:1px solid #e0dbd6;margin:24px 0}
  table{width:100%;border-collapse:collapse}
  @media print{
    body{padding:24px;background:white}
    .no-print{display:none}
  }
</style>
</head>
<body>

<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px">
  <div>
    <div class="logo">Saanguine <sup>SSG</sup></div>
    <div class="mono" style="font-size:10px;letter-spacing:.2em;color:#8b7bb0;margin-top:6px;text-transform:uppercase">Invoice</div>
  </div>
  <div style="text-align:right">
    <div class="mono" style="font-size:18px;color:#2d1b4e;font-weight:500;letter-spacing:.12em">${order.number}</div>
    <div style="font-size:12px;color:#888;margin-top:4px">${placed}</div>
  </div>
</div>

<hr class="divider" />

<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:32px">
  <div>
    <div class="mono" style="font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#8b7bb0;margin-bottom:8px">Billed to</div>
    <div style="font-size:14px;line-height:1.6;color:#2d1b4e">
      ${addr.fullName ?? "—"}<br/>
      ${addr.line1 ?? ""}${addr.line2 ? ", " + addr.line2 : ""}<br/>
      ${addr.area ? addr.area + ", " : ""}${addr.city ?? ""}${addr.postcode ? " — " + addr.postcode : ""}<br/>
      ${addr.phone ?? ""}
    </div>
  </div>
  <div>
    <div class="mono" style="font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#8b7bb0;margin-bottom:8px">Order details</div>
    <div style="font-size:13px;line-height:1.8;color:#555">
      <span style="color:#2d1b4e;font-weight:500">Status:</span> ${order.status.replace("_", " ")}<br/>
      <span style="color:#2d1b4e;font-weight:500">Payment:</span> ${order.paymentMethod === "cod" ? "Cash on Delivery" : order.paymentMethod}<br/>
      ${order.shippingCourier ? `<span style="color:#2d1b4e;font-weight:500">Courier:</span> ${order.shippingCourier}<br/>` : ""}
      ${order.shippingTracking ? `<span style="color:#2d1b4e;font-weight:500">Tracking:</span> <span class="mono">${order.shippingTracking}</span>` : ""}
    </div>
  </div>
</div>

<table>
  <thead>
    <tr style="border-bottom:2px solid #2d1b4e">
      <th style="text-align:left;padding:8px 0;font-size:11px;letter-spacing:.1em;color:#8b7bb0;font-weight:400;font-family:'JetBrains Mono',monospace;text-transform:uppercase">Item</th>
      <th style="text-align:center;padding:8px 0;font-size:11px;letter-spacing:.1em;color:#8b7bb0;font-weight:400;font-family:'JetBrains Mono',monospace;text-transform:uppercase">Qty</th>
      <th style="text-align:right;padding:8px 0;font-size:11px;letter-spacing:.1em;color:#8b7bb0;font-weight:400;font-family:'JetBrains Mono',monospace;text-transform:uppercase">Unit</th>
      <th style="text-align:right;padding:8px 0;font-size:11px;letter-spacing:.1em;color:#8b7bb0;font-weight:400;font-family:'JetBrains Mono',monospace;text-transform:uppercase">Total</th>
    </tr>
  </thead>
  <tbody>${lineRows}</tbody>
</table>

<div style="margin-top:16px;padding-top:16px;border-top:1px solid #e0dbd6">
  <table>
    <tbody>
      <tr><td colspan="3" style="text-align:right;padding:4px 0;font-size:13px;color:#666">Subtotal</td><td style="text-align:right;padding:4px 0;font-size:13px;width:120px">${fmt(order.subtotalBdt)}</td></tr>
      ${discountRow}
      <tr><td colspan="3" style="text-align:right;padding:4px 0;font-size:13px;color:#666">Shipping</td><td style="text-align:right;padding:4px 0;font-size:13px">${order.shippingBdt === 0 ? "Free" : fmt(order.shippingBdt)}</td></tr>
      <tr style="border-top:2px solid #2d1b4e">
        <td colspan="3" style="text-align:right;padding:12px 0 4px;font-size:15px;font-weight:600;color:#2d1b4e">Total</td>
        <td style="text-align:right;padding:12px 0 4px;font-size:17px;font-weight:600;color:#2d1b4e">${fmt(order.totalBdt)}</td>
      </tr>
    </tbody>
  </table>
</div>

<hr class="divider" style="margin-top:32px" />
<p style="font-size:12px;color:#aaa;text-align:center;font-family:'JetBrains Mono',monospace;letter-spacing:.08em">
  Thank you for shopping at Saanguine Maison · concierge@saanguine.com
</p>

<div class="no-print" style="margin-top:28px;text-align:center">
  <button onclick="window.print()" style="background:#2d1b4e;color:#faf9f6;border:none;padding:10px 28px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;font-family:system-ui,sans-serif">
    Print / Save as PDF
  </button>
</div>

</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
