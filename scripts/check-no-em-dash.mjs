#!/usr/bin/env node
/**
 * House style: Sanguine never uses the em dash, in copy, code, comments or
 * docs (owner rule, 2026-10-27). Fails when any tracked text file contains
 * one, written literally or as an HTML/JS escape. Rewrite with a comma,
 * colon, full stop or brackets instead; never substitute an en dash.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const EM_DASH = new RegExp(["—", "&mdash;", "&#8212;", "&#x2014;", "\\\\u2014"].join("|"), "i");
const BINARY = /\.(png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|mp3|ogg|wav|mp4|pdf)$/i;

const files = execSync("git ls-files", { encoding: "utf8" })
  .split("\n")
  // This file must spell out the patterns it searches for.
  .filter((f) => f && !BINARY.test(f) && f !== "package-lock.json" && f !== "scripts/check-no-em-dash.mjs");

const hits = [];
for (const file of files) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  if (!EM_DASH.test(text)) continue;
  text.split("\n").forEach((line, i) => {
    if (EM_DASH.test(line)) hits.push(`${file}:${i + 1}: ${line.trim().slice(0, 120)}`);
  });
}

if (hits.length > 0) {
  console.error(`Em dash found in ${hits.length} line(s). House style forbids it; use a comma, colon, full stop or brackets:\n`);
  for (const h of hits) console.error(`  ${h}`);
  process.exit(1);
}
console.log(`No em dashes in ${files.length} tracked files.`);
