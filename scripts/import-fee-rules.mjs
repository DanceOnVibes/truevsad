#!/usr/bin/env node
/**
 * Turns data/fee-rules/fee-rules.csv into data/fee-rules/fee-rules.sql.
 *
 *   pnpm import-rules
 *
 * Checks every row first and refuses to write anything if one is wrong.
 * The SQL is an UPSERT: running it again updates rules instead of duplicating them.
 * Paste the SQL into the Supabase SQL Editor (or ask Claude to apply it).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const csvPath = join(root, "data/fee-rules/fee-rules.csv");
const sqlPath = join(root, "data/fee-rules/fee-rules.sql");

const CATEGORIES = ["party_extra", "levy", "entry_doc", "door_to_door", "payment_fx"];
const UNITS = [
  "per_party", "per_person", "per_adult", "per_child",
  "per_person_per_night", "per_adult_per_night",
];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Minimal RFC 4180 CSV parser (handles quotes, commas and newlines in quotes). */
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); if (row.some((f) => f.trim() !== "")) rows.push(row); }
  return rows;
}

const q = (s) => (s === null || s === undefined || s === "" ? "null" : `'${String(s).replace(/'/g, "''")}'`);

const rows = parseCsv(readFileSync(csvPath, "utf8").replace(/^﻿/, ""));
const header = rows.shift()?.map((h) => h.trim()) ?? [];
const expected = [
  "category", "label", "unit", "amount_gbp", "percent", "min_age", "max_age",
  "supplier_name", "region", "confidence", "source_url", "source_note", "valid_from", "valid_to",
];
if (expected.some((h, i) => header[i] !== h)) {
  console.error(`Header must be exactly:\n${expected.join(",")}`);
  process.exit(1);
}

const errors = [];
const values = [];

rows.forEach((cells, idx) => {
  const line = idx + 2;
  const r = Object.fromEntries(expected.map((h, i) => [h, (cells[i] ?? "").trim()]));
  const err = (m) => errors.push(`Line ${line} (${r.label || "no label"}): ${m}`);

  if (!CATEGORIES.includes(r.category)) err(`category must be one of ${CATEGORIES.join(", ")}`);
  if (!r.label || r.label.length > 160) err("label is required (max 160 chars)");
  if (!UNITS.includes(r.unit)) err(`unit must be one of ${UNITS.join(", ")}`);

  const hasAmount = r.amount_gbp !== "", hasPercent = r.percent !== "";
  if (hasAmount === hasPercent) err("fill exactly one of amount_gbp or percent");
  let amountPence = null, amountBp = null;
  if (hasAmount) {
    if (!/^\d+(\.\d{1,2})?$/.test(r.amount_gbp)) err("amount_gbp must look like 12 or 12.50 (no £ sign)");
    else amountPence = Math.round(parseFloat(r.amount_gbp) * 100);
  }
  if (hasPercent) {
    const p = parseFloat(r.percent);
    if (!/^\d+(\.\d{1,2})?$/.test(r.percent) || p > 100) err("percent must be 0–100, e.g. 2.99");
    else amountBp = Math.round(p * 100);
  }

  for (const k of ["min_age", "max_age"]) {
    if (r[k] !== "" && !(/^\d+$/.test(r[k]) && +r[k] <= 120)) err(`${k} must be a whole number 0–120`);
  }
  if (r.min_age !== "" && r.max_age !== "" && +r.min_age > +r.max_age) err("min_age is above max_age");

  const conf = parseFloat(r.confidence);
  if (!(conf >= 0 && conf <= 1)) err("confidence must be between 0 and 1");
  if (!/^https?:\/\//.test(r.source_url)) err("source_url is required and must start with http(s)://");
  if (!r.source_note) err("source_note is required (what the source says + date checked)");
  if (!DATE.test(r.valid_from)) err("valid_from must be YYYY-MM-DD");
  if (r.valid_to !== "" && !DATE.test(r.valid_to)) err("valid_to must be YYYY-MM-DD or blank");
  if (r.valid_to !== "" && r.valid_to < r.valid_from) err("valid_to is before valid_from");

  const regions = r.region ? r.region.split("|").map((s) => s.trim()).filter(Boolean) : [];
  const regionsSql = regions.length
    ? `array[${regions.map(q).join(", ")}]::text[]`
    : "null";

  values.push(
    `  (${[
      q(r.category) + "::public.cost_category",
      q(r.label),
      q(r.unit) + "::public.rule_unit",
      amountPence ?? "null",
      amountBp ?? "null",
      r.min_age || "null",
      r.max_age || "null",
      q(r.supplier_name),
      regionsSql,
      Number.isFinite(conf) ? conf.toFixed(2) : "null",
      q(r.source_note),
      q(r.source_url),
      q(r.valid_from) + "::date",
      r.valid_to ? q(r.valid_to) + "::date" : "null",
    ].join(", ")})`,
  );
});

if (errors.length) {
  console.error(`✗ ${errors.length} problem(s) — nothing written:\n` + errors.map((e) => "  " + e).join("\n"));
  process.exit(1);
}
if (values.length === 0) {
  console.error("No rules in the CSV yet.");
  process.exit(1);
}

const sql = `-- Generated by scripts/import-fee-rules.mjs from fee-rules.csv — do not edit by hand.
-- ${values.length} rule(s). Safe to run more than once.
insert into public.fee_rule (
  category, label, unit, amount_pence, amount_bp, min_age, max_age,
  supplier_name, regions, confidence, source_note, source_url, valid_from, valid_to
) values
${values.join(",\n")}
on conflict (category, label, (coalesce(supplier_name, '')), valid_from) do update set
  unit = excluded.unit,
  amount_pence = excluded.amount_pence,
  amount_bp = excluded.amount_bp,
  min_age = excluded.min_age,
  max_age = excluded.max_age,
  regions = excluded.regions,
  confidence = excluded.confidence,
  source_note = excluded.source_note,
  source_url = excluded.source_url,
  valid_to = excluded.valid_to,
  is_active = true;
`;
writeFileSync(sqlPath, sql);
console.log(`✓ ${values.length} rule(s) checked and written to data/fee-rules/fee-rules.sql`);
