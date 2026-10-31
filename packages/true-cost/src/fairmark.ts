import { formatGBP } from "./money";
import { ADVISORY_CATEGORIES, HIDDEN_FEE_CATEGORIES, type CostCategory, type CostLine, type Party } from "./types";

/**
 * FairMark — how much the advert hid.
 *
 *   fairMarkPercent = (taxes and fees left out + one standard hold bag) / advertised × 100
 *
 * Counted: tourist taxes, resort fees, entry documents, and ONE return hold bag per booking when
 * the deal doesn't include one — the same standard for every seller and every family size.
 * Everything else the family adds (their own bag count, seats, getting to the airport, card fees)
 * is in their true price but never counted against the seller.
 *
 * Pure function on the result of calculateTrueCost(). It never changes the price or the
 * ranking: it's a badge, a filter and a leaderboard only. When in doubt, no badge — and we
 * always say why.
 */

export type FairMarkLevel = "gold" | "fair" | "higher" | "high" | "unavailable";

export type FairMarkReason = "no_price" | "demo" | "low_confidence" | "no_tax_data";

export interface FairMark {
  level: FairMarkLevel;
  /** Full precision; null when unavailable. */
  percent: number | null;
  /** Exact badge words. */
  label: string;
  /** "+7.4%" (one decimal), or "" when unavailable. */
  display: string;
  /** What the advert hid, whole pence: the amount FairMark judges (null when unavailable). */
  gapPence: number | null;
  /** Taxes, resort fees and entry documents the advert left out. */
  requiredPence: number;
  /** FairMark's standard of one return hold bag (0 when the deal includes bags). */
  standardBagPence: number;
  /** Extras this family needs: bags, seats, getting to the airport, card fees. */
  extrasPence: number;
  /** One plain sentence: where the deal sits against the Fair Price line, and what drives it. */
  summary: string;
  /** Why FairMark is unavailable, when it is. */
  reason?: FairMarkReason;
}

/** Below this value-weighted confidence we don't badge a deal. */
export const FAIRMARK_MIN_CONFIDENCE = 0.6;
/** The Fair Price line. */
export const FAIR_LINE_PERCENT = 10;

export const FAIRMARK_LABELS: Record<FairMarkLevel, string> = {
  gold: "FairMark Gold",
  fair: "Fair Price",
  higher: "Higher gap",
  high: "High gap",
  unavailable: "FairMark unavailable",
};

const REASONS: Record<FairMarkReason, string> = {
  no_price: "There's no advertised price to compare with.",
  demo: "Some of the figures are placeholders, not real prices.",
  low_confidence: "Too many of the fees are rough estimates to give a fair verdict.",
  no_tax_data: "We don't have local tax figures for this destination yet, so we can't call it fair.",
};

/**
 * One standard family, so sellers are compared like for like on the leaderboard:
 * 2 adults and children aged 7 and 11. Families still see their own party on receipts.
 */
export const REFERENCE_PARTY: Party = { adults: 2, childAges: [7, 11] };

const REQUIRED: readonly CostCategory[] = HIDDEN_FEE_CATEGORIES;
const EXTRAS: readonly CostCategory[] = ADVISORY_CATEGORIES;

/** Upper bound (inclusive) of each level, in % of the advertised price hidden. */
export const FAIRMARK_SCALE = { gold: 5, fair: FAIR_LINE_PERCENT, higher: 20 } as const;

export function fairMarkLevel(percent: number): Exclude<FairMarkLevel, "unavailable"> {
  if (percent <= FAIRMARK_SCALE.gold) return "gold"; // includes 0% and negative gaps
  if (percent <= FAIRMARK_SCALE.fair) return "fair";
  if (percent <= FAIRMARK_SCALE.higher) return "higher";
  return "high";
}

