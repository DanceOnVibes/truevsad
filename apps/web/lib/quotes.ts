import { randomBytes } from "node:crypto";
import {
  calculateTrueCost,
  childExtras,
  EXTRA_PLACES,
  fairMark,
  fairMarkLevel,
  fold,
  isFairPrice,
  knownPlaceIn,
  placeKey,
  placeLabel,
  REFERENCE_PARTY,
  selectRules,
  sellerKey,
  type FairMark,
  type FairMarkLevel,
  FAIRMARK_SCALE,
} from "@truevsad/true-cost";
import type {
  CostCategory,
  CostLine,
  FeeRule,
  Inclusion,
  LineSource,
  Offer,
  Party,
  RuleUnit,
  TrueCostResult,
} from "@truevsad/true-cost";
import { DEMO_RULES } from "./demo-rules";
import { supabaseAdmin } from "./supabase-admin";
import { conversionNote, type Conversion } from "./currency";

export type SourceKind = "link" | "text" | "screenshot";

// ---------------------------------------------------------------------------
// Fee rules
// ---------------------------------------------------------------------------

interface FeeRuleRow {
  id: string;
  category: CostCategory;
  label: string;
  unit: RuleUnit;
  amount_pence: number | null;
  amount_bp: number | null;
  min_age: number | null;
  max_age: number | null;
  confidence: number | string;
  regions: string[] | null;
  supplier_name: string | null;
  covers: Inclusion | null;
  max_nights: number | null;
  months: number[] | null;
  exclusive_group: string | null;
  source_url: string | null;
  source_note: string | null;
  valid_to: string | null;
}

const MONTH_ABBR = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** "… checked 31 Oct 2026" in a rule's source note → "2026-10-31". */
export function checkedOnFrom(note: string | null | undefined): string | undefined {
  const m = note && /checked\s+(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/i.exec(note);
  if (!m) return undefined;
  const month = MONTH_ABBR.indexOf(m[2]!.slice(0, 3).toLowerCase());
  if (month < 0) return undefined;
  const d = new Date(Date.UTC(Number(m[3]), month, Number(m[1])));
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
}

/** Thrown when today's fees can't be loaded: we say so rather than price with made-up figures. */
export class FeeRulesUnavailable extends Error {
  constructor() {
    super("We couldn't load today's fees just now, so we can't price this deal yet. Please try again in a minute.");
    this.name = "FeeRulesUnavailable";
  }
}

/** The same rules serve every request for a minute: they change a few times a month at most. */
let rulesCache: { at: number; day: string; rules: FeeRule[]; expired: FeeRule[] } | null = null;
const RULES_CACHE_MS = 60_000;

/**
 * Active fee rules from the database. DEMO_RULES (clearly flagged on every receipt) only when no
 * database is configured at all, i.e. on a developer's computer. If the database is configured
 * but can't answer (twice), this throws FeeRulesUnavailable: a family never gets demo figures.
 * The caller narrows them to the offer with selectRules().
 */
export async function loadFeeRules(): Promise<FeeRule[]> {
  const db = supabaseAdmin();
  if (!db) {
    // The live site must never fall back to demo figures, even if its database settings go missing.
    if (process.env.VERCEL_ENV === "production") throw new FeeRulesUnavailable();
    return DEMO_RULES;
  }

  const today = new Date().toISOString().slice(0, 10);
  const yearAgo = new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10);
  if (rulesCache && rulesCache.day === today && Date.now() - rulesCache.at < RULES_CACHE_MS) return rulesCache.rules;

  let data: FeeRuleRow[] | null = null;
  for (let attempt = 0; attempt < 2 && !data; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 400));
    const res = await db
      .from("fee_rule")
      .select(
        "id, category, label, unit, amount_pence, amount_bp, min_age, max_age, confidence, regions, supplier_name, covers, max_nights, months, exclusive_group, source_url, source_note, valid_to",
      )
      .eq("is_active", true)
      .lte("valid_from", today)
      // Today's rules, plus those that ran out in the last year (see loadExpiredFeeRules).
      .or(`valid_to.is.null,valid_to.gte.${yearAgo}`);
    if (res.error) console.error("fee_rule read failed:", res.error.message);
    else if (!res.data?.length) console.error("fee_rule read returned no active rules");
    else data = res.data as FeeRuleRow[];
  }
  if (!data) throw new FeeRulesUnavailable();

  const all = mapRules(data);
  const rules = all.filter((r) => !r.validTo || r.validTo >= today);
  if (!rules.length) throw new FeeRulesUnavailable();
  rulesCache = { at: Date.now(), day: today, rules, expired: all.filter((r) => r.validTo && r.validTo < today) };
  return rules;
}

