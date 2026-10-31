import { formatGBP } from "./money";
import type { CostCategory, CostLine, Party } from "./types";

/**
 * FairMark — how far a deal's true price sits above its advertised price.
 *
 *   fairMarkPercent = (trueCost − advertised) / advertised × 100
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
  /** True − advertised, whole pence (null when unavailable). */
  gapPence: number | null;
  /** Taxes, resort fees and entry documents the advert left out. */
  requiredPence: number;
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

const REQUIRED: CostCategory[] = ["levy", "entry_doc"];
const EXTRAS: CostCategory[] = ["party_extra", "door_to_door", "payment_fx"];

export function fairMarkLevel(percent: number): Exclude<FairMarkLevel, "unavailable"> {
  if (percent <= 5) return "gold"; // includes 0% and negative gaps
  if (percent <= FAIR_LINE_PERCENT) return "fair";
  if (percent <= 20) return "higher";
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
}): FairMark {
  const { advertisedPence, trueCostPence, confidence, usedDemoRules, taxCoverage } = input;
  const lines = input.lines ?? input.receipt?.lines ?? [];
  const sum = (cats: CostCategory[]) => lines.filter((l) => cats.includes(l.category)).reduce((s, l) => s + l.amountPence, 0);
  const requiredPence = sum(REQUIRED);
  const extrasPence = sum(EXTRAS);

  const unavailable = (reason: FairMarkReason): FairMark => ({
    level: "unavailable",
    percent: null,
    label: FAIRMARK_LABELS.unavailable,
    display: "",
    gapPence: null,
    requiredPence,
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

  const gapPence = trueCostPence - advertisedPence;
  // Multiplied first so whole-pence inputs give exact percentages (7400 × 100 / 100000 = 7.4).
  const percent = (gapPence * 100) / advertisedPence;
  const level = fairMarkLevel(percent);

  // The biggest single extra, so "why" is always one glance away.
  const biggest = lines
    .filter((l) => l.category !== "supplier" && l.amountPence > 0)
    .sort((a, b) => b.amountPence - a.amountPence)[0];
  const driver = biggest ? ` Biggest extra: ${biggest.label} (+${formatGBP(biggest.amountPence)}).` : "";
  const distance = Math.abs(percent - FAIR_LINE_PERCENT);
  const summary =
    gapPence <= 0
      ? "Nothing extra to pay on top of the advertised price for this family."
      : level === "gold" || level === "fair"
        ? `${formatGBP(gapPence)} on top of the advert, ${distance.toFixed(1)}% inside the Fair Price line.${driver}`
        : `${formatGBP(gapPence)} on top of the advert, ${distance.toFixed(1)}% over the Fair Price line.${driver}`;

  return { level, percent, label: FAIRMARK_LABELS[level], display: formatFairMarkPercent(percent), gapPence, requiredPence, extrasPence, summary };
}

/** Is this a "Fair Price" deal for the filter? Gold counts too (≤ 10%). */
export function isFairPrice(level: FairMarkLevel): boolean {
  return level === "gold" || level === "fair";
}
