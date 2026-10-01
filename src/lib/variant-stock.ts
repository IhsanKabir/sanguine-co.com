import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { ProductVariant } from "@/lib/schema";

/**
 * Stock per option (size / colour). Every stock movement goes through here.
 *
 * A product either has variant rows ("tracked per option") or it doesn't
 * (one stock number, as before). For tracked products, products.stock is
 * kept equal to the sum of the rows, so every page that reads a single
 * stock number (cards, admin dashboard, JSON-LD, back-in-stock) still sees
 * the right total without knowing variants exist.
 *
 * Colour/size are stored as '' when absent; cart lines carry null.
 */

type Db = typeof db;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type Q = Db | Tx;

export type StockLine = {
  productId: string;
  color?: string | null;
  size?: string | null;
  qty: number;
};

const norm = (v: string | null | undefined) => (v ?? "").trim();

/** Human label for an option: "M", "Rose", "Rose · M". */
export function optionLabel(color?: string | null, size?: string | null): string {
  return [norm(color), norm(size)].filter(Boolean).join(" · ");
}

/**
 * Every option a product offers: colours × sizes, either side may be absent.
 * A product with neither has no options (and can't be tracked per option).
 */
export function optionCombos(colors: string[] | null | undefined, sizes: string[] | null | undefined): { color: string; size: string }[] {
  const cs = (colors ?? []).map(norm).filter(Boolean);
  const ss = (sizes ?? []).map(norm).filter(Boolean);
  if (cs.length === 0 && ss.length === 0) return [];
  const out: { color: string; size: string }[] = [];
  for (const color of cs.length ? cs : [""]) for (const size of ss.length ? ss : [""]) out.push({ color, size });
  return out;
}

/** Variant rows for these products, grouped by product id. */
export async function variantsFor(productIds: string[], q: Q = db): Promise<Map<string, ProductVariant[]>> {
  const out = new Map<string, ProductVariant[]>();
  if (productIds.length === 0) return out;
  const rows = await q.select().from(schema.productVariants)
    .where(inArray(schema.productVariants.productId, productIds));
  for (const r of rows) {
    const list = out.get(r.productId) ?? [];
    list.push(r);
    out.set(r.productId, list);
  }
  return out;
}

/** The storefront's view: { "color|size": stock } for one product, or null if not tracked per option. */
export async function optionStock(productId: string): Promise<Record<string, number> | null> {
  const rows = (await variantsFor([productId])).get(productId);
  if (!rows || rows.length === 0) return null;
  return Object.fromEntries(rows.map((r) => [`${r.color}|${r.size}`, r.stock]));
}

/**
 * Pre-check before an order transaction: a friendly message for the first
 * line that cannot be filled, or null. The transaction's guarded updates
 * (takeStock) remain the real protection against races.
 */
export async function checkOptionStock(
  lines: (StockLine & { name: string; productStock: number })[],
): Promise<string | null> {
  const variants = await variantsFor([...new Set(lines.map((l) => l.productId))]);
  // Two cart lines for the same option add up.
  const wanted = new Map<string, number>();
  for (const l of lines) {
    const k = `${l.productId}|${norm(l.color)}|${norm(l.size)}`;
    wanted.set(k, (wanted.get(k) ?? 0) + l.qty);
  }
  for (const l of lines) {
    const rows = variants.get(l.productId);
    if (!rows || rows.length === 0) {
      if (l.productStock < l.qty) return `${l.name} — only ${l.productStock} in stock`;
      continue;
    }
    // A line missing a side the piece is counted by (a size, a colour).
    if (rows.some((r) => r.size) && !norm(l.size)) return `${l.name}: please choose a size.`;
    if (rows.some((r) => r.color) && !norm(l.color)) return `${l.name}: please choose a colour.`;
    const row = rows.find((r) => r.color === norm(l.color) && r.size === norm(l.size));
    const label = optionLabel(l.color, l.size);
    if (!row) {
      return label
        ? `${l.name} is not available in ${label}. Please choose another option.`
        : `${l.name}: please choose a size or colour.`;
    }
    const need = wanted.get(`${l.productId}|${row.color}|${row.size}`) ?? l.qty;
    if (row.stock < need) {
      return row.stock === 0
        ? `${l.name} in ${label} is sold out.`
        : `${l.name} in ${label} — only ${row.stock} left.`;
    }
  }
  return null;
}

/**
 * Take stock for one order line inside a transaction. Throws
 * `OUT_OF_STOCK:<name>` when the option or the product total cannot cover
 * it (a concurrent order took the last unit), which aborts the transaction.
 */
