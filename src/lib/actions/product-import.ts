"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-utils";
import { slugify } from "@/lib/utils";
import { variantsFor } from "@/lib/variant-stock";
import { parseCsv } from "@/lib/csv";

const REQUIRED = ["sku", "name", "segment_id", "price_bdt", "stock"] as const;
const OPTIONAL = [
  "name_bn", "was_bdt", "tag", "description", "description_bn",
  "details", "details_bn", "care", "care_bn", "colors", "sizes",
] as const;
const ALL_COLUMNS = [...REQUIRED, ...OPTIONAL];

type ParsedRow = {
  rowIndex: number;
  sku: string;
  name: string;
  nameBn: string | null;
  segmentId: string;
  priceBdt: number;
  wasBdt: number | null;
  stock: number;
  tag: string | null;
  description: string | null;
  descriptionBn: string | null;
  details: string | null;
  detailsBn: string | null;
  care: string | null;
  careBn: string | null;
  colors: string[];
  sizes: string[];
  errors: string[];
};

const importInputSchema = z.object({
  csv: z.string().min(1).max(2_000_000),     // ~2 MB cap
  commit: z.boolean().default(false),
});

export type ImportPreview = {
  ok: boolean;
  totalRows: number;
  validRows: number;
  toCreate: number;
  toUpdate: number;
  errors: { row: number; messages: string[] }[];
  /** Rows that would be acted on, with their parsed fields, so the UI can show a preview table. */
  preview: ParsedRow[];
  committed: boolean;
};

/**
 * Parse + validate (and optionally commit) a CSV bulk product import.
 *
 * Behaviour:
 *   - First pass = dry run; returns a full preview + per-row errors.
 *   - Second pass with `commit: true` writes the rows.
 *   - Match logic: if `sku` already exists, the row is an UPDATE (only the
 *     columns supplied in the CSV are written, so a stock-only sheet keeps
 *     the descriptions). If `sku` is new, it's a CREATE.
 *   - Bad rows are skipped (never block the good rows).
 */
