import { after, NextResponse } from "next/server";
import {
  advertNotes,
  calculateTrueCost,
  childExtras,
  fairMark,
  fairShare,
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
import { logObservation } from "@/lib/observations";
import { conversionNote, toPence } from "@/lib/currency";
import { councilsForOutcode, matchSupported } from "@/lib/councils";
import { loadAuthorities } from "@/lib/school";

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
  if (step !== "extract" && step !== "quote" && step !== "share" && step !== "split") {
    return bad('Unknown step. Use "extract", "quote", "share" or "split".');
  }
  if (!(await allowRequest(req, step))) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a little and try again." },
      { status: 429, headers: { "Retry-After": "600" } },
    );
  }

  if (step === "extract") return extract(body);
  if (step === "quote") return quote(body);
  if (step === "split") return split(body);
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

  const { draft: checked, check } = sanityCheck(draft, text, Boolean(image), notes);
  return NextResponse.json({ draft: { ...checked, sourceUrl: url }, notes, check });
}

/**
 * Plausibility checks on what was read. Anything out of range is cleared or highlighted for the
 * family to confirm. The two claim flags ("plus taxes", "kids go free") only stand when the
 * advert's own words are really in the text we were given — never inferred.
 */
function sanityCheck(
  d: DraftOffer,
  text: string,
  hadImage: boolean,
  notes: string[],
): { draft: DraftOffer; check: string[] } {
  const out: DraftOffer = { ...d };
  const check = new Set<string>();
  const squash = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const inText = (quote: string | undefined) => Boolean(quote && text && squash(text).includes(squash(quote)));

  if (out.headlinePence !== undefined) {
    const [lo, hi] = out.headlineBasis === "per_person" ? [2_000, 1_000_000] : [5_000, 5_000_000];
    if (out.headlinePence < lo || out.headlinePence > hi) {
      check.add("price");
      notes.push("The price we read looks unusual. Please check it against the advert.");
    }
  }
  if (out.nights !== undefined && out.nights > 30) {
    check.add("nights");
    notes.push(`${out.nights} nights is a long stay. Please check the number of nights.`);
  }
  if (out.adults !== undefined && out.adults > 6) check.add("adults");
  if (out.departDate) {
    const t = Date.parse(`${out.departDate}T00:00:00Z`);
    const now = Date.now();
    if (!Number.isFinite(t) || t < now - 2 * 86_400_000 || t > now + 731 * 86_400_000) {
      out.departDate = undefined;
      check.add("depart");
      notes.push("The travel date we read is in the past or too far ahead, so we've left it blank.");
    }
  }

  // Claim flags: text adverts must contain the words; screenshots can't be checked, so we ask.
  const foundTaxes = inText(out.taxesQuote) || (Boolean(text) && EXCLUDES_FEES.test(text));
  if (out.excludesTaxesAndFees && !foundTaxes) {
    if (hadImage) check.add("excludes"); // may be in the screenshot: ask, don't untick
    else {
      out.excludesTaxesAndFees = undefined;
      notes.push("We couldn't find \"plus taxes and fees\" (or similar) in the advert text, so that box is unticked. Tick it if the advert says so.");
    }
  }
  const foundFree = inText(out.freeChildQuote) || (Boolean(text) && FREE_CHILD.test(text));
  if (out.freeChildClaim && !foundFree) {
    if (hadImage) check.add("freeChild");
    else {
      out.freeChildClaim = undefined;
      notes.push("We couldn't find a \"kids go free\" claim in the advert text, so that box is unticked.");
    }
  }
  if (check.has("excludes") || check.has("freeChild")) {
    notes.push("Read from the screenshot: please confirm the highlighted boxes match what the advert says.");
  }

  // The advert's own maths, using the party it was priced for.
  if (out.perPersonPence || out.totalPence) {
    const maths = advertNotes(
      { adults: out.adults ?? 2, childAges: out.childAges ?? [] },
      { freeChildClaim: out.freeChildClaim, advertCheck: { perPersonPence: out.perPersonPence, totalPence: out.totalPence } },
    );
    if (maths.length) {
      check.add("price");
      notes.push(...maths);
    }
  }
  return { draft: out, check: [...check] };
}

