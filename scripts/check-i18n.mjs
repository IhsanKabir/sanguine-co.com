#!/usr/bin/env node
/**
 * Translation check (run in CI next to typecheck + lint).
 *
 * Fails when:
 *  1. en.json and bn.json do not have exactly the same keys — a key missing
 *     from bn.json makes next-intl print the raw key ("pdp.save") on the
 *     Bangla site;
 *  2. the code calls t("some.key") / t.rich("some.key") with a literal key
 *     that does not exist in en.json.
 *
 * Keys built at runtime (t(`orderStatus.${s}`), t(row.label)) cannot be seen
 * here; those call sites guard with t.has() or use fixed key lists.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const load = (l) => JSON.parse(readFileSync(join(root, `src/messages/${l}.json`), "utf8"));

function flatten(obj, prefix = "", out = new Set()) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") flatten(v, key, out);
    else out.add(key);
  }
  return out;
}

const en = flatten(load("en"));
const bn = flatten(load("bn"));
const errors = [];

for (const k of en) if (!bn.has(k)) errors.push(`bn.json is missing "${k}"`);
for (const k of bn) if (!en.has(k)) errors.push(`en.json is missing "${k}" (present in bn.json)`);

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (/\.(tsx?|jsx?)$/.test(name)) yield p;
  }
}

// t("a.b"), t.rich("a.b"), tm("a.b"), tr("a.b") — the translator names used in src/.
const CALL = /\b(?:t|tm|tr)(?:\.rich)?\(\s*"([A-Za-z0-9_.-]+)"/g;
for (const file of walk(join(root, "src"))) {
  // Admin pages and the tracking page use their own helpers named `t`
  // that take literal text, not message keys.
  if (file.includes("/admin/") || file.endsWith("/track/page.tsx")) continue;
  const src = readFileSync(file, "utf8");
  for (const m of src.matchAll(CALL)) {
    const key = m[1];
    if (!key.includes(".")) continue; // not a message key
    if (!en.has(key)) errors.push(`${file.replace(root, "")}: unknown message key "${key}"`);
  }
}

if (errors.length) {
  console.error(`i18n check failed (${errors.length}):\n  ` + errors.join("\n  "));
  process.exit(1);
}
console.log(`i18n check passed: ${en.size} keys in en.json and bn.json.`);
