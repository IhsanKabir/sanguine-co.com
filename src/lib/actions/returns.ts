"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { eq, and, or } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/auth-utils";

const returnSchema = z.object({
  orderId: z.string().uuid(),
  reason: z.string().min(1).max(500),
});

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function requestReturn(input: z.infer<typeof returnSchema>) {
  const user = await requireUser();
  const data = returnSchema.parse(input);

  const [order] = await db
    .select()
    .from(schema.orders)
    .where(
      and(
        eq(schema.orders.id, data.orderId),
        or(
          eq(schema.orders.guestEmail, user.email ?? ""),
          eq(schema.orders.customerId, user.id as unknown as string),
        ),
      ),
    );

  if (!order) return { ok: false as const, error: "Order not found." };
  if (order.status !== "delivered")
    return { ok: false as const, error: "Only delivered orders can be returned." };

  const ageMs = Date.now() - (order.createdAt?.getTime() ?? 0);
  if (ageMs > THIRTY_DAYS_MS)
    return { ok: false as const, error: "The 30-day return window has closed for this order." };

  await db
    .update(schema.orders)
    .set({
      status: "return_requested",
      notes: data.reason,
      updatedAt: new Date(),
    })
    .where(eq(schema.orders.id, data.orderId));

  revalidatePath("/[locale]/account", "page");
  return { ok: true as const };
}