export async function importProductsCsv(input: z.infer<typeof importInputSchema>): Promise<ImportPreview> {
  await requireAdmin();
  const data = importInputSchema.parse(input);

  const { headers, rows } = parseCsv(data.csv);
  const result: ImportPreview = {
    ok: true,
    totalRows: rows.length,
    validRows: 0,
    toCreate: 0,
    toUpdate: 0,
    errors: [],
    preview: [],
    committed: false,
  };

  // Validate headers.
  const missing = REQUIRED.filter((c) => !headers.includes(c));
  if (missing.length > 0) {
    result.ok = false;
    result.errors.push({ row: 0, messages: [`Missing required columns: ${missing.join(", ")}`] });
    return result;
  }
  const unknown = headers.filter((h) => h && !ALL_COLUMNS.includes(h as never));
  if (unknown.length > 0) {
    // Warning, not fatal: we just ignore extra columns.
    result.errors.push({ row: 0, messages: [`Ignoring unknown columns: ${unknown.join(", ")}`] });
  }

  const colIdx = (name: string) => headers.indexOf(name);
  const has = (name: string) => colIdx(name) >= 0;
  /** Optional text cell: null when the column is missing or the cell is empty. */
  const optText = (row: string[], name: string) => (has(name) ? ((row[colIdx(name)] ?? "").trim() || null) : null);

  // Validate segment IDs once.
  const validSegments = new Set(
    (await db.select({ id: schema.segments.id }).from(schema.segments)).map((s) => s.id),
  );

  const parsed: ParsedRow[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const errs: string[] = [];
    const sku = (row[colIdx("sku")] ?? "").trim().toUpperCase();
    const name = (row[colIdx("name")] ?? "").trim();
    const segmentId = (row[colIdx("segment_id")] ?? "").trim();
    const priceRaw = (row[colIdx("price_bdt")] ?? "").trim();
    const stockRaw = (row[colIdx("stock")] ?? "").trim();

    if (!sku) errs.push("sku is required");
    if (!name) errs.push("name is required");
    if (!segmentId) errs.push("segment_id is required");
    else if (!validSegments.has(segmentId)) errs.push(`segment_id '${segmentId}' does not exist`);
    const priceBdt = parseInt(priceRaw, 10);
    // ৳0 placeholders caused the zero-price checkout hole: CSV rows import as
    // buy-now products, so they need a real price. Preorder-only/quotation
    // pieces are configured in the product editor, not via CSV.
    if (!Number.isFinite(priceBdt) || priceBdt < 1) errs.push("price_bdt must be a positive integer (৳1 or more)");
    const stock = parseInt(stockRaw, 10);
    if (!Number.isFinite(stock) || stock < 0) errs.push("stock must be a non-negative integer");

    const wasBdtRaw = colIdx("was_bdt") >= 0 ? (row[colIdx("was_bdt")] ?? "").trim() : "";
    const wasBdt = wasBdtRaw ? parseInt(wasBdtRaw, 10) : null;
    if (wasBdtRaw && (!Number.isFinite(wasBdt) || (wasBdt as number) < 0)) errs.push("was_bdt must be a non-negative integer");

    const colors = colIdx("colors") >= 0
      ? (row[colIdx("colors")] ?? "").split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    const sizes = colIdx("sizes") >= 0
      ? (row[colIdx("sizes")] ?? "").split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    parsed.push({
      rowIndex: i + 2,                     // 1-based, +1 for header
      sku,
      name,
      nameBn: colIdx("name_bn") >= 0 ? ((row[colIdx("name_bn")] ?? "").trim() || null) : null,
      segmentId,
      priceBdt: Number.isFinite(priceBdt) ? priceBdt : 0,
      wasBdt: typeof wasBdt === "number" && Number.isFinite(wasBdt) ? wasBdt : null,
      stock: Number.isFinite(stock) ? stock : 0,
      tag: colIdx("tag") >= 0 ? ((row[colIdx("tag")] ?? "").trim() || null) : null,
      description: colIdx("description") >= 0 ? ((row[colIdx("description")] ?? "").trim() || null) : null,
      descriptionBn: colIdx("description_bn") >= 0 ? ((row[colIdx("description_bn")] ?? "").trim() || null) : null,
      details: optText(row, "details"),
      detailsBn: optText(row, "details_bn"),
      care: optText(row, "care"),
      careBn: optText(row, "care_bn"),
      colors,
      sizes,
      errors: errs,
    });
    if (errs.length > 0) result.errors.push({ row: i + 2, messages: errs });
  }

  const valid = parsed.filter((p) => p.errors.length === 0);
  result.validRows = valid.length;
  result.preview = parsed.slice(0, 50);   // cap the preview to keep payload small

  if (valid.length === 0) {
    return result;
  }

  // Match against existing SKUs to decide create vs update.
  const validSkus = valid.map((p) => p.sku);
  const existing = await db.select({ id: schema.products.id, sku: schema.products.sku }).from(schema.products).where(inArray(schema.products.sku, validSkus));
  const existingBySku = new Map(existing.map((e) => [e.sku, e.id]));
  result.toCreate = valid.filter((p) => !existingBySku.has(p.sku)).length;
  result.toUpdate = valid.length - result.toCreate;

  if (!data.commit) {
    return result;
  }

  // Pieces counted per size/colour keep their stock: the CSV has one stock
  // column, and writing it would put the total out of step with the options.
  const tracked = await variantsFor(existing.map((e) => e.id));

  // Commit. Wrap in a transaction so partial failures roll back cleanly.
  await db.transaction(async (tx) => {
    for (const p of valid) {
      const existingId = existingBySku.get(p.sku);
      if (existingId) {
        // Only the optional columns present in this sheet are written: one
        // without a description column must not wipe the descriptions.
        const optional = {
          ...(has("name_bn") ? { nameBn: p.nameBn } : {}),
          ...(has("was_bdt") ? { wasBdt: p.wasBdt } : {}),
          ...(has("tag") ? { tag: p.tag } : {}),
          ...(has("description") ? { description: p.description } : {}),
          ...(has("description_bn") ? { descriptionBn: p.descriptionBn } : {}),
          ...(has("details") ? { details: p.details } : {}),
          ...(has("details_bn") ? { detailsBn: p.detailsBn } : {}),
          ...(has("care") ? { care: p.care } : {}),
          ...(has("care_bn") ? { careBn: p.careBn } : {}),
          ...(has("colors") ? { colors: p.colors } : {}),
          ...(has("sizes") ? { sizes: p.sizes } : {}),
        };
        await tx.update(schema.products).set({
          ...(tracked.has(existingId) ? {} : { stock: p.stock }),
          name: p.name,
          slug: slugify(p.name),
          segmentId: p.segmentId,
          priceBdt: p.priceBdt,
          ...optional,
        }).where(eq(schema.products.id, existingId));
      } else {
        const id = `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        await tx.insert(schema.products).values({
          id,
          sku: p.sku,
          name: p.name,
          nameBn: p.nameBn,
          slug: slugify(p.name),
          segmentId: p.segmentId,
          priceBdt: p.priceBdt,
          wasBdt: p.wasBdt,
          stock: p.stock,
          tag: p.tag,
          description: p.description,
          descriptionBn: p.descriptionBn,
          details: p.details,
          detailsBn: p.detailsBn,
          care: p.care,
          careBn: p.careBn,
          colors: p.colors,
          sizes: p.sizes,
        });
      }
    }
  });

  result.committed = true;
  revalidatePath("/[locale]/admin/products", "page");
  revalidatePath("/[locale]", "layout");
  return result;
}
