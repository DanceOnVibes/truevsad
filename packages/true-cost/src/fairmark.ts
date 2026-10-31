import type { Party } from "./types";

/**
 * FairMark — how far a deal's true price sits above its advertised price.
 *
 *   fairMarkPercent = (trueCost − advertised) / advertised × 100
 *
 * Pure function on the result of calculateTrueCost(). It never changes the price or the
 * ranking: it's a badge, a filter and a leaderboard only. When in doubt, no badge.
 */

export type FairMarkLevel = "gold" | "fair" | "higher" | "high" | "unavailable";

export interface FairMark {
  level: FairMarkLevel;
  /** Full precision; null when unavailable. */
  percent: number | null;
  /** Exact badge words. */
  label: string;
  /** "+7.4%" (one decimal), or "" when unavailable. */
  display: string;
}

/** Below this value-weighted confidence we don't badge a deal. */
export const FAIRMARK_MIN_CONFIDENCE = 0.6;

export const FAIRMARK_LABELS: Record<FairMarkLevel, string> = {
  gold: "FairMark Gold",
  fair: "Fair Price",
  higher: "Higher gap",
  high: "High gap",
  unavailable: "FairMark unavailable",
};

/**
 * One standard family, so sellers are compared like for like on the leaderboard:
 * 2 adults and children aged 7 and 11. Families still see their own party on receipts.
 */
export const REFERENCE_PARTY: Party = { adults: 2, childAges: [7, 11] };

export function fairMarkLevel(percent: number): Exclude<FairMarkLevel, "unavailable"> {
  if (percent <= 5) return "gold"; // includes 0% and negative gaps
  if (percent <= 10) return "fair";
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
}): FairMark {
  const { advertisedPence, trueCostPence, confidence, usedDemoRules } = input;
  const ok =
    Number.isFinite(advertisedPence) &&
    Number.isFinite(trueCostPence) &&
    advertisedPence > 0 &&
    trueCostPence >= 0 &&
    Number.isFinite(confidence) &&
    confidence >= FAIRMARK_MIN_CONFIDENCE &&
    !usedDemoRules;
  if (!ok) {
    return { level: "unavailable", percent: null, label: FAIRMARK_LABELS.unavailable, display: "" };
  }
  // Same formula, multiplied first so whole-pence inputs give exact percentages (7400 × 100 / 100000 = 7.4).
  const percent = ((trueCostPence - advertisedPence) * 100) / advertisedPence;
  const level = fairMarkLevel(percent);
  return { level, percent, label: FAIRMARK_LABELS[level], display: formatFairMarkPercent(percent) };
}

/** Is this a "Fair Price" deal for the filter? Gold counts too (≤ 10%). */
export function isFairPrice(level: FairMarkLevel): boolean {
  return level === "gold" || level === "fair";
}