/**
 * Rules that ran out in the last year. Never priced: they're only used to tell the family
 * "the rate we hold ran out" when nothing newer has replaced it (expiredRuleNotes).
 */
export async function loadExpiredFeeRules(): Promise<FeeRule[]> {
  try {
    await loadFeeRules();
  } catch {
    return [];
  }
  return rulesCache?.expired ?? [];
}

function mapRules(data: FeeRuleRow[]): FeeRule[] {
  return data.map((r) => ({
    id: r.id,
    category: r.category,
    label: r.label,
    unit: r.unit,
    amount:
      r.amount_pence !== null
        ? { kind: "fixed", pence: Number(r.amount_pence) }
        : { kind: "percent", basisPoints: Number(r.amount_bp) },
    minAge: r.min_age ?? undefined,
    maxAge: r.max_age ?? undefined,
    confidence: Number(r.confidence),
    regions: r.regions ?? undefined,
    supplierName: r.supplier_name ?? undefined,
    covers: r.covers ?? undefined,
    maxNights: r.max_nights ?? undefined,
    months: r.months ?? undefined,
    exclusiveGroup: r.exclusive_group ?? undefined,
    sourceUrl: r.source_url && /^https?:\/\//.test(r.source_url) ? r.source_url : undefined,
    checkedOn: checkedOnFrom(r.source_note),
    validTo: r.valid_to ?? undefined,
  }));
}

// ---------------------------------------------------------------------------
// Save + share
// ---------------------------------------------------------------------------

/** Saves a quote privately. Returns its id, or null if saving isn't available. */
export async function saveQuote(input: {
  party: Party;
  offer: Offer;
  result: TrueCostResult;
  sourceKind: SourceKind;
  sourceUrl?: string;
  /** When the advert was in euros or dollars: kept so shared receipts show the original price and rate. */
  conversion?: Conversion;
  /** Every active fee rule (not just this deal's), for FairMark's standard-family figure. */
  rules: FeeRule[];
  /** FairMark's scrambled visitor code (see familyCode), so one family counts once. */
  familyCode: string | null;
  /** "Edit details": the earlier quote this one replaces. Removed if it's unshared and from the same visitor. */
  replaces?: string;
}): Promise<string | null> {
  const db = supabaseAdmin();
  if (!db) return null;

  // The postcode did its job at pricing time (council lookup, area letters in statistics).
  // Nothing reads it later, so it isn't stored with the receipt.
  const { outwardPostcode: _unused, ...partyToStore } = input.party;
  void _unused;
  const { data, error } = await db.rpc("save_quote", {
    p: {
      party: partyToStore,
      offer: { ...input.offer, sourceKind: input.sourceKind, sourceUrl: input.sourceUrl },
      result: input.result,
    },
  });
  if (error) {
    console.error("save_quote failed:", error.message);
    return null;
  }
  const id = data as string;

  // FairMark is stored with the quote so shares and history stay consistent.
  const fm = fairMark(input.result);
  const quoteExtra: Record<string, unknown> = {
    fairmark_percent: fm.percent,
    fairmark_level: fm.level,
    source_hash: input.familyCode,
  };
  // What the receipt said when it was priced (conversion, advert checks, seasonal rates).
  if (input.result.notes.length) quoteExtra.notes = input.result.notes.slice(0, 12);

  const extra: Record<string, unknown> = {};
  if (input.offer.freeChildClaim) extra.free_child_claim = true;
  if (input.offer.airline) extra.airline = input.offer.airline;
  if (input.offer.departMonth) extra.depart_month = input.offer.departMonth;
  if (input.offer.bookingType) extra.booking_type = input.offer.bookingType;
  if (input.conversion) {
    extra.fx_from_currency = input.conversion.from;
    extra.fx_from_amount_minor = input.conversion.amountMinor;
    extra.fx_rate = input.conversion.rate;
    extra.fx_date = input.conversion.date;
  }

  const [{ data: q }, known] = await Promise.all([
    db.from("true_cost_quote").select("offer_id, party_id").eq("id", id).maybeSingle(),
    knownPlaces(input.rules),
  ]);
  const entry = fairMarkIndexEntry(id, input.offer, input.party, input.rules, known);

  // Independent writes, all at once (each one logs its own failure and never blocks the answer).
  const logIf = (what: string) => ({ error }: { error: { message: string } | null }) => {
    if (error) console.error(`${what} failed:`, error.message);
  };
  await Promise.all([
    db.from("true_cost_quote").update(quoteExtra).eq("id", id).then(logIf("quote extras save")),
    q?.offer_id && Object.keys(extra).length
      ? db.from("offer").update(extra).eq("id", q.offer_id).then(logIf("offer extras save"))
      : null,
    q?.party_id && input.party.holdBags !== undefined
      ? db.from("party").update({ hold_bags: input.party.holdBags }).eq("id", q.party_id).then(logIf("party bags save"))
      : null,
    db.rpc("fairmark_index", { p: [entry] }).then(logIf("fairmark_index")),
    // "Edit details" priced the same deal again: drop the earlier private quote, so FairMark
    // never counts one family's corrections as extra deals. Only the same visitor's, never a shared one.
    input.replaces && input.replaces !== id && input.familyCode
      ? db
          .from("true_cost_quote")
          .delete()
          .eq("id", input.replaces)
          .is("share_slug", null)
          .eq("source_hash", input.familyCode)
          .then(logIf("replaced quote removal"))
      : null,
  ]);
  return id;
}

