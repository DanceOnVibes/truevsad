#!/usr/bin/env node
/**
 * Turns data/school-holidays/school-holidays.csv into data/school-holidays/school-holidays.sql.
 *
 *   pnpm import-holidays
 *
 * Checks every row first and refuses to write anything if one is wrong.
 * The SQL is an UPSERT on (authority, school_year, name): running it again updates, never duplicates.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const csvPath = join(root, "data/school-holidays/school-holidays.csv");
const sqlPath = join(root, "data/school-holidays/school-holidays.sql");

const NATIONS = ["england", "scotland", "wales", "northern_ireland"];
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

const realDate = (s) => {
  if (!DATE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};
const q = (s) => (s === null || s === undefined || s === "" ? "null" : `'${String(s).replace(/'/g, "''")}'`);

const rows = parseCsv(readFileSync(csvPath, "utf8").replace(/^﻿/, ""));
const header = rows.shift()?.map((h) => h.trim()) ?? [];
const expected = ["nation", "authority", "school_year", "name", "starts_on", "ends_on", "source_url", "source_note"];
if (expected.some((h, i) => header[i] !== h)) {
  console.error(`Header must be exactly:\n${expected.join(",")}`);
  process.exit(1);
}

const errors = [];
const values = [];
const seen = new Set();
const byAuthorityYear = new Map();

rows.forEach((cells, idx) => {
  const line = idx + 2;
  const r = Object.fromEntries(expected.map((h, i) => [h, (cells[i] ?? "").trim()]));
  const err = (m) => errors.push(`Line ${line} (${r.authority} ${r.name}): ${m}`);

  if (!NATIONS.includes(r.nation)) err(`nation must be one of ${NATIONS.join(", ")}`);
  if (r.authority.length < 2 || r.authority.length > 80) err("authority is required (council name, max 80 chars)");
  if (!/^\d{4}-\d{2}$/.test(r.school_year)) err('school_year must look like "2026-27"');
  else if (+r.school_year.slice(5) !== (+r.school_year.slice(2, 4) + 1) % 100) err('school_year must be consecutive years, e.g. "2026-27"');
  if (r.name.length < 2 || r.name.length > 80) err("name is required (e.g. October half term), max 80 chars");
  if (!realDate(r.starts_on)) err("starts_on must be a real date YYYY-MM-DD (first day OFF school)");
  if (!realDate(r.ends_on)) err("ends_on must be a real date YYYY-MM-DD (last day OFF school)");
  if (realDate(r.starts_on) && realDate(r.ends_on)) {
    const days = (Date.parse(r.ends_on) - Date.parse(r.starts_on)) / 86_400_000;
    if (days < 0) err("ends_on is before starts_on");
    if (days > 60) err("holiday is longer than 60 days — check the dates");
  }
  if (!/^https?:\/\//.test(r.source_url)) err("source_url is required (the council's own term dates page)");
  if (!r.source_note) err("source_note is required (what the page says + date checked)");

  const key = `${r.authority}|${r.school_year}|${r.name}`.toLowerCase();
  if (seen.has(key)) err("duplicate holiday for this council and year");
  seen.add(key);

  const ay = `${r.authority}|${r.school_year}`;
  byAuthorityYear.set(ay, [...(byAuthorityYear.get(ay) ?? []), { line, s: r.starts_on, e: r.ends_on, name: r.name }]);

  values.push(
    `  (${[q(r.nation), q(r.authority), q(r.school_year), q(r.name), `${q(r.starts_on)}::date`, `${q(r.ends_on)}::date`, q(r.source_url), q(r.source_note)].join(", ")})`,
  );
});

// Holidays in the same council and year must not overlap.
for (const [ay, list] of byAuthorityYear) {
  const sorted = [...list].sort((a, b) => a.s.localeCompare(b.s));
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].s <= sorted[i - 1].e) {
      errors.push(`Line ${sorted[i].line}: "${sorted[i].name}" overlaps "${sorted[i - 1].name}" (${ay.replace("|", " ")})`);
    }
  }
}

if (errors.length) {
  console.error(`✗ ${errors.length} problem(s) — nothing written:\n` + errors.map((e) => "  " + e).join("\n"));
  process.exit(1);
}
if (values.length === 0) {
  console.error("No holidays in the CSV yet.");
  process.exit(1);
}

const sql = `-- Generated by scripts/import-school-holidays.mjs from school-holidays.csv — do not edit by hand.
-- ${values.length} holiday(s). Safe to run more than once.
insert into public.school_holiday (nation, authority, school_year, name, starts_on, ends_on, source_url, source_note) values
${values.join(",\n")}
on conflict (authority, school_year, name) do update set
  nation = excluded.nation,
  starts_on = excluded.starts_on,
  ends_on = excluded.ends_on,
  source_url = excluded.source_url,
  source_note = excluded.source_note;
`;
writeFileSync(sqlPath, sql);
console.log(`✓ ${values.length} holiday(s) checked and written to data/school-holidays/school-holidays.sql`);
