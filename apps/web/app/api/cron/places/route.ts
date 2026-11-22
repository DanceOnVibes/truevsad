import { NextResponse } from "next/server";
import { cronRefusal } from "@/lib/cron-auth";
import { refreshPlace } from "@/lib/osm";
import { POPULAR_PLACES } from "@/lib/popular-places";

export const runtime = "nodejs";
export const preferredRegion = "lhr1";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Stop starting new places with this little time left, so a slow count isn't cut off. */
const STOP_BEFORE_END_MS = 90_000;

/**
 * Hourly from 00:11 to 07:11 UTC, when Europe is asleep (vercel.json): count popular resorts for
 * Visit before you book ahead of time. Places counted in the last 25 days are skipped, so once the
 * list is saved most runs do nothing. One place at a time, a pause between: the public Overpass
 * servers are run by volunteers and have been at capacity for months (Nov 2026), so we stay light.
 */
export async function GET(req: Request) {
  const refused = cronRefusal(req);
  if (refused) return refused;
  const end = Date.now() + 280_000;
  const result: Record<string, string[]> = { saved: [], fresh: [], not_found: [], unavailable: [], not_reached: [] };
  // A random order each run, so one place the map servers keep failing on can't use up every
  // night's time while the rest wait behind it (seen 22 Nov: two runs stuck on the same two).
  const order = [...POPULAR_PLACES].sort(() => Math.random() - 0.5);
  for (const place of order) {
    if (end - Date.now() < STOP_BEFORE_END_MS) {
      result.not_reached!.push(place);
      continue;
    }
    const outcome = await refreshPlace(place, end - 10_000);
    result[outcome]!.push(place);
    if (outcome !== "fresh") await new Promise((r) => setTimeout(r, 3_000));
  }
  const summary = Object.fromEntries(Object.entries(result).map(([k, v]) => [k, v.length]));
  console.log("Places refresh:", JSON.stringify(summary), "not found:", result.not_found!.join("; ") || "none");
  return NextResponse.json({ ...summary, notFound: result.not_found, unavailable: result.unavailable });
}
