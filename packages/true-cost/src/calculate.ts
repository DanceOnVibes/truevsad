import { formatGBP, roundPence } from "./money";
import { childrenInBand, partySize, validateParty } from "./party";
import {
  COST_CATEGORIES,
  type CostCategory,
  type CostLine,
  type FeeRule,
  type Party,
  type Pence,
  type TrueCostInput,
  type TrueCostResult,
} from "./types";

export const ENGINE_VERSION = "0.1.0";

/**
 * TrueCost = supplier lines + party extras + levies + entry docs + door-to-door + payment/FX
 * Gap      = TrueCost − advertised headline (whole party)
 *
 * Pure function: no I/O, no network, no commission data. Same input → same output.
 */
export function calculateTrueCost(input: TrueCostInput): TrueCostResult {
  const { party, offer, rules = [], extraLines = [] } = input;
  validateParty(party);

  if (!Number.isInteger(offer.headlinePence) || offer.headlinePence < 0) {
    throw new Error("Headline price must be a non-negative whole number of pence.");
  }
  if (!Number.isInteger(offer.nights) || offer.nights < 0) {
    throw new Error("Nights must be a non-negative whole number.");
  }

  const people = partySize(party);
  const advertisedPence =
    offer.headlineBasis === "per_person" ? offer.headlinePence * people : offer.headlinePence;

  const lines: CostLine[] = [];

  // 1. Supplier lines — itemised if we have them, otherwise the advertised total.
  if (offer.supplierLines && offer.supplierLines.length > 0) {
    lines.push(...offer.supplierLines);
  } else {
    lines.push({
      category: "supplier",
      label: offer.supplierName ? `${offer.supplierName} — advertised price` : "Advertised price",
      amountPence: advertisedPence,
      source: "extracted",
      confidence: 0.9,
      working:
        offer.headlineBasis === "per_person"
          ? `${people} × ${formatGBP(offer.headlinePence)}`
          : undefined,
    });
  }

  const supplierSubtotal = sumCategory(lines, "supplier");

  // 2–6. Rule-driven lines (party extras, levies, entry docs, door-to-door, payment/FX).
  for (const rule of rules) {
    const line = applyRule(rule, party, offer.nights, supplierSubtotal);
    if (line && line.amountPence !== 0) lines.push(line);
  }

  // User-added lines last.
  lines.push(...extraLines);

  const subtotals = Object.fromEntries(
    COST_CATEGORIES.map((c) => [c, sumCategory(lines, c)]),
  ) as Record<CostCategory, Pence>;

  const trueCostPence = lines.reduce((sum, l) => sum + l.amountPence, 0);
  const gapPence = trueCostPence - advertisedPence;

  return {
    advertisedPence,
    trueCostPence,
    gapPence,
    gapRatio: advertisedPence > 0 ? gapPence / advertisedPence : 0,
    receipt: { lines, subtotals },
    confidence: weightedConfidence(lines),
    usedDemoRules: rules.some((r) => r.demo),
    engineVersion: ENGINE_VERSION,
  };
}

function sumCategory(lines: CostLine[], category: CostCategory): Pence {
  return lines.filter((l) => l.category === category).reduce((s, l) => s + l.amountPence, 0);
}

/** How many units of a rule this party triggers, plus a readable explanation. */
function unitsFor(rule: FeeRule, party: Party, nights: number): { units: number; label: string } {
  const kids = childrenInBand(party, rule.minAge, rule.maxAge);
  // Adults are 18+, so they fall outside a child-only band (maxAge < 18).
  const adultsCount = rule.maxAge !== undefined && rule.maxAge < 18 ? 0 : party.adults;
  const people = adultsCount + kids;
  const n = (count: number, word: string) =>
    `${count} ${count === 1 ? word : word === "person" ? "people" : word === "child" ? "children" : `${word}s`}`;

  switch (rule.unit) {
    case "per_party":
      return { units: 1, label: "per party" };
    case "per_person":
      return { units: people, label: n(people, "person") };
    case "per_adult":
      return { units: party.adults, label: n(party.adults, "adult") };
    case "per_child":
      return { units: kids, label: n(kids, "child") };
    case "per_person_per_night":
      return { units: people * nights, label: `${n(people, "person")} × ${n(nights, "night")}` };
    case "per_adult_per_night":
      return {
        units: party.adults * nights,
        label: `${n(party.adults, "adult")} × ${n(nights, "night")}`,
      };
  }
}

function applyRule(
  rule: FeeRule,
  party: Party,
  nights: number,
  supplierSubtotal: Pence,
): CostLine | null {
  if (rule.amount.kind === "percent") {
    const amount = roundPence((supplierSubtotal * rule.amount.basisPoints) / 10_000);
    return {
      category: rule.category,
      label: rule.label,
      amountPence: amount,
      source: "rule",
      confidence: rule.confidence,
      ruleId: rule.id,
      working: `${(rule.amount.basisPoints / 100).toFixed(2)}% of ${formatGBP(supplierSubtotal)}`,
    };
  }

  const { units, label } = unitsFor(rule, party, nights);
  if (units === 0) return null;
  return {
    category: rule.category,
    label: rule.label,
    amountPence: units * rule.amount.pence,
    source: "rule",
    confidence: rule.confidence,
    ruleId: rule.id,
    working: units === 1 && rule.unit === "per_party"
      ? formatGBP(rule.amount.pence)
      : `${label} × ${formatGBP(rule.amount.pence)}`,
  };
}

/**
 * Value-weighted confidence: a shaky £5 estimate barely moves the score,
 * a shaky £400 estimate drags it down a lot.
 */
function weightedConfidence(lines: CostLine[]): number {
  const total = lines.reduce((s, l) => s + Math.abs(l.amountPence), 0);
  if (total === 0) return 0;
  const weighted = lines.reduce(
    (s, l) => s + Math.abs(l.amountPence) * clamp01(l.confidence),
    0,
  );
  return Math.round((weighted / total) * 100) / 100;
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}
