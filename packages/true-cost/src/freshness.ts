import { selectRules, type ScopeOffer } from "./scope";
import type { FeeRule } from "./types";
import type { LocalTaxNote } from "./localtax";
import type { AirlineBags } from "./bags";

/**
 * Freshness: nothing on TrueVsAd should quietly go out of date.
 *
 *  1. expiredRuleNotes(): when a fee rule we priced with has run out and nothing newer replaces
 *     it, the receipt says so instead of silently leaving the fee out.
 *  2. freshnessIssues(): the daily list of what's expiring, overdue for a re-check, or moved
 *     (the euro rate), for the weekly reminder to Adalbert.
 */

function dayLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

const baseLabel = (label: string) => label.split("(")[0]!.trim().toLowerCase();

/**
 * Receipt notes for fee rules that applied to this deal but have run out (validTo before today)
 * with no newer rule for the same thing. `expired` = rules whose validTo has passed;
 * `active` = the rules already selected for this offer.
 */
export function expiredRuleNotes(expired: FeeRule[], active: FeeRule[], offer: ScopeOffer): string[] {
  const out: string[] = [];
  for (const r of selectRules(expired, offer)) {
    const replaced = active.some(
      (a) =>
        (r.exclusiveGroup && a.exclusiveGroup === r.exclusiveGroup) ||
        (a.category === r.category && baseLabel(a.label) === baseLabel(r.label)),
    );
    if (replaced || !r.validTo) continue;
    out.push(
      `${baseLabel(r.label).replace(/^./, (c) => c.toUpperCase())}: the rate we hold ran out on ${dayLabel(r.validTo)} and we haven't checked the new one yet, so it isn't in this price. Ask the seller or the hotel what it is now.`,
    );
  }
  return out;
}

export type FreshnessLevel = "now" | "soon" | "recheck";

export interface FreshnessIssue {
  level: FreshnessLevel;
  /** What it is about, e.g. "Fee rule", "Term dates". */
  area: string;
  /** One plain sentence: what's wrong and what to do. */
  text: string;
  /** The date that matters, YYYY-MM-DD, if there is one. */
  due?: string;
}

export interface FreshnessInput {
  today: string;
  /** Active fee rules, with validTo and checkedOn. `sourceNote` is searched for "ECB 0.8338". */
  rules: { label: string; validTo?: string | null; checkedOn?: string | null; sourceNote?: string | null }[];
  localTaxNotes: readonly LocalTaxNote[];
  /** Double-checked emergency numbers: slug and check date. */
  emergencyChecks: { slug: string; checkedOn: string }[];
  airlineBags: readonly AirlineBags[];
  /** Per council: the last day of the latest holiday published, and the date we took the dates. */
  councils: { authority: string; lastEndsOn: string; takenOn: string | null }[];
  /** FCDO copies not confirmed in the last 3 days. */
  fcdoStale: number;
  /** Today's ECB rate, pounds per euro. Null if it couldn't be fetched. */
  eurToGbp: number | null;
}

/** How long before something counts as overdue for a re-check. */
export const RECHECK_DAYS = { feeRule: 180, localTax: 180, emergency: 365, bags: 120, council: 365 } as const;
/** How far ahead an end date is flagged as "soon". */
export const SOON_DAYS = 45;
/** How far the euro may move before euro-based fees are re-priced. */
export const EUR_TOLERANCE = 0.03;

const days = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

