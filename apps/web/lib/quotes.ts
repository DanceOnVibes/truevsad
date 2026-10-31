import { randomBytes } from "node:crypto";
import {
  calculateTrueCost,
  childExtras,
  fairMark,
  fairMarkLevel,
  isFairPrice,
  REFERENCE_PARTY,
  selectRules,
  type FairMark,
  type FairMarkLevel,
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
}

/**
 * Active fee rules from the database. Falls back to DEMO_RULES (clearly flagged)
 * until real, sourced rules are added — or if the database can't be reached.
 * The caller narrows them to the offer with selectRules().
 */
export async function loadFeeRules(): Promise<FeeRule[]> {
  const db = supabaseAdmin();
  if (!db) return DEMO_RULES;

  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await db
    .from("fee_rule")
    .select(
      "id, category, label, unit, amount_pence, amount_bp, min_age, max_age, confidence, regions, supplier_name, covers, max_nights, months, exclusive_group, source_url",
    )
    .eq("is_active", true)
    .lte("valid_from", today)
    .or(`valid_to.is.null,valid_to.gte.${today}`);

  if (error || !data || data.length === 0) return DEMO_RULES;

  return (data as FeeRuleRow[]).map((r) => ({
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
  /** Set when the advert was in euros or dollars: kept so shared receipts show the original price and rate. */
  conversion?: Conversion;
}): Promise<string | null> {
  const db = supabaseAdmin();
  if (!db) return null;

  const { data, error } = await db.rpc("save_quote", {
    p: {
      party: input.party,
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
  const { error: fmErr } = await db
    .from("true_cost_quote")
    .update({ fairmark_percent: fm.percent, fairmark_level: fm.level })
    .eq("id", id);
  if (fmErr) console.error("fairmark save failed:", fmErr.message);
  const extra: Record<string, unknown> = {};
  if (input.offer.freeChildClaim) extra.free_child_claim = true;
  if (input.conversion) {
    extra.fx_from_currency = input.conversion.from;
    extra.fx_from_amount_minor = input.conversion.amountMinor;
    extra.fx_rate = input.conversion.rate;
    extra.fx_date = input.conversion.date;
  }
  if (Object.keys(extra).length) {
    const { data: q } = await db.from("true_cost_quote").select("offer_id").eq("id", id).maybeSingle();
    if (q?.offer_id) {
      const { error: oErr } = await db.from("offer").update(extra).eq("id", q.offer_id);
      if (oErr) console.error("offer extras save failed:", oErr.message);
    }
  }
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
  createdAt: string;
  nights: number;
  destination: string | null;
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
}

interface CostLineRow {
  category: string;
  label: string;
  amount_pence: number | string;
  working: string | null;
  source: string;
  confidence: number | string;
  fee_rule: { source_url: string | null } | { source_url: string | null }[] | null;
}

/** Loads a shared receipt by slug. Only public quotes. No postcode, no ages, no link. */
export async function loadPublicReceipt(slug: string): Promise<PublicReceipt | null> {
  if (!/^[a-z0-9]{8,32}$/.test(slug)) return null;
  const db = supabaseAdmin();
  if (!db) return null;

  const { data: q } = await db
    .from("true_cost_quote")
    .select(
      "id, advertised_pence, true_cost_pence, gap_pence, confidence, used_demo_rules, created_at, fairmark_level, offer:offer_id (nights, destination, includes, excludes_taxes_and_fees, depart_on, headline_pence, headline_basis, currency, supplier_name, free_child_claim, fx_from_currency, fx_from_amount_minor, fx_rate, fx_date), party:party_id (adults, child_ages)",
    )
    .eq("share_slug", slug)
    .eq("is_public", true)
    .maybeSingle();
  if (!q) return null;

  const { data: lines } = await db
    .from("cost_line")
    .select("category, label, amount_pence, working, source, confidence, fee_rule:fee_rule_id (source_url)")
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
      }
    | null;
  const party = (Array.isArray(q.party) ? q.party[0] : q.party) as
    | { adults: number; child_ages: number[] }
    | null;

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
      };
      const rules = selectRules(await loadFeeRules(), o);
      const now = calculateTrueCost({
        party: { adults: party.adults, childAges: party.child_ages ?? [] },
        offer: o,
        rules,
      });
      todayTrueCostPence = now.trueCostPence;
      today = fairMark(now);
      notes.push(...now.notes);
      if (offer.free_child_claim) {
        childCostsPence = childExtras({
          party: { adults: party.adults, childAges: party.child_ages ?? [] },
          offer: o,
          rules,
        }).map((c) => c.pence);
      }
    } catch {
      todayTrueCostPence = null;
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
  }));

  return {
    advertisedPence: Number(q.advertised_pence),
    trueCostPence: Number(q.true_cost_pence),
    gapPence: Number(q.gap_pence),
    confidence: Number(q.confidence),
    usedDemoRules: Boolean(q.used_demo_rules),
    createdAt: q.created_at as string,
    nights: offer?.nights ?? 0,
    destination: offer?.destination ?? null,
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
        lines: receiptLines,
      }),
    adults: party?.adults ?? 0,
    children: party?.child_ages?.length ?? 0,
    lines: receiptLines,
    notes,
  };
}

// ---------------------------------------------------------------------------
// FairMark board + leaderboard
// ---------------------------------------------------------------------------

/** Deals counted on the leaderboard: checked in the last 30 days (unshared quotes are deleted after 30). */
export const LEADERBOARD_DAYS = 30;
/** A seller needs at least this many checked deals before it's named on the leaderboard. */
export const LEADERBOARD_MIN_DEALS = 10;