export async function takeStock(tx: Tx, line: StockLine & { name: string }): Promise<void> {
  const color = norm(line.color);
  const size = norm(line.size);
  const label = optionLabel(color, size);

  const hit = await tx.update(schema.productVariants)
    .set({ stock: sql`${schema.productVariants.stock} - ${line.qty}`, updatedAt: new Date() })
    .where(and(
      eq(schema.productVariants.productId, line.productId),
      eq(schema.productVariants.color, color),
      eq(schema.productVariants.size, size),
      sql`${schema.productVariants.stock} >= ${line.qty}`,
    ))
    .returning({ id: schema.productVariants.id });

  if (hit.length === 0) {
    // No row moved: either this option is out (product tracked per option)
    // or the product isn't tracked per option at all (fall through).
    const [{ n }] = await tx.select({ n: sql<number>`count(*)::int` })
      .from(schema.productVariants)
      .where(eq(schema.productVariants.productId, line.productId));
    if (n > 0) throw new Error(`OUT_OF_STOCK:${label ? `${line.name} (${label})` : line.name}`);
  }

  const total = await tx.update(schema.products)
    .set({ stock: sql`${schema.products.stock} - ${line.qty}` })
    .where(and(eq(schema.products.id, line.productId), sql`${schema.products.stock} >= ${line.qty}`))
    .returning({ id: schema.products.id });
  if (total.length === 0) throw new Error(`OUT_OF_STOCK:${line.name}`);
}

/** Give stock back for one order line (cancellation, unpaid release). */
export async function returnStock(q: Q, line: StockLine): Promise<void> {
  // Only an existing option row gets it back; if the option was removed
  // since, the unit still returns to the product total.
  await q.update(schema.productVariants)
    .set({ stock: sql`${schema.productVariants.stock} + ${line.qty}`, updatedAt: new Date() })
    .where(and(
      eq(schema.productVariants.productId, line.productId),
      eq(schema.productVariants.color, norm(line.color)),
      eq(schema.productVariants.size, norm(line.size)),
    ));
  await q.update(schema.products)
    .set({ stock: sql`${schema.products.stock} + ${line.qty}` })
    .where(eq(schema.products.id, line.productId));
}

/**
 * Admin: set the counted stock of every option at once. Options not in
 * `rows` are removed; products.stock becomes the sum. Logged as one
 * inventory adjustment of the difference. Returns the new total.
 */
export async function setOptionStock(
  productId: string,
  rows: { color: string; size: string; stock: number }[],
  actorId?: string | null,
): Promise<number> {
  const clean = rows.map((r) => ({ color: norm(r.color), size: norm(r.size), stock: Math.max(0, Math.floor(r.stock)) }));
  return db.transaction(async (tx) => {
    const [p] = await tx.select({ stock: schema.products.stock }).from(schema.products)
      .where(eq(schema.products.id, productId)).for("update");
    if (!p) throw new Error("Product not found");

    const keep = clean.map((r) => `${r.color}|${r.size}`);
    if (keep.length > 0) {
      await tx.delete(schema.productVariants).where(and(
        eq(schema.productVariants.productId, productId),
        notInArray(sql`${schema.productVariants.color} || '|' || ${schema.productVariants.size}`, keep),
      ));
    } else {
      await tx.delete(schema.productVariants).where(eq(schema.productVariants.productId, productId));
    }
    for (const r of clean) {
      await tx.insert(schema.productVariants)
        .values({ productId, color: r.color, size: r.size, stock: r.stock })
        .onConflictDoUpdate({
          target: [schema.productVariants.productId, schema.productVariants.color, schema.productVariants.size],
          set: { stock: r.stock, updatedAt: new Date() },
        });
    }

    const total = clean.reduce((s, r) => s + r.stock, 0);
    await tx.update(schema.products).set({ stock: total }).where(eq(schema.products.id, productId));
    if (total !== p.stock) {
      await tx.insert(schema.inventoryLog).values({
        productId,
        delta: total - p.stock,
        reason: "adjustment",
        referenceId: "per-option count",
        actorId: actorId ?? null,
      });
    }
    return total;
  });
}

/** Admin: stop tracking per option. The product keeps its current total. */
export async function clearOptionStock(productId: string): Promise<void> {
  await db.delete(schema.productVariants).where(eq(schema.productVariants.productId, productId));
}

/** True when the product is tracked per option. */
export async function isTrackedPerOption(productId: string, q: Q = db): Promise<boolean> {
  const [{ n }] = await q.select({ n: sql<number>`count(*)::int` })
    .from(schema.productVariants)
    .where(eq(schema.productVariants.productId, productId));
  return n > 0;
}
