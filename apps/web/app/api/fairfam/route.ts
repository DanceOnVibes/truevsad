import { NextResponse } from "next/server";
import { toOutwardPostcode } from "@truevsad/true-cost";
import { councilsForOutcode, matchSupported } from "@/lib/councils";
import { allowRequest } from "@/lib/rate-limit";
import { loadAuthorities, loadHolidays } from "@/lib/school";

export const runtime = "nodejs";
export const preferredRegion = "lhr1";
export const dynamic = "force-dynamic";

/**
 * POST /api/fairfam — nothing here is stored.
 *
 *   { "step": "council", "postcode": "SE11" }  → councils we hold dates for that cover it
 *     (only the outward code goes to postcodes.io; it isn't kept)
 *   { "step": "holidays", "council": "Lambeth" } → that council's holidays from today, with source
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error();
    body = parsed as Record<string, unknown>;
  } catch {
    return bad("Request body must be a JSON object.");
  }
  if (!(await allowRequest(req, "fairfam"))) {
    return NextResponse.json({ error: "Too many requests. Please wait a little and try again." }, { status: 429 });
  }

  if (body.step === "council") {
    const outcode = typeof body.postcode === "string" ? toOutwardPostcode(body.postcode) : undefined;
    if (!outcode) return bad("Enter the first half of your postcode, e.g. SE11.");
    const [found, authorities] = await Promise.all([councilsForOutcode(outcode), loadAuthorities()]);
    if (found === null) return NextResponse.json({ outcode, found: [], councils: [], lookupFailed: true });
    return NextResponse.json({ outcode, found, councils: matchSupported(found, authorities.map((a) => a.authority)) });
  }

  if (body.step === "holidays") {
    const authorities = await loadAuthorities();
    const match = authorities.find((a) => a.authority === body.council);
    if (!match) return bad("We don't hold dates for that council yet.");
    const today = new Date().toISOString().slice(0, 10);
    const holidays = (await loadHolidays(match.authority)).filter((h) => h.endsOn >= today);
    return NextResponse.json({ council: match.authority, nation: match.nation, holidays });
  }

  return bad('Unknown step. Use "council" or "holidays".');
}

function bad(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}