interface BoardOfferRow {
  nights: number;
  destination: string | null;
  supplier_name: string | null;
  includes: Inclusion[] | null;
  depart_on: string | null;
  headline_pence: number | string;
  headline_basis: "per_person" | "total";
  currency: string;
  excludes_taxes_and_fees: boolean | null;
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
  };
}

/** "Golden Donaire Beach, Tarragona, Spain" → "tarragona spain": town/region + country, without the hotel. */
export function placeKey(destination: string): string {
  const parts = destination.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
  return (parts.length >= 3 ? parts.slice(-2) : parts.length === 2 ? parts : parts.slice(0, 1)).join(" ");
}

/** "Jet2holidays.com", "jet2 holidays" → "jet2holidays": one leaderboard row per seller. */
export function sellerKey(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(www|com|co|uk|ltd|limited)\b/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

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
}

/**
 * Deals families chose to list publicly, newest first, each re-priced with today's rules
 * for the family's own party (FairMark is recalculated on every view).
 * Order stays newest first: FairMark never boosts or demotes a deal.
 */
export async function loadListedDeals(fairOnly: boolean): Promise<ListedDeal[]> {
  const db = supabaseAdmin();
  if (!db) return [];
  const { data } = await db
    .from("true_cost_quote")
    .select(
      "share_slug, created_at, offer:offer_id (nights, destination, supplier_name, includes, depart_on, headline_pence, headline_basis, currency, excludes_taxes_and_fees), party:party_id (adults, child_ages)",
    )
    .eq("listed", true)
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(200);
  if (!data) return [];

  const rules = await loadFeeRules();
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
        destination: o.destination,
        supplierName: o.supplier_name,
        nights: o.nights,
        adults: p.adults,
        children: p.child_ages?.length ?? 0,
        advertisedPence: res.advertisedPence,
        trueCostPence: res.trueCostPence,
        fairMark: fm,
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
 * Operator Fairness Leaderboard. Every deal checked in the last 30 days (shared or not —
 * only anonymous totals per seller are shown) is re-priced with today's rules for ONE
 * reference family (2 adults, children 7 and 11), so sellers are compared like for like.
 * "Total price" adverts keep their own party: the price was for that party.
 */
export async function loadLeaderboard(): Promise<{ rows: LeaderboardRow[]; dealsCounted: number }> {
  const db = supabaseAdmin();
  if (!db) return { rows: [], dealsCounted: 0 };
  const since = new Date(Date.now() - LEADERBOARD_DAYS * 86_400_000).toISOString();
  const { data } = await db
    .from("true_cost_quote")
    .select(
      "offer:offer_id (nights, destination, supplier_name, includes, depart_on, headline_pence, headline_basis, currency, excludes_taxes_and_fees), party:party_id (adults, child_ages)",
    )
    .gte("created_at", since)
    .limit(5000);
  if (!data) return { rows: [], dealsCounted: 0 };

  const rules = await loadFeeRules();
  type SellerGroup = { names: Map<string, number>; pcts: number[]; places: Set<string> };
  const groups = new Map<string, SellerGroup>();
  let dealsCounted = 0;
  for (const row of data as unknown as {
    offer: BoardOfferRow | BoardOfferRow[] | null;
    party: { adults: number; child_ages: number[] | null } | { adults: number; child_ages: number[] | null }[] | null;
  }[]) {
    const o = one(row.offer);
    const p = one(row.party);
    if (!o || !p || !o.supplier_name) continue; // no seller name: badge only, not on the leaderboard
    const key = sellerKey(o.supplier_name);
    if (!key) continue;
    try {
      const offer = toOffer(o);
      const party = offer.headlineBasis === "per_person" ? REFERENCE_PARTY : { adults: p.adults, childAges: p.child_ages ?? [] };
      const fm = fairMark(calculateTrueCost({ party, offer, rules: selectRules(rules, offer) }));
      if (fm.percent === null) continue;
      const g: SellerGroup = groups.get(key) ?? { names: new Map(), pcts: [], places: new Set() };
      g.names.set(o.supplier_name, (g.names.get(o.supplier_name) ?? 0) + 1);
      g.pcts.push(fm.percent);
      if (o.destination) g.places.add(placeKey(o.destination));
      groups.set(key, g);
      dealsCounted++;
    } catch {
      /* skip */
    }
  }

  const rows: LeaderboardRow[] = [];
  for (const g of groups.values()) {
    if (g.pcts.length < LEADERBOARD_MIN_DEALS) continue;
    const sorted = [...g.pcts].sort((a, b) => a - b);
    const mid = sorted.length / 2;
    const median = sorted.length % 2 ? sorted[Math.floor(mid)]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
    const average = g.pcts.reduce((s, x) => s + x, 0) / g.pcts.length;
    const name = [...g.names.entries()].sort((a, b) => b[1] - a[1])[0]![0];
    rows.push({
      seller: name,
      deals: g.pcts.length,
      destinations: g.places.size,
      averagePercent: average,
      medianPercent: median,
      fairShare: g.pcts.filter((x) => x <= 10).length / g.pcts.length,
      bestPercent: sorted[0]!,
      worstPercent: sorted.at(-1)!,
      level: fairMarkLevel(median),
      verified: g.pcts.length >= 30 && g.places.size >= 5 && median <= 10,
    });
  }
  return { rows, dealsCounted };
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