export function formatFairMarkPercent(percent: number): string {
  const r = Math.round(percent * 10) / 10;
  const v = Object.is(r, -0) ? 0 : r;
  return `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
}

export function fairMark(input: {
  advertisedPence: number;
  trueCostPence: number;
  confidence: number;
  usedDemoRules?: boolean;
  /** Pass taxCoverage from the engine result. Leaving it out skips the coverage check. */
  taxCoverage?: boolean;
  /** Receipt lines, for the split and the biggest driver. Optional. */
  lines?: CostLine[];
  receipt?: { lines: CostLine[] };
  /** One return hold bag for this deal (from the engine result). */
  standardBagPence?: number;
}): FairMark {
  const { advertisedPence, trueCostPence, confidence, usedDemoRules, taxCoverage } = input;
  const lines = input.lines ?? input.receipt?.lines ?? [];
  const sum = (cats: readonly CostCategory[]) => lines.filter((l) => cats.includes(l.category)).reduce((s, l) => s + l.amountPence, 0);
  const requiredPence = sum(REQUIRED);
  const extrasPence = sum(EXTRAS);
  const standardBagPence =
    input.standardBagPence !== undefined ? Math.max(0, input.standardBagPence) : bagPriceFromLines(lines);

  const unavailable = (reason: FairMarkReason): FairMark => ({
    level: "unavailable",
    percent: null,
    label: FAIRMARK_LABELS.unavailable,
    display: "",
    gapPence: null,
    requiredPence,
    standardBagPence,
    extrasPence,
    summary: REASONS[reason],
    reason,
  });

  if (!(Number.isFinite(advertisedPence) && advertisedPence > 0 && Number.isFinite(trueCostPence) && trueCostPence >= 0)) {
    return unavailable("no_price");
  }
  if (usedDemoRules) return unavailable("demo");
  if (!(Number.isFinite(confidence) && confidence >= FAIRMARK_MIN_CONFIDENCE)) return unavailable("low_confidence");
  if (taxCoverage === false) return unavailable("no_tax_data");

  // With receipt lines we judge only what the advert hid. Without them (a bare total), the whole
  // difference is all we know.
  const gapPence = lines.length > 0 ? requiredPence + standardBagPence : trueCostPence - advertisedPence;
  // Multiplied first so whole-pence inputs give exact percentages (7400 × 100 / 100000 = 7.4).
  const percent = (gapPence * 100) / advertisedPence;
  const level = fairMarkLevel(percent);

  // The biggest hidden fee, so "why" is always one glance away.
  const biggest = lines
    .filter((l) => REQUIRED.includes(l.category) && l.amountPence > 0)
    .sort((a, b) => b.amountPence - a.amountPence)[0];
  const bagPart = standardBagPence > 0 && lines.length > 0 ? `, including one hold bag (${formatGBP(standardBagPence)})` : "";
  const driver = biggest ? ` Biggest tax or fee: ${biggest.label} (+${formatGBP(biggest.amountPence)}).` : "";
  const distance = Math.abs(percent - FAIRMARK_SCALE.fair);
  const extrasNote = extrasPence > 0 ? " Your family's own extras beyond one bag aren't counted against the seller." : "";
  const summary =
    gapPence <= 0
      ? `The advert left out no taxes or fees for this family.${extrasNote}`
      : level === "gold" || level === "fair"
        ? `${formatGBP(gapPence)} left out of the advert${bagPart}, ${distance.toFixed(1)}% inside the Fair Price line.${driver}${extrasNote}`
        : `${formatGBP(gapPence)} left out of the advert${bagPart}, ${distance.toFixed(1)}% over the Fair Price line.${driver}${extrasNote}`;

  return { level, percent, label: FAIRMARK_LABELS[level], display: formatFairMarkPercent(percent), gapPence, requiredPence, standardBagPence, extrasPence, summary };
}

/**
 * Stored receipts (no engine result): one bag's price from the hold-bag line's working,
 * "2 bags (1 per 2 people aged 2+) × £70.00" → 7000. 0 if there's no such line.
 */
function bagPriceFromLines(lines: CostLine[]): number {
  const bag = lines.find((l) => l.category === "party_extra" && /hold bag|checked bag/i.test(l.label));
  const m = bag?.working && /×\s*£([\d,]+(?:\.\d{1,2})?)\s*$/.exec(bag.working);
  return m ? Math.round(parseFloat(m[1]!.replace(/,/g, "")) * 100) : 0;
}

/** Is this a "Fair Price" deal for the filter? Gold counts too (≤ 10%). */
export function isFairPrice(level: FairMarkLevel): boolean {
  return level === "gold" || level === "fair";
}
