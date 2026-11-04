import { createHash } from "node:crypto";
import {
  FCDO_API,
  countryFromDisplayName,
  matchFcdoCountry,
  parseTravelAdvice,
  parseTravelAdviceIndex,
  type FcdoAdvice,
  type FcdoHazard,
  type FcdoNumber,
  type VerifiedNumbers,
} from "@truevsad/true-cost";
import { supabaseAdmin } from "@/lib/supabase-admin";
import VERIFIED from "@/lib/emergency-verified.json";

/**
 * Plan B, layer 1: keep a daily copy of the FCDO's travel advice for every country, and read it
 * back for the Plan B card. GOV.UK asks API users to be gentle, so we only fetch guides the FCDO
 * has changed since our copy, a few a second, and never more than `maxFetch` in one run.
 */

const USER_AGENT = "TrueVsAd Plan B (+https://truevsad.co.uk)";
const GAP_MS = 300;

async function getJson(path: string): Promise<unknown | null> {
  try {
    const res = await fetch(`${FCDO_API}${path}`, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("GOV.UK Content API returned", res.status, "for", path);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error("GOV.UK Content API request failed for", path, (err as Error).name);
    return null;
  }
}

function hashOf(a: FcdoAdvice): string {
  return createHash("sha256").update(JSON.stringify([a.alertStatus, a.emergency, a.hazards])).digest("hex").slice(0, 32);
}

export interface RefreshSummary {
  countries: number;
  fetched: number;
  changed: number;
  failed: string[];
  remaining: number;
}

/** The daily job: fetch the index, then each guide that's new or changed since our copy. */
export async function refreshFcdo({ maxFetch = 120, deadlineMs = 240_000 } = {}): Promise<RefreshSummary | { error: string }> {
  const db = supabaseAdmin();
  if (!db) return { error: "Supabase isn't configured" };
  const started = Date.now();

  const index = parseTravelAdviceIndex(await getJson("/foreign-travel-advice"));
  if (!index.length) return { error: "The FCDO index was empty or unreachable" };

  const { data: rows, error } = await db.from("fcdo_advice").select("slug, updated_at, fetched_at, content_hash");
  if (error) return { error: `Reading our copy failed: ${error.message}` };
  const ours = new Map((rows ?? []).map((r) => [r.slug as string, r]));

  // Never fetched first, then anything the FCDO changed, then (if the index has no dates) the oldest copies.
  const todo = index
    .map((c) => {
      const r = ours.get(c.slug);
      const changed = !r || (c.updatedAt ? Date.parse(c.updatedAt) !== Date.parse((r.updated_at as string) ?? "") : true);
      return { c, r, changed, age: r ? Date.parse(r.fetched_at as string) : 0 };
    })
    .filter((t) => t.changed || Date.now() - t.age > 7 * 86_400_000)
    .sort((a, b) => a.age - b.age);

  const summary: RefreshSummary = { countries: index.length, fetched: 0, changed: 0, failed: [], remaining: 0 };
  for (const [i, t] of todo.entries()) {
    if (summary.fetched >= maxFetch || Date.now() - started > deadlineMs) {
      summary.remaining = todo.length - i;
      break;
    }
    const advice = parseTravelAdvice(await getJson(`/foreign-travel-advice/${t.c.slug}`));
    summary.fetched++;
    if (!advice) {
      summary.failed.push(t.c.slug);
    } else {
      const hash = hashOf(advice);
      const isChange = !t.r || t.r.content_hash !== hash;
      if (isChange) summary.changed++;
      const now = new Date().toISOString();
      const { error: upErr } = await db.from("fcdo_advice").upsert({
        slug: advice.slug,
        name: advice.name.slice(0, 80),
        synonyms: advice.synonyms.slice(0, 40),
        updated_at: advice.updatedAt,
        fetched_at: now,
        alert_status: advice.alertStatus,
        emergency: advice.emergency,
        hazards: advice.hazards,
        content_hash: hash,
        ...(isChange ? { changed_at: now, review_needed: true } : {}),
      });
      if (upErr) {
        console.error("fcdo_advice save failed for", advice.slug, upErr.message);
        summary.failed.push(advice.slug);
      }
    }
    await new Promise((r) => setTimeout(r, GAP_MS));
  }
  return summary;
}

/** What the Plan B card shows for a country outside our deep coverage. */
export interface FcdoCard {
  slug: string;
  name: string;
  url: string;
  updatedAt: string | null;
  fetchedAt: string;
  alertStatus: string[];
  emergency: { text: string; numbers: FcdoNumber[] } | null;
  hazards: FcdoHazard[];
  verified: VerifiedNumbers | null;
}

const VERIFIED_LIST = (VERIFIED as { countries: VerifiedNumbers[] }).countries;

/** Find the FCDO guide for a place found on the map ("…, Thailand"). Null if we have no copy. */
export async function fcdoForPlace(displayName: string): Promise<FcdoCard | null> {
  const db = supabaseAdmin();
  if (!db) return null;
  const country = countryFromDisplayName(displayName);
  if (!country) return null;
  const { data: list } = await db.from("fcdo_advice").select("slug, name, synonyms");
  const slug = matchFcdoCountry(country, (list ?? []) as { slug: string; name: string; synonyms: string[] }[]);
  if (!slug) return null;
  const { data } = await db
    .from("fcdo_advice")
    .select("slug, name, updated_at, fetched_at, alert_status, emergency, hazards")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return null;
  return {
    slug: data.slug as string,
    name: data.name as string,
    url: `https://www.gov.uk/foreign-travel-advice/${data.slug as string}`,
    updatedAt: (data.updated_at as string) ?? null,
    fetchedAt: data.fetched_at as string,
    alertStatus: (data.alert_status as string[]) ?? [],
    emergency: (data.emergency as FcdoCard["emergency"]) ?? null,
    hazards: (data.hazards as FcdoHazard[]) ?? [],
    verified: VERIFIED_LIST.find((v) => v.slug === data.slug) ?? null,
  };
}
