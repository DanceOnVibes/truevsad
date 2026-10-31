import type { FeeRule, Offer } from "./types";

/** "Gran Canaria (Maspalomas)" → "gran canaria maspalomas" */
function normalise(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Whole-word match: "canaria" does not match "canarias", "rome" does not match "jerome". */
export function mentions(haystack: string, needle: string): boolean {
  const n = normalise(needle);
  return n.length > 0 && ` ${normalise(haystack)} `.includes(` ${n} `);
}

/**
 * Does this rule apply to this offer?
 * - No regions / no supplier on the rule → applies to every offer.
 * - A scoped rule only applies when the offer clearly names that place/supplier.
 *   If we don't know the destination, scoped rules are skipped rather than guessed.
 */
/** Month we price seasonal rates for: the travel month, or July when we don't know it. */
export const ASSUMED_MONTH = 7;

export function travelMonth(departDate: string | undefined): number {
  const m = departDate && /^\d{4}-(\d{2})-\d{2}$/.exec(departDate);
  return m ? Number(m[1]) : ASSUMED_MONTH;
}

type ScopeOffer = Pick<Offer, "destination" | "supplierName" | "includes" | "departDate">;

export function ruleApplies(rule: FeeRule, offer: ScopeOffer): boolean {
  // Never charge for something the deal already includes.
  if (rule.covers && offer.includes?.includes(rule.covers)) return false;
  // Seasonal rates: only the one for the travel month.
  if (rule.months && rule.months.length > 0 && !rule.months.includes(travelMonth(offer.departDate))) {
    return false;
  }
  if (rule.regions && rule.regions.length > 0) {
    if (!offer.destination) return false;
    if (!rule.regions.some((r) => mentions(offer.destination!, r))) return false;
  }
  if (rule.supplierName) {
    if (!offer.supplierName) return false;
    if (!mentions(offer.supplierName, rule.supplierName)) return false;
  }
  return true;
}

/**
 * The rules that apply to this offer.
 *
 * Specific beats generic: if a supplier's own fee for an item applies (e.g. "easyJet hold bag"),
 * the generic "typical hold bag" rule is dropped, so the family isn't charged twice.
 */
export function selectRules(rules: FeeRule[], offer: ScopeOffer): FeeRule[] {
  const applicable = rules.filter((r) => ruleApplies(r, offer));
  const coveredBySupplier = new Set(
    applicable.filter((r) => r.covers && r.supplierName).map((r) => r.covers),
  );
  const unstacked = applicable.filter(
    (r) => !(r.covers && !r.supplierName && coveredBySupplier.has(r.covers)),
  );

  // Exclusive groups: keep only the most specific rule (fewest places listed; first wins a tie).
  const best = new Map<string, FeeRule>();
  const places = (r: FeeRule) => (r.regions && r.regions.length > 0 ? r.regions.length : Infinity);
  for (const r of unstacked) {
    if (!r.exclusiveGroup) continue;
    const cur = best.get(r.exclusiveGroup);
    if (!cur || places(r) < places(cur)) best.set(r.exclusiveGroup, r);
  }
  return unstacked.filter((r) => !r.exclusiveGroup || best.get(r.exclusiveGroup) === r);
}

/**
 * Places checked to have NO local tourist tax (research pass 31 Oct 2026). Used only to say
 * "we know there is nothing to add here" — never to add a fee. Mogán (Gran Canaria) does charge
 * and has its own rule, which matches first.
 */
export const KNOWN_NO_LOCAL_TAX: readonly string[] = [
  "Cyprus", "Paphos", "Ayia Napa", "Protaras", "Limassol", "Larnaca",
  "Canary Islands", "Canaries", "Tenerife", "Lanzarote", "Fuerteventura", "Gran Canaria", "La Palma", "La Gomera", "El Hierro",
  "Costa Blanca", "Benidorm", "Alicante", "Albir", "Calpe", "Javea", "Denia", "Torrevieja", "Valencia",
];

/** See TrueCostResult.taxCoverage. `rules` = the rules already selected for this offer. */
export function hasTaxCoverage(
  offer: Pick<Offer, "destination" | "includes">,
  rules: FeeRule[],
): boolean {
  if (offer.includes?.includes("local_taxes")) return true;
  if (rules.some((r) => r.category === "levy" && r.regions && r.regions.length > 0)) return true;
  if (!offer.destination) return false;
  return KNOWN_NO_LOCAL_TAX.some((place) => mentions(offer.destination!, place));
}
