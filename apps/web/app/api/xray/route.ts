import { NextResponse } from "next/server";
import {
  calculateTrueCost,
  INCLUSIONS,
  PartyValidationError,
  selectRules,
  type Inclusion,
  toOutwardPostcode,
  type Offer,
  type Party,
} from "@truevsad/true-cost";
import { loadFeeRules, saveQuote, shareQuote, type SourceKind } from "@/lib/quotes";
import { allowRequest } from "@/lib/rate-limit";
import { aiConfigured, extractWithAi, type DraftOffer } from "@/lib/extract-ai";

// Run in London, next to Supabase London. Node runtime (not edge) so it pins to lhr1.
export const runtime = "nodejs";
export const preferredRegion = "lhr1";
export const dynamic = "force-dynamic";

/**
 * POST /api/xray
 *
 * Two steps, so the user always confirms before we price anything:
 *
 *   { "step": "extract", "text"?: string, "url"?: string, "image"?: { mimeType, base64 } }
 *     → a DRAFT offer (read by Gemini in London when configured) for the user to check.
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
// Step 1 — extract
// ---------------------------------------------------------------------------

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_IMAGE_BASE64 = 3_000_000; // ~2.2 MB image; the browser shrinks screenshots first

async function extract(body: Record<string, unknown>) {
  const text = typeof body.text === "string" ? body.text.slice(0, 20_000) : "";
  const url = normaliseLink(body.url);

  let image: { mimeType: string; base64: string } | undefined;
  if (isObject(body.image)) {
    const mimeType = String(body.image.mimeType ?? "");
    const base64 = String(body.image.base64 ?? "");
    if (!IMAGE_TYPES.includes(mimeType)) return bad("Screenshots must be PNG, JPEG or WebP.");
    if (base64.length > MAX_IMAGE_BASE64 || !/^[A-Za-z0-9+/=]+$/.test(base64)) {
      return bad("That screenshot is too large. Try cropping it to just the deal.");
    }
    image = { mimeType, base64 };
  }

  if (!text && !url && !image) {
    return bad("Paste a link, some deal text, or a screenshot.");
  }

  const notes: string[] = [];
  let draft: DraftOffer | null = null;

  // HARD RULE: we never fetch `url`. The AI only sees text/screenshot the family gave us.
  if ((text || image) && aiConfigured()) {
    draft = await extractWithAi({ text: text || undefined, image, linkWords: linkWords(url) });
    if (draft) notes.push("Read by AI — please check every field before continuing.");
  }

  if (!draft) {
    draft = naiveExtract(text);
    if (aiConfigured() && (text || image)) {
      notes.push("Our AI reader is unavailable right now, so we've filled in what we could. Please check and complete the details.");
    } else {
      notes.push("Please check every field before continuing.");
    }
    if (image && !text) notes.push("We couldn't read the screenshot this time. Type the details below.");
  }

  if (url && !text && !image) {
    notes.push("We don't open links ourselves. Paste the deal text or a screenshot so we can read the details.");
  }

  return NextResponse.json({ draft: { ...draft, sourceUrl: url }, notes });
}

/** Words that say a price is incomplete: "plus taxes and fees", "excl. taxes", "+ fees". */
const EXCLUDES_FEES =
  /\b(plus|excl\.?|excluding|exclusive of|not including)\s+(local\s+|all\s+)?(taxes|tax|fees|charges)\b|\+\s*(taxes|fees)\b/i;

function naiveExtract(text: string): DraftOffer {
  const price = text.match(/£\s?([\d,]+(?:\.\d{1,2})?)/);
  const nights = text.match(/(\d{1,2})\s*nights?/i);
  const perPerson = /\b(pp|p\.p\.|per person)\b/i.test(text);
  const excludes = EXCLUDES_FEES.test(text);

  return {
    headlinePence: price ? Math.round(parseFloat(price[1]!.replace(/,/g, "")) * 100) : undefined,
    headlineBasis: perPerson ? "per_person" : "total",
    currency: "GBP",
    nights: nights ? parseInt(nights[1]!, 10) : undefined,
    excludesTaxesAndFees: excludes || undefined,
  };
}

/** Common link words that are never places. */
const NOT_PLACES = new Set([
  "www", "com", "co", "uk", "en", "gb", "html", "htm", "php", "aspx",
  "hotel", "hotels", "holiday", "holidays", "deal", "deals", "offer", "offers",
  "package", "packages", "search", "results", "booking", "book", "details", "property",
  "accommodation", "flights", "flight", "and", "the", "of", "to", "in", "for", "p", "id",
]);

/**
 * Place words from the deal link's ADDRESS ONLY, e.g.
 *   onthebeach.co.uk/hotels/spain/costa-dorada/tarragona/golden-donaire-beach
 *   → "spain costa dorada tarragona golden donaire beach"
 * We never open the link. Only plain letters survive, so nothing odd reaches the AI.
 */
function linkWords(url: string | undefined): string | undefined {
  if (!url) return undefined;
  let path: string;
  try {
    path = decodeURIComponent(new URL(url).pathname);
  } catch {
    return undefined;
  }
  const words = path
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z]+/)
    .filter((w) => w.length >= 2 && w.length <= 30 && !NOT_PLACES.has(w))
    .slice(0, 20);
  return words.length ? words.join(" ") : undefined;
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
    destination: tidy(raw.destination),
    supplierName: tidy(raw.supplierName),
    includes: Array.isArray(raw.includes)
      ? [...new Set(raw.includes.filter((x): x is Inclusion => INCLUSIONS.includes(x as Inclusion)))]
      : [],
    excludesTaxesAndFees: raw.excludesTaxesAndFees === true,
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

/** Trim, collapse spaces, cap length; empty becomes undefined. */
function tidy(v: unknown, max = 120): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.replace(/\s+/g, " ").trim().slice(0, max);
  return t || undefined;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function bad(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}
