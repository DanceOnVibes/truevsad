/**
 * TrueVsAd — core types.
 *
 * All money is integer pence (GBP minor units). Never use floats for money.
 */

export type Pence = number;

/** The six buckets that make up a TrueCost. */
export type CostCategory =
  | "supplier" // flight + stay + anything the supplier itself charges
  | "party_extra" // bags, seats, transfers, cots… driven by who is travelling
  | "levy" // tourist taxes, APD pass-throughs, resort fees
  | "entry_doc" // ETA / ETIAS / visas
  | "door_to_door" // getting from home to the airport and back (parking, train)
  | "payment_fx"; // card fees, FX margin on non-GBP charges

export const COST_CATEGORIES: readonly CostCategory[] = [
  "supplier",
  "party_extra",
  "levy",
  "entry_doc",
  "door_to_door",
  "payment_fx",
] as const;

/** Where a cost line came from — drives confidence. */
export type LineSource =
  | "extracted" // read from the deal the user pasted, then confirmed by them
  | "user" // typed in by the user
  | "rule" // computed from a fee_rule
  | "estimate"; // our best guess with no direct evidence

/**
 * The travelling party. Data-minimised by design:
 * child ages only (never DOBs), outward postcode only, no names.
 */
export interface Party {
  adults: number;
  /** Age of each child at time of travel, 0–17. */
  childAges: number[];
  /** Outward code only, e.g. "SE11". Used for door-to-door costs. */
  outwardPostcode?: string;
}

export type HeadlineBasis = "per_person" | "total";

/** What the advert says. Confirmed by the user before we price it. */
export interface Offer {
  headlinePence: Pence;
  headlineBasis: HeadlineBasis;
  /** ISO 4217. Non-GBP prices trigger payment/FX lines. */
  currency: string;
  nights: number;
  supplierName?: string;
  destination?: string;
  departureAirport?: string;
  /**
   * Itemised supplier charges if the advert shows them.
   * If empty, the advertised whole-party price is used as the supplier base.
   */
  supplierLines?: CostLineInput[];
}

/** How a fee rule multiplies out across the party. */
export type RuleUnit =
  | "per_party"
  | "per_person"
  | "per_adult"
  | "per_child"
  | "per_person_per_night"
  | "per_adult_per_night";

export type RuleAmount =
  | { kind: "fixed"; pence: Pence }
  /** Percentage of the supplier subtotal, in basis points (100 bp = 1%). */
  | { kind: "percent"; basisPoints: number };

export interface FeeRule {
  id: string;
  category: CostCategory;
  label: string;
  unit: RuleUnit;
  amount: RuleAmount;
  /** Children must be at least this age for a per_child / per_person rule to count them. */
  minAge?: number;
  /** …and at most this age. */
  maxAge?: number;
  /** 0–1. How sure we are this rule applies and is current. */
  confidence: number;
  /** True for placeholder rules that are NOT real-world figures. */
  demo?: boolean;
  /** Place names this rule is limited to (matched against Offer.destination). Empty = everywhere. */
  regions?: string[];
  /** Only for this supplier (matched against Offer.supplierName). Empty = every supplier. */
  supplierName?: string;
}

/** A cost line before the engine has stamped it. */
export interface CostLineInput {
  category: CostCategory;
  label: string;
  amountPence: Pence;
  source: LineSource;
  confidence: number;
  ruleId?: string;
}

export interface CostLine extends CostLineInput {
  /** Human-readable working, e.g. "2 adults × 3 nights × £2.50". */
  working?: string;
}

export interface Receipt {
  lines: CostLine[];
  subtotals: Record<CostCategory, Pence>;
}

export interface TrueCostInput {
  party: Party;
  offer: Offer;
  rules?: FeeRule[];
  /** Any extra lines the user added by hand. */
  extraLines?: CostLineInput[];
}

export interface TrueCostResult {
  /** Advertised headline expressed for the whole party. */
  advertisedPence: Pence;
  trueCostPence: Pence;
  /** trueCost − advertised. Positive = the deal costs more than it looks. */
  gapPence: Pence;
  /** gap as a fraction of advertised, e.g. 0.18 = 18% more. */
  gapRatio: number;
  receipt: Receipt;
  /** 0–1, value-weighted across all lines. */
  confidence: number;
  /** True if any demo (non-real) rule was used. UI must show a warning. */
  usedDemoRules: boolean;
  engineVersion: string;
}
