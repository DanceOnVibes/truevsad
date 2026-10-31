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
  "per_person_per_night", "per_adult_per_night", "per_party_per_night",
];
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const COVERS = ["hold_bag", "cabin_bag", "seats", "transfers"];

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
  "covers", "max_nights", "months", "exclusive_group",
];
if (expected.some((h, i) => header[i] !== h)) {
  console.error(`Header must be exactly:\n${expected.join(",")}`);
  process.exit(1);
}

const errors = [];
const values = [];
const keys = [];

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
  if (r.max_nights !== "") {
    if (!(/^\d+$/.test(r.max_nights) && +r.max_nights >= 1 && +r.max_nights <= 60)) err("max_nights must be a whole number 1–60");
    if (!/_per_night$/.test(r.unit)) err("max_nights only makes sense for a per-night unit");
  }

  const conf = parseFloat(r.confidence);
  if (!(conf >= 0 && conf <= 1)) err("confidence must be between 0 and 1");
  if (!/^https?:\/\//.test(r.source_url)) err("source_url is required and must start with http(s)://");
  if (!r.source_note) err("source_note is required (what the source says + date checked)");
  if (!DATE.test(r.valid_from)) err("valid_from must be YYYY-MM-DD");
  if (r.valid_to !== "" && !DATE.test(r.valid_to)) err("valid_to must be YYYY-MM-DD or blank");
  if (r.valid_to !== "" && r.valid_to < r.valid_from) err("valid_to is before valid_from");
  if (r.covers !== "" && !COVERS.includes(r.covers)) err(`covers must be blank or one of ${COVERS.join(", ")}`);
  if (r.covers === "" && /\b(bag|bags|luggage|baggage|seat|seats|transfer|transfers)\b/i.test(r.label)) {
    err("looks like a bag/seat/transfer fee — fill in covers so packages that include it aren't double-charged");
  }
  if (hasAmount && amountPence === 0) err("amount is 0 — a free item isn't a fee rule; leave it out (use covers / what's included instead)");

  // months: "5-10" (May–Oct), "11-4" (Nov–Apr, wraps the new year) or "1|2|12". Blank = all year.
  let months = [];
  if (r.months !== "") {
    for (const part of r.months.split("|")) {
      const m = /^(\d{1,2})(?:-(\d{1,2}))?$/.exec(part.trim());
      const a = m ? +m[1] : 0, b = m && m[2] ? +m[2] : a;
      if (!m || a < 1 || a > 12 || b < 1 || b > 12) { err('months must look like "5-10", "11-4" or "1|2|12"'); break; }
      for (let x = a; ; x = (x % 12) + 1) { if (!months.includes(x)) months.push(x); if (x === b) break; }
    }
    months.sort((x, y) => x - y);
  }

  if (r.exclusive_group !== "" && !/^[a-z0-9_]{2,40}$/.test(r.exclusive_group)) err("exclusive_group must be lowercase letters, digits or _ (e.g. catalonia_tax)");

  const regions = r.region ? r.region.split("|").map((s) => s.trim()).filter(Boolean) : [];
  const regionsSql = regions.length
    ? `array[${regions.map(q).join(", ")}]::text[]`
    : "null";

  // Spell out '' (not null) for "no supplier": NOT IN never matches a null.
  const supplierKey = `'${(r.supplier_name || "").replace(/'/g, "''")}'`;
  keys.push(`     (${q(r.category)}, ${q(r.label)}, ${supplierKey}, ${q(r.valid_from)}::date)`);
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
      q(r.covers),
      r.max_nights || "null",
      months.length ? `array[${months.join(", ")}]::smallint[]` : "null",
      q(r.exclusive_group),
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
  supplier_name, regions, confidence, source_note, source_url, valid_from, valid_to, covers, max_nights, months, exclusive_group
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
  covers = excluded.covers,
  max_nights = excluded.max_nights,
  months = excluded.months,
  exclusive_group = excluded.exclusive_group,
  is_active = true;

-- The CSV is the source of truth: switch off any rule that is no longer in it
-- (e.g. a renamed label). Nothing is deleted, so it can be switched back on.
update public.fee_rule set is_active = false
 where is_active
   and (category::text, label, coalesce(supplier_name, ''), valid_from) not in (
${keys.join(",\n")}
   );
`;
writeFileSync(sqlPath, sql);
console.log(`✓ ${values.length} rule(s) checked and written to data/fee-rules/fee-rules.sql`);
