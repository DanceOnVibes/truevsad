import type { Inclusion } from "@truevsad/true-cost";

/**
 * What a seller's packages USUALLY include. Used only to PRE-TICK the boxes on the
 * confirm step — the family always confirms against their own deal.
 *
 * Source: Grok research 30 Oct 2026 (Output 2). Not yet verified against each seller's
 * own terms page — re-check before launch.
 *
 * Patterns are deliberately narrow: "Jet2holidays" packages include bags, but a
 * Jet2.com flight-only booking does NOT, so plain "Jet2" doesn't match.
 */
const DEFAULTS: { pattern: RegExp; includes: Inclusion[]; note: string }[] = [
  {
    pattern: /jet2\s*holidays/i,
    includes: ["hold_bag", "cabin_bag", "transfers"],
    note: "Jet2holidays packages usually include a 22kg bag, cabin bag and transfers",
  },
  {
    pattern: /\btui\b/i,
    includes: ["hold_bag", "cabin_bag", "transfers"],
    note: "TUI packages usually include a hold bag (often 20kg), cabin bag and transfers",
  },
  {
    pattern: /easy\s*jet\s*holidays/i,
    includes: ["hold_bag"],
    note: "easyJet holidays packages usually include a 23kg hold bag",
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