export function freshnessIssues(i: FreshnessInput): FreshnessIssue[] {
  const out: FreshnessIssue[] = [];
  const ending = (area: string, what: string, end: string, after: string) => {
    const left = days(i.today, end);
    if (left < 0) out.push({ level: "now", area, text: `${what} ended on ${dayLabel(end)}. ${after}`, due: end });
    else if (left <= SOON_DAYS) out.push({ level: "soon", area, text: `${what} ends on ${dayLabel(end)} (${left} days). ${after}`, due: end });
  };
  const old = (area: string, what: string, checkedOn: string | null | undefined, max: number) => {
    if (!checkedOn) {
      out.push({ level: "recheck", area, text: `${what}: no check date recorded. Check it against its source.` });
      return;
    }
    const age = days(checkedOn, i.today);
    if (age > max) out.push({ level: "recheck", area, text: `${what}: last checked ${dayLabel(checkedOn)} (${age} days ago). Check it against its source.`, due: checkedOn });
  };

  // Fee rules
  for (const r of i.rules) {
    if (r.validTo) ending("Fee rule", r.label, r.validTo, "Add the new rate, or receipts will say it's missing.");
    old("Fee rule", r.label, r.checkedOn, RECHECK_DAYS.feeRule);
  }

  // Fees priced in euros at a fixed rate
  if (i.eurToGbp) {
    const byRate = new Map<number, number>();
    for (const r of i.rules) {
      const m = /ECB\s+(0\.\d{3,5})/.exec(r.sourceNote ?? "");
      if (m) byRate.set(Number(m[1]), (byRate.get(Number(m[1])) ?? 0) + 1);
    }
    for (const [rate, n] of byRate) {
      const move = (i.eurToGbp - rate) / rate;
      if (Math.abs(move) > EUR_TOLERANCE) {
        out.push({
          level: "recheck",
          area: "Exchange rate",
          text: `${n} fee rule${n === 1 ? " was" : "s were"} priced at €1 = £${rate}; today it's £${i.eurToGbp.toFixed(4)} (${move > 0 ? "+" : ""}${(move * 100).toFixed(1)}%). Re-price them.`,
        });
      }
    }
  }

  // Local tax notes (in the engine's code)
  for (const n of i.localTaxNotes) {
    if (n.temporary) ending("Local tax note", `${n.name}: "${n.temporary.text}"`, n.temporary.until, "Check whether it was extended; receipts stop showing it after that day.");
    old("Local tax note", n.name, n.checkedOn, RECHECK_DAYS.localTax);
  }

  // Double-checked emergency numbers
  for (const e of i.emergencyChecks) old("Emergency numbers", e.slug, e.checkedOn, RECHECK_DAYS.emergency);

  // Cabin bags: one line listing every airline due
  const bagsDue = i.airlineBags.filter((a) =>
    a.bags.some((b) => b.verified && days(b.checkedOn, i.today) > RECHECK_DAYS.bags),
  );
  if (bagsDue.length) {
    out.push({
      level: "recheck",
      area: "Cabin bags",
      text: `Sizes not checked for over ${RECHECK_DAYS.bags} days: ${bagsDue.map((a) => a.airline).join(", ")}. Check each airline's own page.`,
    });
  }

  // Term dates: councils whose published dates are running out, or taken over a year ago
  const runningOut = i.councils.filter((c) => days(i.today, c.lastEndsOn) <= 300);
  if (runningOut.length) {
    out.push({
      level: "soon",
      area: "Term dates",
      text: `${runningOut.length} council${runningOut.length === 1 ? " has" : "s have"} no dates after the next 10 months (${runningOut
        .slice(0, 8)
        .map((c) => c.authority)
        .join(", ")}${runningOut.length > 8 ? "…" : ""}). Look for next year's dates on their pages.`,
    });
  }
  for (const c of i.councils) old("Term dates", c.authority, c.takenOn, RECHECK_DAYS.council);

  if (i.fcdoStale > 0) {
    out.push({
      level: "now",
      area: "Plan B",
      text: `${i.fcdoStale} FCDO travel advice cop${i.fcdoStale === 1 ? "y hasn't" : "ies haven't"} been confirmed in 3 days, so Plan B tells families to check GOV.UK themselves. Look at the daily FCDO job in Vercel.`,
    });
  }

  const order: Record<FreshnessLevel, number> = { now: 0, soon: 1, recheck: 2 };
  return out.sort((a, b) => order[a.level] - order[b.level] || (a.due ?? "9999").localeCompare(b.due ?? "9999"));
}