/** Words that say a price is incomplete: "plus taxes and fees", "excl. taxes", "+ fees". */
const EXCLUDES_FEES =
  /\b(plus|excl\.?|excluding|exclusive of|not including)\s+(local\s+|all\s+)?(taxes|tax|fees|charges)\b|\+\s*(taxes|fees)\b/i;

/** "Kids go free", "free child places", "children stay free". */
const FREE_CHILD = /\b(kids?|child(ren)?)\s+(go|stay|fly|travel|eat)\s+free\b|\bfree\s+(kids?|child(ren)?)\s+places?\b/i;

function naiveExtract(text: string): DraftOffer {
  const price = text.match(/([£€$])\s?([\d,]+(?:\.\d{1,2})?)/);
  const currency = price?.[1] === "€" ? "EUR" : price?.[1] === "$" ? "USD" : "GBP";
  const nights = text.match(/(\d{1,2})\s*nights?/i);
  const perPerson = /\b(pp|p\.p\.|per person)\b/i.test(text);
  const excludes = EXCLUDES_FEES.test(text);
  const freeChild = FREE_CHILD.test(text);

  return {
    headlinePence: price ? Math.round(parseFloat(price[2]!.replace(/,/g, "")) * 100) : undefined,
    headlineBasis: perPerson ? "per_person" : "total",
    currency,
    nights: nights ? parseInt(nights[1]!, 10) : undefined,
    excludesTaxesAndFees: excludes || undefined,
    freeChildClaim: freeChild || undefined,
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
  const parsed = parseOffer(body.offer);
  if (typeof parsed === "string") return bad(parsed);
  // Euros or dollars → pounds at the ECB rate. No rate, no price: we never guess.
  const converted = await toPence(parsed);
  if (typeof converted === "string") return bad(converted);
  const { offer, conversion } = converted;

  const sourceKind: SourceKind =
    body.sourceKind === "link" || body.sourceKind === "screenshot" ? body.sourceKind : "text";
  const sourceUrl = normaliseLink(body.sourceUrl);

  try {
    // The council lookup (for the School Window link) runs alongside pricing and never blocks it.
    const councilsP = suggestCouncil(party.outwardPostcode);
    const rules = selectRules(await loadFeeRules(), offer);
    const result = calculateTrueCost({ party, offer, rules, asOf: new Date().toISOString().slice(0, 10) });
    if (conversion) result.notes.unshift(conversionNote(conversion));
    // Saving must never block the answer: if it fails, the user still gets the price.
    const quoteId = await saveQuote({ party, offer, result, sourceKind, sourceUrl, conversion });
    const fm = fairMark(result);
    // Anonymous statistics, written after the answer is sent so the family never waits for it.
    after(() => logObservation({ party, offer, result, fairMark: fm, advertisedCurrency: conversion?.from }));
    // "Kids go free"? What each child still costs in extras.
    const childCosts = offer.freeChildClaim ? childExtras({ party, offer, rules }) : [];
    const councils = await councilsP;
    return NextResponse.json({ result, fairMark: fm, childCosts, quoteId, councils });
  } catch (err) {
    if (err instanceof PartyValidationError) return bad(err.message);
    return bad(err instanceof Error ? err.message : "Could not price this deal.");
  }
}

/**
 * Councils we hold school dates for that cover this postcode district. Only the outward code
 * (e.g. "SE11") goes to postcodes.io; nothing is stored. Empty when unknown or the lookup fails.
 */
async function suggestCouncil(outcode: string | undefined): Promise<string[]> {
  if (!outcode) return [];
  try {
    const [found, authorities] = await Promise.all([councilsForOutcode(outcode), loadAuthorities()]);
    return found ? matchSupported(found, authorities.map((a) => a.authority)) : [];
  } catch {
    return [];
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
  const holdBags =
    raw.holdBags === undefined || raw.holdBags === null || raw.holdBags === "" ? undefined : Number(raw.holdBags);
  if (holdBags !== undefined && !(Number.isInteger(holdBags) && holdBags >= 0 && holdBags <= 30)) {
    return "Hold bags must be a whole number from 0 to 30.";
  }
  return { adults, childAges, outwardPostcode: postcode, holdBags };
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
    freeChildClaim: raw.freeChildClaim === true,
    departDate: parseTravelDate(raw.departDate),
    departMonth: Number.isInteger(raw.departMonth) && (raw.departMonth as number) >= 1 && (raw.departMonth as number) <= 12
      ? (raw.departMonth as number)
      : undefined,
    airline: tidy(raw.airline, 60),
    advertCheck: parseAdvertCheck(raw.advertCheck),
  };
}

/** What the advert itself said about its price and party. Only used for checks, never pricing. */
function parseAdvertCheck(raw: unknown): Offer["advertCheck"] {
  if (!isObject(raw)) return undefined;
  const pence = (v: unknown) => (Number.isInteger(v) && (v as number) > 0 && (v as number) < 100_000_000 ? (v as number) : undefined);
  const count = (v: unknown, max: number) => (Number.isInteger(v) && (v as number) >= 0 && (v as number) <= max ? (v as number) : undefined);
  const out = {
    perPersonPence: pence(raw.perPersonPence),
    totalPence: pence(raw.totalPence),
    adults: count(raw.adults, 9),
    children: count(raw.children, 9),
  };
  return Object.values(out).some((v) => v !== undefined) ? out : undefined;
}

/** YYYY-MM-DD, a real date, from a month ago up to two years ahead. Anything else is ignored. */
function parseTravelDate(v: unknown): string | undefined {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined;
  const t = Date.parse(`${v}T00:00:00Z`);
  if (Number.isNaN(t) || new Date(t).toISOString().slice(0, 10) !== v) return undefined;
  const now = Date.now();
  const day = 86_400_000;
  return t >= now - 31 * day && t <= now + 731 * day ? v : undefined;
}

// ---------------------------------------------------------------------------
// Fair Share — split one deal between families. Worked out on the spot, never saved.
// ---------------------------------------------------------------------------

async function split(body: Record<string, unknown>) {
  const parsed = parseOffer(body.offer);
  if (typeof parsed === "string") return bad(parsed);
  const converted = await toPence(parsed);
  if (typeof converted === "string") return bad(converted);
  const { offer } = converted;
  if (!Array.isArray(body.families) || body.families.length < 2 || body.families.length > 6) {
    return bad("Add between 2 and 6 families.");
  }
  const families: Party[] = [];
  for (const raw of body.families) {
    const p = parseParty(isObject(raw) ? { adults: raw.adults, childAges: raw.childAges } : raw);
    if (typeof p === "string") return bad(p);
    families.push({ adults: p.adults, childAges: p.childAges });
  }
  try {
    const rules = selectRules(await loadFeeRules(), offer);
    const { group, shares } = fairShare({ offer, rules, families });
    return NextResponse.json({
      groupTrueCostPence: group.trueCostPence,
      groupAdvertisedPence: group.advertisedPence,
      shares: shares.map((s) => ({
        adults: s.party.adults,
        children: s.party.childAges.length,
        people: s.people,
        trueCostPence: s.trueCostPence,
        perPersonPence: s.perPersonPence,
      })),
    });
  } catch (err) {
    if (err instanceof PartyValidationError) return bad(err.message);
    return bad(err instanceof Error ? err.message : "Could not split this deal.");
  }
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
  // Listing on the public Fair Price board is the family's choice, off unless they tick it.
  const slug = await shareQuote(body.quoteId, body.listPublicly === true);
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