/** 10 random chars from a–z0–9 (~51 bits). Not the database id, so links can't be guessed. */
function newSlug(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = randomBytes(10);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/**
 * Makes a saved quote public and returns its share slug.
 * Calling it twice returns the same slug.
 */
export async function shareQuote(quoteId: string, listed = false): Promise<string | null> {
  const db = supabaseAdmin();
  if (!db) return null;

  const { data: existing, error: readErr } = await db
    .from("true_cost_quote")
    .select("share_slug")
    .eq("id", quoteId)
    .maybeSingle();
  if (readErr || !existing) return null;
  if (existing.share_slug) {
    await db.from("true_cost_quote").update({ is_public: true, listed }).eq("id", quoteId);
    return existing.share_slug as string;
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = newSlug();
    const { error } = await db
      .from("true_cost_quote")
      .update({ share_slug: slug, is_public: true, listed })
      .eq("id", quoteId)
      .is("share_slug", null);
    if (!error) return slug;
    if (error.code !== "23505") break; // only retry on a slug collision
  }
  return null;
}

// ---------------------------------------------------------------------------
// Public receipt
// ---------------------------------------------------------------------------

export interface PublicReceipt {
  advertisedPence: number;
  trueCostPence: number;
  gapPence: number;
  confidence: number;
  usedDemoRules: boolean;
  /** The engine version that priced it when it was saved. */
  engineVersion: string | null;
  createdAt: string;
  nights: number;
  destination: string | null;
  /**
   * The place a shared page may print: a recognised place or one a person approved, never the
   * hotel or anything else the family typed. Null = print no place name.
   */
  publicPlace: string | null;
  includes: Inclusion[];
  excludesTaxesAndFees: boolean;
  departDate: string | null;
  supplierName: string | null;
  /** "Kids go free": what each child still costs in extras (no ages on shared receipts). */
  childCostsPence: number[];
  /** The same deal priced with today's fee rules — differs when taxes or fees have changed. */
  todayTrueCostPence: number | null;
  /** FairMark recalculated on this view (today's rules); falls back to the stored one. */
  fairMark: FairMark;
  adults: number;
  children: number;
  lines: CostLine[];
  /** Plain facts about how this was priced (currency conversion, summer rates without a date). */
  notes: string[];
  /** The airline flying the deal, when the family told us. */
  airline: string | null;
  /** Package or booked separately, as the family confirmed. Picks the "If it goes wrong" lines. */
  bookingType: "package" | "separate" | null;
}

interface CostLineRow {
  category: string;
  label: string;
  amount_pence: number | string;
  working: string | null;
  source: string;
  confidence: number | string;
  fee_rule:
    | { source_url: string | null; source_note: string | null }
    | { source_url: string | null; source_note: string | null }[]
    | null;
}

/** Loads a shared receipt by slug. Only public quotes. No postcode, no ages, no link. */
export async function loadPublicReceipt(slug: string): Promise<PublicReceipt | null> {
  if (!/^[a-z0-9]{8,32}$/.test(slug)) return null;
  const db = supabaseAdmin();
  if (!db) return null;

  const { data: q } = await db
    .from("true_cost_quote")
    .select(
      "id, advertised_pence, true_cost_pence, gap_pence, confidence, used_demo_rules, engine_version, created_at, fairmark_level, notes, offer:offer_id (nights, destination, includes, excludes_taxes_and_fees, depart_on, depart_month, airline, headline_pence, headline_basis, currency, supplier_name, free_child_claim, fx_from_currency, fx_from_amount_minor, fx_rate, fx_date, booking_type), party:party_id (adults, child_ages, hold_bags)",
    )
    .eq("share_slug", slug)
    .eq("is_public", true)
    .maybeSingle();
  if (!q) return null;

  const { data: lines } = await db
    .from("cost_line")
    .select("category, label, amount_pence, working, source, confidence, fee_rule:fee_rule_id (source_url, source_note)")
    .eq("quote_id", q.id)
    .order("position");

  const offer = (Array.isArray(q.offer) ? q.offer[0] : q.offer) as
    | {
        nights: number;
        destination: string | null;
        includes: Inclusion[] | null;
        excludes_taxes_and_fees: boolean | null;
        depart_on: string | null;
        headline_pence: number | string;
        headline_basis: "per_person" | "total";
        currency: string;
        supplier_name: string | null;
        free_child_claim: boolean | null;
        fx_from_currency: Conversion["from"] | null;
        fx_from_amount_minor: number | string | null;
        fx_rate: number | string | null;
        fx_date: string | null;
        depart_month: number | null;
        airline: string | null;
        booking_type: string | null;
      }
    | null;
  const party = (Array.isArray(q.party) ? q.party[0] : q.party) as
    | { adults: number; child_ages: number[]; hold_bags: number | null }
    | null;
  const familyParty = party
    ? { adults: party.adults, childAges: party.child_ages ?? [], holdBags: party.hold_bags ?? undefined }
    : null;

  // Watch: re-price with today's rules. Ages stay on the server; only the total is shown.
  let todayTrueCostPence: number | null = null;
  let today: FairMark | null = null;
  let childCostsPence: number[] = [];
  const notes: string[] = [];
  if (offer?.fx_from_currency && offer.fx_rate != null && offer.fx_date && offer.fx_from_amount_minor != null) {
    notes.push(
      conversionNote({
        from: offer.fx_from_currency,
        amountMinor: Number(offer.fx_from_amount_minor),
        rate: Number(offer.fx_rate),
        date: offer.fx_date,
      }),
    );
  }
  if (offer && party) {
    try {
      const o: Offer = {
        headlinePence: Number(offer.headline_pence),
        headlineBasis: offer.headline_basis,
        currency: offer.currency ?? "GBP",
        nights: offer.nights,
        destination: offer.destination ?? undefined,
        supplierName: offer.supplier_name ?? undefined,
        includes: offer.includes ?? [],
        departDate: offer.depart_on ?? undefined,
        departMonth: offer.depart_month ?? undefined,
        airline: offer.airline ?? undefined,
        excludesTaxesAndFees: offer.excludes_taxes_and_fees === true,
        freeChildClaim: offer.free_child_claim === true,
      };
      const rules = selectRules(await loadFeeRules(), o);
      const now = calculateTrueCost({
        party: familyParty!,
        offer: o,
        rules,
        asOf: new Date().toISOString().slice(0, 10),
      });
      todayTrueCostPence = now.trueCostPence;
      today = fairMark(now);
      // Notes saved when it was priced win (they include the advert checks); otherwise today's.
      const stored = Array.isArray(q.notes) ? (q.notes as string[]) : [];
      if (stored.length) notes.splice(0, notes.length, ...stored);
      else notes.push(...now.notes);
      if (offer.free_child_claim) {
        childCostsPence = childExtras({
          party: familyParty!,
          offer: o,
          rules,
        }).map((c) => c.pence);
      }
    } catch {
      todayTrueCostPence = null;
    }
  }

  // The only place name a shared page prints: never the hotel or anything else the family typed.
  let shownPlace: string | null = null;
  if (offer?.destination) {
    try {
      const [rulesForPlaces, names] = await Promise.all([loadFeeRules().catch(() => [] as FeeRule[]), approvedNames()]);
      shownPlace = publicPlace(offer.destination, await knownPlaces(rulesForPlaces), names.places);
    } catch {
      shownPlace = null;
    }
  }

  const receiptLines: CostLine[] = ((lines ?? []) as unknown as CostLineRow[]).map((l) => ({
    category: l.category as CostCategory,
    label: l.label as string,
    amountPence: Number(l.amount_pence),
    working: (l.working as string | null) ?? undefined,
    source: l.source as LineSource,
    confidence: Number(l.confidence),
    sourceUrl: one(l.fee_rule)?.source_url ?? undefined,
    checkedOn: checkedOnFrom(one(l.fee_rule)?.source_note),
  }));

  return {
    advertisedPence: Number(q.advertised_pence),
    trueCostPence: Number(q.true_cost_pence),
    gapPence: Number(q.gap_pence),
    confidence: Number(q.confidence),
    usedDemoRules: Boolean(q.used_demo_rules),
    engineVersion: (q.engine_version as string | null) ?? null,
    createdAt: q.created_at as string,
    nights: offer?.nights ?? 0,
    // Shared pages never get the typed destination: only the checked place name, if any.
    destination: shownPlace,
    publicPlace: shownPlace,
    includes: offer?.includes ?? [],
    excludesTaxesAndFees: offer?.excludes_taxes_and_fees === true,
    departDate: offer?.depart_on ?? null,
    supplierName: offer?.supplier_name ?? null,
    childCostsPence,
    todayTrueCostPence,
    // Today's figure when we can re-price; otherwise what was stored when it was priced.
    fairMark:
      today ??
      fairMark({
        advertisedPence: Number(q.advertised_pence),
        trueCostPence: Number(q.true_cost_pence),
        confidence: Number(q.confidence),
        usedDemoRules: Boolean(q.used_demo_rules),
        taxCoverage: q.fairmark_level != null && q.fairmark_level !== "unavailable",
        advertExcludesFees: offer?.excludes_taxes_and_fees === true,
        lines: receiptLines,
      }),
    adults: party?.adults ?? 0,
    children: party?.child_ages?.length ?? 0,
    lines: receiptLines,
    notes,
    airline: offer?.airline ?? null,
    bookingType: offer?.booking_type === "package" || offer?.booking_type === "separate" ? (offer.booking_type as "package" | "separate") : null,
  };
}

// ---------------------------------------------------------------------------
// FairMark board + leaderboard
// ---------------------------------------------------------------------------

/** Deals counted on the leaderboard: checked in the last 30 days (unshared quotes are deleted after 30). */
export const LEADERBOARD_DAYS = 30;
/** A seller needs at least this many checked deals before it's named on the leaderboard. */
export const LEADERBOARD_MIN_DEALS = 10;
/** …from at least this many different families (scrambled visitor codes), */
export const LEADERBOARD_MIN_FAMILIES = 5;
/** …and each family counts for at most this many deals per seller, so one person can't sway a median. */
export const LEADERBOARD_PER_FAMILY = 2;

interface BoardOfferRow {
  nights: number;
  depart_month?: number | null;
  airline?: string | null;
  destination: string | null;
  supplier_name: string | null;
  includes: Inclusion[] | null;
  depart_on: string | null;
  headline_pence: number | string;
  headline_basis: "per_person" | "total";
  currency: string;
  excludes_taxes_and_fees: boolean | null;
  free_child_claim?: boolean | null;
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function toOffer(o: BoardOfferRow): Offer {
  return {
    headlinePence: Number(o.headline_pence),
    headlineBasis: o.headline_basis,
    currency: o.currency ?? "GBP",
    nights: o.nights,
    destination: o.destination ?? undefined,
    supplierName: o.supplier_name ?? undefined,
    includes: o.includes ?? [],
    departDate: o.depart_on ?? undefined,
    departMonth: o.depart_month ?? undefined,
    airline: o.airline ?? undefined,
    excludesTaxesAndFees: o.excludes_taxes_and_fees === true,
    freeChildClaim: o.free_child_claim === true,
  };
}

// One seller key and one place key however it's typed (moved to the engine so it can be tested).
export { placeKey, sellerKey } from "@truevsad/true-cost";

export interface ListedDeal {
  slug: string;
  createdAt: string;
  destination: string | null;
  supplierName: string | null;
  nights: number;
  adults: number;
  children: number;
  advertisedPence: number;
  trueCostPence: number;
  fairMark: FairMark;
  /** What the family ticked as already in the deal (hold bags, transfers…). */
  includes: Inclusion[];
}

// ---------------------------------------------------------------------------
// Names shown in public: approved sellers, recognised places
// ---------------------------------------------------------------------------

/** Fee-rule regions, popular places and FCDO country names: the places we can name in public. */
export interface KnownPlaces {
  places: string[];
  countries: string[];
}

let countryCache: { at: number; names: string[] } | null = null;

export async function knownPlaces(rules: FeeRule[]): Promise<KnownPlaces> {
  if (!countryCache || Date.now() - countryCache.at > 6 * 3_600_000) {
    const db = supabaseAdmin();
    const { data } = db ? await db.from("fcdo_advice").select("name") : { data: null };
    const names = (data ?? []).map((r) => String((r as { name: string }).name)).filter(Boolean);
    if (names.length) countryCache = { at: Date.now(), names };
  }
  return {
    places: [...new Set([...rules.flatMap((r) => r.regions ?? []), ...EXTRA_PLACES])],
    countries: countryCache?.names ?? [],
  };
}

/** Approved names, by key: what may appear on /fairmark and the homepage. */
async function approvedNames(): Promise<{ sellers: Map<string, string>; places: Map<string, string> }> {
  const sellers = new Map<string, string>();
  const places = new Map<string, string>();
  const db = supabaseAdmin();
  if (!db) return { sellers, places };
  const { data, error } = await db.from("public_name").select("kind, key, display").eq("status", "approved");
  if (error) console.error("public_name read failed:", error.message);
  for (const r of (data ?? []) as { kind: string; key: string; display: string }[]) {
    (r.kind === "seller" ? sellers : places).set(r.key, r.display);
  }
  return { sellers, places };
}

/** The place a listed deal may show: a recognised place, or one a person approved. Never the hotel. */
function publicPlace(destination: string | null, known: KnownPlaces, approved: Map<string, string>): string | null {
  if (!destination) return null;
  return knownPlaceIn(destination, known.places, known.countries) ?? approved.get(placeKey(destination)) ?? null;
}

/** What FairMark stores for one quote: the engine's figure for the standard family, and the name keys. */
export interface FairMarkIndexEntry {
  id: string;
  ref_percent: number | null;
  seller_key: string | null;
  /** The seller as typed: only stored as a name waiting for review, never shown until approved. */
  seller: string | null;
  place_key: string | null;
  /** Set only for a place we don't recognise, so a person can look at it. */
  place: string | null;
}

export function fairMarkIndexEntry(id: string, offer: Offer, party: Party, rules: FeeRule[], known: KnownPlaces): FairMarkIndexEntry {
  // Sellers are compared on one standard family; a "total price" advert keeps its own party.
  const refParty = offer.headlineBasis === "per_person" ? REFERENCE_PARTY : party;
  let ref: number | null = null;
  try {
    ref = fairMark(calculateTrueCost({ party: refParty, offer, rules: selectRules(rules, offer) })).percent;
  } catch {
    ref = null;
  }
  const seller = offer.supplierName?.trim() ?? "";
  const sKey = seller ? sellerKey(seller).slice(0, 120) : "";
  const recognised = offer.destination ? knownPlaceIn(offer.destination, known.places, known.countries) : null;
  const pKey = offer.destination ? (recognised ? fold(recognised) : placeKey(offer.destination)).slice(0, 120) : "";
  return {
    id,
    ref_percent: ref,
    seller_key: sKey || null,
    seller: sKey ? seller.slice(0, 80) : null,
    place_key: pKey || null,
    place: pKey && !recognised && offer.destination ? placeLabel(offer.destination) : null,
  };
}

/**
 * Deals families chose to list publicly, newest first, each re-priced with today's rules
 * for the family's own party (FairMark is recalculated on every view).
 * Order stays newest first: FairMark never boosts or demotes a deal.
 * A deal only appears once its place can be named safely, and the seller only once approved.
 */
export async function loadListedDeals(fairOnly: boolean): Promise<ListedDeal[]> {
  const db = supabaseAdmin();
  if (!db) return [];
  const [{ data }, rules, names] = await Promise.all([
    db
      .from("true_cost_quote")
      .select(
        "share_slug, created_at, offer:offer_id (nights, destination, supplier_name, includes, depart_on, depart_month, airline, headline_pence, headline_basis, currency, excludes_taxes_and_fees, free_child_claim), party:party_id (adults, child_ages)",
      )
      .eq("listed", true)
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(200),
    loadFeeRules().catch(() => null),
    approvedNames(),
  ]);
  if (!rules) return []; // can't price today: show nothing rather than old or made-up figures
  if (!data) return [];
  const known = await knownPlaces(rules);

  const out: ListedDeal[] = [];
  for (const row of data as unknown as {
    share_slug: string;
    created_at: string;
    offer: BoardOfferRow | BoardOfferRow[] | null;
    party: { adults: number; child_ages: number[] | null } | { adults: number; child_ages: number[] | null }[] | null;
  }[]) {
    const o = one(row.offer);
    const p = one(row.party);
    if (!o || !p) continue;
    const place = publicPlace(o.destination, known, names.places);
    if (!place) continue; // waiting for a person to check the place name
    try {
      const offer = toOffer(o);
      const res = calculateTrueCost({
        party: { adults: p.adults, childAges: p.child_ages ?? [] },
        offer,
        rules: selectRules(rules, offer),
      });
      const fm = fairMark(res);
      if (fairOnly && !isFairPrice(fm.level)) continue;
      out.push({
        slug: row.share_slug,
        createdAt: row.created_at,
        destination: place,
        supplierName: o.supplier_name ? (names.sellers.get(sellerKey(o.supplier_name)) ?? null) : null,
        nights: o.nights,
        adults: p.adults,
        children: p.child_ages?.length ?? 0,
        advertisedPence: res.advertisedPence,
        trueCostPence: res.trueCostPence,
        fairMark: fm,
        includes: offer.includes ?? [],
      });
    } catch {
      /* skip a deal we can't price */
    }
    if (out.length >= 60) break;
  }
  return out;
}

export interface LeaderboardRow {
  seller: string;
  deals: number;
  /** Different families (scrambled visitor codes) behind those deals. */
  families: number;
  destinations: number;
  averagePercent: number;
  medianPercent: number;
  fairShare: number;
  bestPercent: number;
  worstPercent: number;
  /** Based on the median, so one odd deal can't make or break a seller. */
  level: FairMarkLevel;
  /** Earned, never bought: 30+ deals in 5+ destinations with a median gap of 10% or less. */
  verified: boolean;
}

/**
 * Operator Fairness Leaderboard, worked out in the database in one query. Every deal checked
 * in the last 30 days (shared or not — only anonymous totals per seller are shown) carries the
 * engine's FairMark for ONE reference family (2 adults, children 7 and 11), refreshed nightly
 * with that day's fees. Only approved seller names appear; repeats count once; each family
 * counts at most twice per seller; a seller needs 10+ deals from 5+ families.
 */
export async function loadLeaderboard(): Promise<{ rows: LeaderboardRow[]; dealsCounted: number }> {
  const db = supabaseAdmin();
  if (!db) return { rows: [], dealsCounted: 0 };
  const { data, error } = await db.rpc("fairmark_leaderboard", {
    p_days: LEADERBOARD_DAYS,
    p_min_deals: LEADERBOARD_MIN_DEALS,
    p_min_sources: LEADERBOARD_MIN_FAMILIES,
    p_per_source: LEADERBOARD_PER_FAMILY,
    p_fair: FAIRMARK_SCALE.fair,
  });
  if (error || !data) {
    if (error) console.error("fairmark_leaderboard failed:", error.message);
    return { rows: [], dealsCounted: 0 };
  }
  const res = data as {
    dealsCounted: number;
    rows: {
      seller: string;
      deals: number;
      sources: number;
      destinations: number;
      averagePercent: number;
      medianPercent: number;
      fairShare: number;
      bestPercent: number;
      worstPercent: number;
    }[];
  };
  const rows = res.rows.map((r) => ({
    seller: r.seller,
    deals: r.deals,
    families: r.sources,
    destinations: r.destinations,
    averagePercent: r.averagePercent,
    medianPercent: r.medianPercent,
    fairShare: r.fairShare,
    bestPercent: r.bestPercent,
    worstPercent: r.worstPercent,
    level: fairMarkLevel(r.medianPercent),
    verified: r.deals >= 30 && r.destinations >= 5 && r.medianPercent <= FAIRMARK_SCALE.fair,
  }));
  return { rows, dealsCounted: res.dealsCounted };
}

/**
 * The nightly job: re-price every deal from the last 30 days for the standard family with
 * today's fees, so the leaderboard never uses yesterday's rules for long. Pages through the
 * table 1,000 at a time (no row cap) and writes back in batches.
 */
export async function reindexFairMark({ deadlineMs = 240_000 } = {}): Promise<{ indexed: number; skipped: number; done: boolean } | { error: string }> {
  const db = supabaseAdmin();
  if (!db) return { error: "Supabase isn't configured" };
  const started = Date.now();
  let rules: FeeRule[];
  try {
    rules = await loadFeeRules();
  } catch {
    return { error: "Today's fee rules couldn't be loaded, so nothing was re-priced" };
  }
  if (rules === DEMO_RULES) return { error: "Only demo fee rules could be loaded, so nothing was re-priced" };
  const known = await knownPlaces(rules);
  const since = new Date(Date.now() - LEADERBOARD_DAYS * 86_400_000).toISOString();

  let indexed = 0;
  let skipped = 0;
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    if (Date.now() - started > deadlineMs) return { indexed, skipped, done: false };
    const { data, error } = await db
      .from("true_cost_quote")
      .select(
        "id, offer:offer_id (nights, destination, supplier_name, includes, depart_on, depart_month, airline, headline_pence, headline_basis, currency, excludes_taxes_and_fees, free_child_claim), party:party_id (adults, child_ages)",
      )
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) return { error: `Reading quotes failed: ${error.message}` };
    const page = (data ?? []) as unknown as {
      id: string;
      offer: BoardOfferRow | BoardOfferRow[] | null;
      party: { adults: number; child_ages: number[] | null } | { adults: number; child_ages: number[] | null }[] | null;
    }[];
    const entries: FairMarkIndexEntry[] = [];
    for (const row of page) {
      const o = one(row.offer);
      const p = one(row.party);
      if (!o || !p) {
        skipped++;
        continue;
      }
      entries.push(fairMarkIndexEntry(row.id, toOffer(o), { adults: p.adults, childAges: p.child_ages ?? [] }, rules, known));
    }
    for (let i = 0; i < entries.length; i += 500) {
      const { error: upErr } = await db.rpc("fairmark_index", { p: entries.slice(i, i + 500) });
      if (upErr) return { error: `Saving FairMark failed: ${upErr.message}` };
    }
    indexed += entries.length;
    if (page.length < PAGE) return { indexed, skipped, done: true };
  }
}

