import type { Inclusion } from "@truevsad/true-cost";

/**
 * What a seller's packages USUALLY include. Used only to PRE-TICK the boxes on the
 * confirm step — the family always confirms against their own deal.
 *
 * Sources: Grok research 30 Oct 2026 and second research pass 31 Oct 2026 (jet2holidays.com
 * in-resort fees, easyjet.com/en/holidays, tui.co.uk luggage allowance). Re-check before launch.
 *
 * Patterns are deliberately narrow: "Jet2holidays" packages include bags, but a
 * Jet2.com flight-only booking does NOT, so plain "Jet2" doesn't match.
 */
const DEFAULTS: { pattern: RegExp; includes: Inclusion[]; note: string }[] = [
  {
    pattern: /jet2\s*holidays/i,
    includes: ["hold_bag", "cabin_bag", "seats", "transfers"],
    note: "Jet2holidays packages usually include a 22kg bag, cabin bag, allocated seats and transfers",
  },
  {
    pattern: /\btui\b/i,
    includes: ["hold_bag", "cabin_bag", "transfers"],
    note: "TUI packages usually include a hold bag (often 20kg), cabin bag and transfers",
  },
  {
    pattern: /easy\s*jet\s*holidays/i,
    includes: ["hold_bag", "transfers"],
    note: "easyJet holidays beach packages usually include a 23kg hold bag and transfers",
  },
];

export function supplierDefaults(supplier: string): { includes: Inclusion[]; note: string } | null {
  const hit = DEFAULTS.find((d) => d.pattern.test(supplier));
  return hit ? { includes: [...hit.includes], note: hit.note } : null;
}

export const INCLUSION_LABELS: Record<Inclusion, string> = {
  hold_bag: "Hold bags",
  cabin_bag: "Large cabin bags",
  seats: "Seats together",
  transfers: "Airport transfers",
};
