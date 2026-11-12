/**
 * Small CSV reader for the Admin bulk import. Lives outside the server
 * action file so it can be tested on its own ("use server" files may only
 * export async functions).
 */

/**
 * Parse a single CSV line, respecting quoted fields and escaped quotes ("").
 * Returns the array of cell values for that line. RFC-4180-shaped.
 */
export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { cur += c; }
    } else {
      if (c === ',') { out.push(cur); cur = ""; }
      else if (c === '"' && cur === "") { inQuotes = true; }
      else { cur += c; }
    }
  }
  out.push(cur);
  return out;
}

/**
 * Tokenise the entire CSV body into rows, handling embedded newlines inside
 * quoted cells. Returns header + rows split. Headers are lower-cased.
 */
export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  // Drop a byte-order mark (Excel adds one) and normalise line endings.
  const body = text.replace(/^﻿/, "").replace(/\r\n/g, "\n");
  const lines: string[] = [];
  let buf = "";
  let inQuotes = false;
  for (const ch of body) {
    if (ch === '"') inQuotes = !inQuotes;
    if (ch === "\n" && !inQuotes) {
      if (buf.trim().length > 0) lines.push(buf);
      buf = "";
      continue;
    }
    buf += ch;
  }
  if (buf.trim().length > 0) lines.push(buf);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const rows = lines.slice(1).map(parseCsvLine);
  return { headers, rows };
}
