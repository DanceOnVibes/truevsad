import { randomBytes } from "node:crypto";
import type {
  CostCategory,
  CostLine,
  FeeRule,
  LineSource,
  Offer,
  Party,
  RuleUnit,
  TrueCostResult,
} from "@truevsad/true-cost";
import { DEMO_RULES } from "./demo-rules";
import { supabaseAdmin } from "./supabase-admin";

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
      "id, category, label, unit, amount_pence, amount_bp, min_age, max_age, confidence, regions, supplier_name",
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
  return data as string;
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
export async function shareQuote(quoteId: string): Promise<string | null> {
  const db = supabaseAdmin();
  if (!db) return null;

  const { data: existing, error: readErr } = await db
    .from("true_cost_quote")
    .select("share_slug")
    .eq("id", quoteId)
    .maybeSingle();
  if (readErr || !existing) return null;
  if (existing.share_slug) {
    await db.from("true_cost_quote").update({ is_public: true }).eq("id", quoteId);
    return existing.share_slug as string;
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = newSlug();
    const { error } = await db
      .from("true_cost_quote")
      .update({ share_slug: slug, is_public: true })
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
  adults: number;
  children: number;
  lines: CostLine[];
}

interface CostLineRow {
  category: string;
  label: string;
  amount_pence: number | string;
  working: string | null;
  source: string;
  confidence: number | string;
}

/** Loads a shared receipt by slug. Only public quotes. No postcode, no ages, no link. */
export async function loadPublicReceipt(slug: string): Promise<PublicReceipt | null> {
  if (!/^[a-z0-9]{8,32}$/.test(slug)) return null;
  const db = supabaseAdmin();
  if (!db) return null;

  const { data: q } = await db
    .from("true_cost_quote")
    .select(
      "id, advertised_pence, true_cost_pence, gap_pence, confidence, used_demo_rules, created_at, offer:offer_id (nights, destination), party:party_id (adults, child_ages)",
    )
    .eq("share_slug", slug)
    .eq("is_public", true)
    .maybeSingle();
  if (!q) return null;

  const { data: lines } = await db
    .from("cost_line")
    .select("category, label, amount_pence, working, source, confidence")
    .eq("quote_id", q.id)
    .order("position");

  const offer = (Array.isArray(q.offer) ? q.offer[0] : q.offer) as
    | { nights: number; destination: string | null }
    | null;
  const party = (Array.isArray(q.party) ? q.party[0] : q.party) as
    | { adults: number; child_ages: number[] }
    | null;

  return {
    advertisedPence: Number(q.advertised_pence),
    trueCostPence: Number(q.true_cost_pence),
    gapPence: Number(q.gap_pence),
    confidence: Number(q.confidence),
    usedDemoRules: Boolean(q.used_demo_rules),
    createdAt: q.created_at as string,
    nights: offer?.nights ?? 0,
    destination: offer?.destination ?? null,
    adults: party?.adults ?? 0,
    children: party?.child_ages?.length ?? 0,
    lines: ((lines ?? []) as CostLineRow[]).map((l) => ({
      category: l.category as CostCategory,
      label: l.label as string,
      amountPence: Number(l.amount_pence),
      working: (l.working as string | null) ?? undefined,
      source: l.source as LineSource,
      confidence: Number(l.confidence),
    })),
  };
}
