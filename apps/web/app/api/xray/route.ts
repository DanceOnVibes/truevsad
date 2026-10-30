import { NextResponse } from "next/server";
import {
  calculateTrueCost,
  PartyValidationError,
  selectRules,
  toOutwardPostcode,
  type HeadlineBasis,
  type Offer,
  type Party,
} from "@truevsad/true-cost";
import { loadFeeRules, saveQuote, shareQuote, type SourceKind } from "@/lib/quotes";
import { allowRequest } from "@/lib/rate-limit";

// Run in London, next to Supabase London. Node runtime (not edge) so it pins to lhr1.
export const runtime = "nodejs";
export const preferredRegion = "lhr1";
export const dynamic = "force-dynamic";

/**
 * POST /api/xray
 *
 * Two steps, so the user always confirms before we price anything:
 *
 *   { "step": "extract", "text"?: string, "url"?: string, "hasScreenshot"?: boolean }
 *     → a DRAFT offer for the user to check and correct.
 *
 *   { "step": "quote", "party": Party, "offer": Offer, "sourceKind", "sourceUrl"? }
 *     → TrueCost result + itemised Receipt. Saved PRIVATELY; returns quoteId.
 *
 *   { "step": "share", "quoteId": string }
 *     → makes that quote public and returns a random share slug (/r/[slug]).
 *
 * HARD RULE: we never fetch the URL server-side (no scraping of airlines/OTAs).
 * The link is kept as a reference only; details come from the text or screenshot
 * the user gives us.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return bad("Request body must be JSON.");
  }
  if (!isObject(body)) return bad("Request body must be a JSON object.");

  const step = body.step;
  if (step !== "extract" && step !== "quote" && step !== "share") {
    return bad('Unknown step. Use "extract", "quote" or "share".');
  }
  if (!(await allowRequest(req, step))) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a little and try again." },
      { status: 429, headers: { "Retry-After": "600" } },
    );
  }

  if (step === "extract") return extract(body);
  if (step === "quote") return quote(body);
  return share(body);
}

// ---------------------------------------------------------------------------
// Step 1 — extract (STUB)
// ---------------------------------------------------------------------------

function extract(body: Record<string, unknown>) {
  const text = typeof body.text === "string" ? body.text.slice(0, 20_000) : "";
  const url = typeof body.url === "string" ? body.url.slice(0, 2_000) : "";
  const hasScreenshot = body.hasScreenshot === true;

  if (!text && !url && !hasScreenshot) {
    return bad("Paste a link, some deal text, or a screenshot.");
  }

  // TODO(llm): replace this naive parser with the LLM extraction step.
  // It must return the same DraftOffer shape and never fetch `url`.
  const draft = naiveExtract(text);

  const notes: string[] = ["Stub extractor — please check every field before continuing."];
  if (url && !text) {
    notes.push("We don't open links ourselves. Paste the deal text so we can read the details.");
  }
  if (hasScreenshot) {
    notes.push("Reading screenshots arrives with the AI extraction step. Type the details for now.");
  }

  return NextResponse.json({ draft: { ...draft, sourceUrl: url || undefined }, notes });
}

interface DraftOffer {
  headlinePence?: number;
  headlineBasis: HeadlineBasis;
  currency: string;
  nights?: number;
  destination?: string;
}

function naiveExtract(text: string): DraftOffer {
  const price = text.match(/£\s?([\d,]+(?:\.\d{1,2})?)/);
  const nights = text.match(/(\d{1,2})\s*nights?/i);
  const perPerson = /\b(pp|p\.p\.|per person)\b/i.test(text);

  return {
    headlinePence: price ? Math.round(parseFloat(price[1]!.replace(/,/g, "")) * 100) : undefined,
    headlineBasis: perPerson ? "per_person" : "total",
    currency: "GBP",
    nights: nights ? parseInt(nights[1]!, 10) : undefined,
  };
}

// ---------------------------------------------------------------------------
// Step 2 — quote
// ---------------------------------------------------------------------------

async function quote(body: Record<string, unknown>) {
  const party = parseParty(body.party);
  if (typeof party === "string") return bad(party);
  const offer = parseOffer(body.offer);
  if (typeof offer === "string") return bad(offer);

  const sourceKind: SourceKind =
    body.sourceKind === "link" || body.sourceKind === "screenshot" ? body.sourceKind : "text";
  const sourceUrl = normaliseLink(body.sourceUrl);

  try {
    const rules = selectRules(await loadFeeRules(), offer);
    const result = calculateTrueCost({ party, offer, rules });
    // Saving must never block the answer: if it fails, the user still gets the price.
    const quoteId = await saveQuote({ party, offer, result, sourceKind, sourceUrl });
    return NextResponse.json({ result, quoteId });
  } catch (err) {
    if (err instanceof PartyValidationError) return bad(err.message);
    return bad(err instanceof Error ? err.message : "Could not price this deal.");
  }
}

function parseParty(raw: unknown): Party | string {
  if (!isObject(raw)) return "Missing party.";
  const adults = Number(raw.adults);
  const childAges = Array.isArray(raw.childAges) ? raw.childAges.map(Number) : [];
  const postcode =
    typeof raw.outwardPostcode === "string" && raw.outwardPostcode.trim()
      ? toOutwardPostcode(raw.outwardPostcode)
      : undefined;
  if (typeof raw.outwardPostcode === "string" && raw.outwardPostcode.trim() && !postcode) {
    return "Postcode not recognised. Enter just the first part, e.g. SE11.";
  }
  return { adults, childAges, outwardPostcode: postcode };
}

function parseOffer(raw: unknown): Offer | string {
  if (!isObject(raw)) return "Missing offer.";
  const headlinePence = Number(raw.headlinePence);
  const nights = Number(raw.nights);
  const basis = raw.headlineBasis === "per_person" ? "per_person" : "total";
  if (!Number.isInteger(headlinePence) || headlinePence <= 0) return "Enter the advertised price.";
  if (!Number.isInteger(nights) || nights < 0 || nights > 60) return "Enter the number of nights.";
  return {
    headlinePence,
    headlineBasis: basis,
    currency: typeof raw.currency === "string" ? raw.currency.toUpperCase().slice(0, 3) : "GBP",
    nights,
    destination: typeof raw.destination === "string" ? raw.destination.slice(0, 120) : undefined,
    supplierName: typeof raw.supplierName === "string" ? raw.supplierName.slice(0, 120) : undefined,
  };
}

// ---------------------------------------------------------------------------
// Step 3 — share
// ---------------------------------------------------------------------------

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function share(body: Record<string, unknown>) {
  // The quote id is an unguessable UUID only ever sent to the browser that created the quote.
  if (typeof body.quoteId !== "string" || !UUID.test(body.quoteId)) {
    return bad("Missing quote.");
  }
  const slug = await shareQuote(body.quoteId);
  if (!slug) {
    return NextResponse.json({ error: "Could not create a share link right now." }, { status: 503 });
  }
  return NextResponse.json({ slug, path: `/r/${slug}` });
}

// ---------------------------------------------------------------------------

/**
 * Accepts "https://site.com/x" and also "site.com/x" or "www.site.com/x" (adds https://).
 * Stored as a reference only — we never fetch it.
 */
function normaliseLink(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  let s = raw.trim();
  if (!s) return undefined;
  if (!/^https?:\/\//i.test(s)) {
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+(\/|$|\?)/i.test(s)) return undefined;
    s = `https://${s}`;
  }
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString().slice(0, 2000) : undefined;
  } catch {
    return undefined;
  }
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function bad(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}
