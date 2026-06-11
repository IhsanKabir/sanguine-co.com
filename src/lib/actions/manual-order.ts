"use server";

import { z } from "zod";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { eq, sql, inArray, and } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requirePermission } from "@/lib/auth-utils";
import { logOrderEvent } from "@/lib/order-events";
import { sendEmail } from "@/lib/email/brevo";
import { orderPlacedEmail, type OrderEmailLine } from "@/lib/email/templates";

import { SITE_URL } from "@/lib/site-url";

const itemSchema = z.object({
  productId: z.string().min(1).max(120),
  qty: z.number().int().min(1).max(50),
  color: z.string().max(40).optional().nullable(),
  size: z.string().max(40).optional().nullable(),
});

const manualSchema = z.object({
  customer: z.object({
    fullName: z.string().min(1).max(120),
    email: z.string().email(),
    phone: z.string().min(6).max(40),
  }),
  shipping: z.object({
    line1: z.string().min(1).max(200),
    area: z.string().max(80).optional().nullable(),
    city: z.string().min(1).max(80),
    postcode: z.string().max(20).optional().nullable(),
  }),
  items: z.array(itemSchema).min(1).max(50),
  shippingBdt: z.number().int().min(0).max(10_000).default(0),
  notes: z.string().max(2000).optional().nullable(),
  /** When true, send the customer the standard COD confirmation email. */
  sendCustomerEmail: z.boolean().default(true),
});

export async function createManualOrder(input: z.infer<typeof manualSchema>) {
  const ctx = await requirePermission("orders");
  const data = manualSchema.parse(input);

  // Re-fetch product prices server-side. Same anti-tampering guarantee as the storefront flow.
  const productIds = data.items.map((i) => i.productId);
  const products = await db.select().from(schema.products).where(inArray(schema.products.id, productIds));
  const byId = new Map(products.map((p) => [p.id, p]));

  type Line = {
    productId: string;
    nameSnapshot: string;
    skuSnapshot: string;
    color: string | null;
    size: string | null;
    qty: number;
    unitPriceBdt: number;
    lineTotalBdt: number;
  };
  const lines: Line[] = [];
  let subtotal = 0;
  for (const item of data.items) {
    const p = byId.get(item.productId);
    if (!p) return { ok: false as const, error: `Product ${item.productId} not found` };
    if (p.stock < item.qty) return { ok: false as const, error: `${p.name} — only ${p.stock} in stock` };
    const lineTotal = p.priceBdt * item.qty;
    subtotal += lineTotal;
    lines.push({
      productId: p.id,
      nameSnapshot: p.name,
      skuSnapshot: p.sku,
      color: item.color || null,
      size: item.size || null,
      qty: item.qty,
      unitPriceBdt: p.priceBdt,
      lineTotalBdt: lineTotal,
    });
  }

  const total = subtotal + data.shippingBdt;
  const number = `SSG-MX-${Date.now().toString(36).toUpperCase()}`;
  const trackingToken = randomBytes(16).toString("hex");

  let order: typeof schema.orders.$inferSelect;
  try {
    order = await db.transaction(async (tx) => {
      const [o] = await tx.insert(schema.orders).values({
        number,
        guestEmail: data.customer.email,
        guestPhone: data.customer.phone,
        status: "cod_pending",
        paymentMethod: "cod",
        subtotalBdt: subtotal,
        shippingBdt: data.shippingBdt,
        codFeeBdt: 0,
        totalBdt: total,
        shippingAddress: { fullName: data.customer.fullName, phone: data.customer.phone, ...data.shipping },
        trackingToken,
        notes: data.notes ? `[manual] ${data.notes}` : `[manual] phone-in order created by ${ctx.user.email ?? ctx.user.id}`,
      }).returning();

      await tx.insert(schema.orderLines).values(lines.map((l) => ({ ...l, orderId: o.id })));

      for (const l of lines) {
        // Atomic stock decrement with guard — abort the transaction if a
        // concurrent order took the unit between read and write.
        const updated = await tx.update(schema.products)
          .set({ stock: sql`${schema.products.stock} - ${l.qty}` })
          .where(and(eq(schema.products.id, l.productId), sql`${schema.products.stock} >= ${l.qty}`))
          .returning({ id: schema.products.id });
        if (updated.length === 0) {
          throw new Error(`OUT_OF_STOCK:${l.nameSnapshot}`);
        }
        await tx.insert(schema.inventoryLog).values({
          productId: l.productId,
          delta: -l.qty,
          reason: "order",
          referenceId: o.id,
          actorId: ctx.user.id,
        });
      }
      return o;
    });
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("OUT_OF_STOCK:")) {
      return { ok: false as const, error: `${e.message.slice("OUT_OF_STOCK:".length)} sold out before the manual order could be saved.` };
    }
    throw e;
  }

  await logOrderEvent({
    orderId: order.id,
    type: "created",
    payload: { number, total, payment: "cod", channel: "manual" },
  });

  if (data.sendCustomerEmail) {
    const emailLines: OrderEmailLine[] = lines.map((l) => ({
      name: l.nameSnapshot, qty: l.qty, lineTotalBdt: l.lineTotalBdt, color: l.color, size: l.size,
    }));
    const { subject, html } = orderPlacedEmail({
      number,
      customerName: data.customer.fullName,
      customerEmail: data.customer.email,
      customerPhone: data.customer.phone,
      shippingAddress: {
        line1: data.shipping.line1,
        area: data.shipping.area || undefined,
        city: data.shipping.city,
        postcode: data.shipping.postcode || undefined,
      },
      lines: emailLines,
      subtotalBdt: subtotal,
      shippingBdt: data.shippingBdt,
      codFeeBdt: 0,
      totalBdt: total,
      paymentMethod: "cod",
      trackingUrl: `${SITE_URL}/en/order/${number}/track?t=${trackingToken}`,
    });
    sendEmail({ to: data.customer.email, toName: data.customer.fullName, subject, html })
      .then((r) => logOrderEvent({
        orderId: order.id,
        type: "email_sent",
        payload: { subject, to: data.customer.email, ok: r.ok, error: r.error ?? null },
      }))
      .catch(() => {});
  }

  revalidatePath("/[locale]/admin/orders", "page");
  return { ok: true as const, orderId: order.id, number };
}
