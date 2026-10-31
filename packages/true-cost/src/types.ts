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

/** Things a deal can already include, so we never charge for them twice. */
export type Inclusion = "hold_bag" | "cabin_bag" | "seats" | "transfers" | "local_taxes";

export const INCLUSIONS: readonly Inclusion[] = ["hold_bag", "cabin_bag", "seats", "transfers", "local_taxes"] as const;

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
  /** What the family confirmed the deal already includes. */
  includes?: Inclusion[];
  /**
   * The advert itself says the price leaves things out ("plus taxes and fees", "excl. taxes").
   * We add the fees we know about, but the seller may add more at checkout.
   */
  excludesTaxesAndFees?: boolean;
  /** First day of the trip, YYYY-MM-DD, if the family told us. Picks seasonal tax rates. */
  departDate?: string;
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
  | "per_adult_per_night"
  /** Once per night for the whole party, e.g. a hotel fee charged per room per night (assumes one room). */
  | "per_party_per_night";

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
  /** Skip this rule when the deal already includes this item (e.g. a bag fee covers "hold_bag"). */
  covers?: Inclusion;
  /** Per-night rules stop counting after this many nights (e.g. Catalonia charges the first 7 only). */
  maxNights?: number;
  /**
   * Months of travel this rate applies to (1 = January … 12 = December), e.g. a summer rate
   * [5,6,7,8,9,10]. Empty = all year. Without a travel date we assume July (and say so).
   */
  months?: number[];
  /** Where the figure comes from (shown as a link on the receipt). */
  sourceUrl?: string;
  /**
   * Rules in the same group never stack: if several apply, only the most specific one is used
   * (the one listing the fewest places). E.g. "Barcelona" beats "Catalonia-wide" for a Barcelona hotel.
   */
  exclusiveGroup?: string;
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
  /** Where the figure comes from, for rule lines. */
  sourceUrl?: string;
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
  /** Plain-English assumptions the family should know about, e.g. "No travel date, so summer rates used". */
  notes: string[];
  /**
   * Do we actually know the local taxes for this destination? True when a tax rule matched,
   * the destination is known to have none, or the family ticked taxes as already included.
   * FairMark is withheld when false, so "0% extra" can never mean "we know nothing".
   */
  taxCoverage: boolean;
  engineVersion: string;
}