// ---------------------------------------------------------------------------
// Public fee tables (/fees)
// ---------------------------------------------------------------------------

export interface PublicFeeRule {
  category: CostCategory;
  label: string;
  unit: RuleUnit;
  amountPence: number | null;
  amountBp: number | null;
  minAge: number | null;
  maxAge: number | null;
  supplierName: string | null;
  regions: string[];
  confidence: number;
  sourceUrl: string | null;
  sourceNote: string | null;
  validFrom: string;
  validTo: string | null;
  months: number[];
  maxNights: number | null;
}

/** Every fee rule in use today, exactly as the engine uses it. */
export async function loadPublicFeeRules(): Promise<PublicFeeRule[]> {
  const db = supabaseAdmin();
  if (!db) return [];
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await db
    .from("fee_rule")
    .select(
      "category, label, unit, amount_pence, amount_bp, min_age, max_age, supplier_name, regions, confidence, source_url, source_note, valid_from, valid_to, months, max_nights",
    )
    .eq("is_active", true)
    .lte("valid_from", today)
    .or(`valid_to.is.null,valid_to.gte.${today}`)
    .order("category")
    .order("label");
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    category: r.category as CostCategory,
    label: r.label as string,
    unit: r.unit as RuleUnit,
    amountPence: r.amount_pence === null ? null : Number(r.amount_pence),
    amountBp: r.amount_bp === null ? null : Number(r.amount_bp),
    minAge: (r.min_age as number | null) ?? null,
    maxAge: (r.max_age as number | null) ?? null,
    supplierName: (r.supplier_name as string | null) ?? null,
    regions: (r.regions as string[] | null) ?? [],
    confidence: Number(r.confidence),
    sourceUrl: typeof r.source_url === "string" && /^https?:\/\//.test(r.source_url) ? r.source_url : null,
    sourceNote: (r.source_note as string | null) ?? null,
    validFrom: r.valid_from as string,
    validTo: (r.valid_to as string | null) ?? null,
    months: (r.months as number[] | null) ?? [],
    maxNights: (r.max_nights as number | null) ?? null,
  }));
}
