import { formatGBP, roundPence } from "./money";
import { childrenInBand, partySize, validateParty } from "./party";
import { advertNotes } from "./advert";
import { seatUnits } from "./seats";
import { hasTaxCoverage } from "./scope";
import {
  ADVISORY_CATEGORIES,
  COST_CATEGORIES,
  STATED_BAGS_WORDING,
  type CostCategory,
  type CostLine,
  type FeeRule,
  type Party,
  type Pence,
  type TrueCostInput,
  type TrueCostResult,
} from "./types";

export const ENGINE_VERSION = "0.6.0";

/** A fee figure last checked more than this many days ago counts for half in the confidence score. */
export const STALE_AFTER_DAYS = 365;

/**
 * TrueCost = supplier lines + party extras + levies + entry docs + door-to-door + payment/FX
 * Gap      = TrueCost − advertised headline (whole party)
 *
 * Pure function: no I/O, no network, no commission data. Same input → same output.
 */
export function calculateTrueCost(input: TrueCostInput): TrueCostResult {
  const { party, offer, rules = [], extraLines = [], asOf } = input;
  validateParty(party);
  if (party.holdBags !== undefined && !(Number.isInteger(party.holdBags) && party.holdBags >= 0 && party.holdBags <= 30)) {
    throw new Error("Hold bags must be a whole number from 0 to 30.");
  }

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
  let stale = false;
  for (const rule of rules) {
    const line = applyRule(rule, party, offer.nights, supplierSubtotal);
    if (!line || line.amountPence === 0) continue;
    if (ADVISORY_CATEGORIES.includes(line.category)) line.advisory = true;
    if (rule.checkedOn) {
      line.checkedOn = rule.checkedOn;
      if (asOf && daysBetween(rule.checkedOn, asOf) > STALE_AFTER_DAYS) {
        line.confidence = Math.round(line.confidence * 50) / 100;
        stale = true;
      }
    }
    lines.push(line);
  }

  // User-added lines last.
  lines.push(...extraLines);

  const subtotals = Object.fromEntries(
    COST_CATEGORIES.map((c) => [c, sumCategory(lines, c)]),
  ) as Record<CostCategory, Pence>;

  const trueCostPence = lines.reduce((sum, l) => sum + l.amountPence, 0);

  const notes: string[] = [];
  if (!offer.departDate && !offer.departMonth && rules.some((r) => r.months && r.months.length > 0)) {
    notes.push("No travel date given, so seasonal taxes use summer rates. Add the date or month for a closer figure.");
  }
  if (stale) notes.push("Some fee figures were last checked more than a year ago, so they count for less in how sure we are.");
  notes.push(...advertNotes(party, offer));
  const gapPence = trueCostPence - advertisedPence;
  // One return hold bag at this deal's price (the first fixed per-person hold-bag rule that applies).
  const bagRule = rules.find((r) => r.covers === "hold_bag" && r.unit === "per_person" && r.amount.kind === "fixed");
  const standardBagPence = bagRule && bagRule.amount.kind === "fixed" ? bagRule.amount.pence : 0;

  return {
    advertisedPence,
    trueCostPence,
    gapPence,
    gapRatio: advertisedPence > 0 ? gapPence / advertisedPence : 0,
    receipt: { lines, subtotals },
    confidence: weightedConfidence(lines),
    usedDemoRules: rules.some((r) => r.demo),
    notes,
    // A levy the deal already includes is skipped by selectRules, but the tick itself counts.
    taxCoverage: hasTaxCoverage(offer, rules),
    standardBagPence,
    engineVersion: ENGINE_VERSION,
  };
}

function sumCategory(lines: CostLine[], category: CostCategory): Pence {
  return lines.filter((l) => l.category === category).reduce((s, l) => s + l.amountPence, 0);
}

/** How many units of a rule this party triggers, plus a readable explanation. */
function unitsFor(rule: FeeRule, party: Party, stayNights: number): { units: number; label: string } {
  // Some per-night taxes stop after a set number of nights (e.g. Catalonia: first 7 only).
  const capped = rule.maxNights !== undefined && stayNights > rule.maxNights;
  const nights = capped ? rule.maxNights! : stayNights;
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
      return { units: people * nights, label: `${n(people, "person")} × ${nightsLabel()}` };
    case "per_adult_per_night":
      return { units: party.adults * nights, label: `${n(party.adults, "adult")} × ${nightsLabel()}` };
    case "per_party_per_night":
      return { units: nights, label: nightsLabel() };
  }

  function nightsLabel() {
    return capped ? `${n(nights, "night")} (charged for ${nights} max)` : n(nights, "night");
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
      sourceUrl: rule.sourceUrl,
      working: `${(rule.amount.basisPoints / 100).toFixed(2)}% of ${formatGBP(supplierSubtotal)}`,
    };
  }

  // Hold bags are advisory: the family's own number, or one per two people (a couple often shares).
  // Seats: only what the airline makes a family pay to sit together (see seats.ts).
  const seat = rule.covers === "seats" ? seatUnits(rule, party) : undefined;
  if (seat === null) return null;
  const { units, label } =
    seat ?? (rule.covers === "hold_bag" && rule.unit === "per_person" ? bagUnits(rule, party) : unitsFor(rule, party, nights));
  if (units === 0) return null;
  return {
    category: rule.category,
    label: rule.label,
    amountPence: units * rule.amount.pence,
    source: "rule",
    confidence: rule.confidence,
    ruleId: rule.id,
    sourceUrl: rule.sourceUrl,
    working: units === 1 && rule.unit === "per_party"
      ? formatGBP(rule.amount.pence)
      : `${label} × ${formatGBP(rule.amount.pence)}`,
  };
}

function bagUnits(rule: FeeRule, party: Party): { units: number; label: string } {
  const plural = (n: number) => `${n} bag${n === 1 ? "" : "s"}`;
  if (party.holdBags !== undefined) {
    return { units: party.holdBags, label: `${plural(party.holdBags)} (${STATED_BAGS_WORDING})` };
  }
  const eligible = party.adults + childrenInBand(party, rule.minAge, rule.maxAge);
  const bags = Math.ceil(eligible / 2);
  const who = rule.minAge ? ` aged ${rule.minAge}+` : "";
  return { units: bags, label: `${plural(bags)} (1 per 2 people${who})` };
}

function daysBetween(fromIso: string, toIso: string): number {
  const a = Date.parse(`${fromIso}T00:00:00Z`);
  const b = Date.parse(`${toIso}T00:00:00Z`);
  return Number.isFinite(a) && Number.isFinite(b) ? (b - a) / 86_400_000 : 0;
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
