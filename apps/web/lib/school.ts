import type { SchoolHoliday } from "@truevsad/true-cost";
import { supabaseAdmin } from "./supabase-admin";

export interface Authority {
  authority: string;
  nation: string;
}

export interface HolidayRow extends SchoolHoliday {
  schoolYear: string;
  sourceUrl: string;
}

/** Councils we have sourced school holidays for. */
export async function loadAuthorities(): Promise<Authority[]> {
  const db = supabaseAdmin();
  if (!db) return [];
  const { data, error } = await db.from("school_holiday").select("authority, nation").order("authority");
  if (error || !data) return [];
  const seen = new Map<string, Authority>();
  for (const r of data as Authority[]) if (!seen.has(r.authority)) seen.set(r.authority, r);
  return [...seen.values()];
}

/** One council's holidays, oldest first. Only from last year onwards. */
export async function loadHolidays(authority: string): Promise<HolidayRow[]> {
  const db = supabaseAdmin();
  if (!db || !authority) return [];
  const since = new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10);
  const { data, error } = await db
    .from("school_holiday")
    .select("authority, name, starts_on, ends_on, school_year, source_url")
    .eq("authority", authority)
    .gte("ends_on", since)
    .order("starts_on");
  if (error || !data) return [];
  return (
    data as {
      authority: string;
      name: string;
      starts_on: string;
      ends_on: string;
      school_year: string;
      source_url: string;
    }[]
  ).map((r) => ({
    authority: r.authority,
    name: r.name,
    startsOn: r.starts_on,
    endsOn: r.ends_on,
    schoolYear: r.school_year,
    sourceUrl: r.source_url,
  }));
}
