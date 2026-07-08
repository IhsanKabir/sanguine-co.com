import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { desc, inArray } from "drizzle-orm";
import { requirePermission } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

/**
 * CSV export of all orders + line items, for accounting / NBR retention.
 * Auth-gated by the `orders` permission. Returns a CSV with one row per
 * line item; the order-level fields are duplicated across the order's lines
 * so it can be opened in Excel as-is and pivot-tabled.
 */
export async function GET() {
  await requirePermission("orders");

  const orders = await db.select().from(schema.orders).orderBy(desc(schema.orders.createdAt));
  const orderIds = orders.map((o) => o.id);
  const lines = orderIds.length
    ? await db.select().from(schema.orderLines).where(inArray(schema.orderLines.orderId, orderIds))
    : [];

  const linesByOrder = new Map<string, typeof lines>();
  for (const l of lines) {
    const arr = linesByOrder.get(l.orderId) ?? [];
    arr.push(l);
    linesByOrder.set(l.orderId, arr);
  }

  // RFC 4180 CSV escaping plus formula-injection guard: cells starting with
  // =, +, -, @, tab, or CR can be interpreted as formulas by Excel/Sheets.
  // Prefix with a single quote to neutralise.
  const esc = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    let s = String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const headers = [
    "order_number",
    "order_date",
    "status",
    "payment_method",
    "customer_name",
    "customer_email",
    "customer_phone",
    "shipping_line1",
    "shipping_area",
    "shipping_city",
    "shipping_postcode",
    "courier",
    "tracking",
    "coupon_code",
    "coupon_discount_bdt",
    "subtotal_bdt",
    "shipping_bdt",
    "cod_fee_bdt",
    "total_bdt",
    "line_sku",
    "line_name",
    "line_color",
    "line_size",
    "line_qty",
    "line_unit_price_bdt",
    "line_total_bdt",
    "notes",
  ];

  const rows: string[] = [headers.join(",")];

  for (const o of orders) {
    const addr = (o.shippingAddress ?? {}) as {
      fullName?: string; phone?: string;
      line1?: string; area?: string; city?: string; postcode?: string;
    };
    const orderLines = linesByOrder.get(o.id) ?? [];
    if (orderLines.length === 0) {
      // Order with no lines — still emit a row so it's not lost from the export.
      rows.push([
        o.number, o.createdAt?.toISOString() ?? "", o.status, o.paymentMethod,
        addr.fullName ?? "", o.guestEmail ?? "", addr.phone ?? o.guestPhone ?? "",
        addr.line1 ?? "", addr.area ?? "", addr.city ?? "", addr.postcode ?? "",
        o.shippingCourier ?? "", o.shippingTracking ?? "",
        o.couponCode ?? "", o.couponDiscountBdt,
        o.subtotalBdt, o.shippingBdt, o.codFeeBdt, o.totalBdt,
        "", "", "", "", "", "", "",
        o.notes ?? "",
      ].map(esc).join(","));
      continue;
    }
    for (const l of orderLines) {
      rows.push([
        o.number, o.createdAt?.toISOString() ?? "", o.status, o.paymentMethod,
        addr.fullName ?? "", o.guestEmail ?? "", addr.phone ?? o.guestPhone ?? "",
        addr.line1 ?? "", addr.area ?? "", addr.city ?? "", addr.postcode ?? "",
        o.shippingCourier ?? "", o.shippingTracking ?? "",
        o.couponCode ?? "", o.couponDiscountBdt,
        o.subtotalBdt, o.shippingBdt, o.codFeeBdt, o.totalBdt,
        l.skuSnapshot, l.nameSnapshot, l.color ?? "", l.size ?? "",
        l.qty, l.unitPriceBdt, l.lineTotalBdt,
        o.notes ?? "",
      ].map(esc).join(","));
    }
  }

  const csv = rows.join("\r\n") + "\r\n";
  const filename = `sanguine-orders-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
