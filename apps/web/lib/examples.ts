import { calculateTrueCost, fairMark, selectRules, type FairMark, type Offer, type Party } from "@truevsad/true-cost";
import { loadFeeRules } from "@/lib/quotes";

/**
 * The homepage's example receipts, priced by the engine with today's live fee rules: never typed by
 * hand, so an example can't promise anything the engine wouldn't say. If the real rules can't be
 * loaded (demo fallback), there are no examples at all.
 */

export interface ExampleLine {
  label: string;
  pence: number;
}

export interface ExampleReceipt {
  title: string;
  advertisedPence: number;
  /** Every line the engine added, in its order. */
  lines: ExampleLine[];
  truePence: number;
  /** FairMark: what the advert left out (taxes and fees + one hold bag) and the verdict. */
  fm: FairMark;
}

const EXAMPLES: { key: "stop" | "check" | "safe"; title: string; party: Party; offer: Offer }[] = [
  {
    key: "stop",
    title: "Barcelona · 4 nights · 2 adults",
    party: { adults: 2, childAges: [] },
    offer: { headlinePence: 14900, headlineBasis: "per_person", currency: "GBP", nights: 4, destination: "Barcelona", airline: "Ryanair", departMonth: 6 },
  },
  {
    key: "check",
    title: "Mallorca · 7 nights · 2 adults",
    party: { adults: 2, childAges: [] },
    offer: { headlinePence: 39900, headlineBasis: "per_person", currency: "GBP", nights: 7, destination: "Mallorca", airline: "Ryanair", departMonth: 7 },
  },
  {
    key: "safe",
    title: "Lanzarote · 7 nights · 2 adults, 2 children",
    party: { adults: 2, childAges: [6, 9] },
    offer: {
      headlinePence: 214000, headlineBasis: "total", currency: "GBP", nights: 7, destination: "Lanzarote", airline: "TUI", departMonth: 8,
      includes: ["hold_bag", "transfers"],
    },
  },
];

export async function exampleReceipts(): Promise<Record<"stop" | "check" | "safe", ExampleReceipt> | null> {
  let rules;
  try {
    rules = await loadFeeRules();
  } catch {
    return null;
  }
  const out: Partial<Record<"stop" | "check" | "safe", ExampleReceipt>> = {};
  for (const e of EXAMPLES) {
    const r = calculateTrueCost({ party: e.party, offer: e.offer, rules: selectRules(rules, e.offer) });
    if (r.usedDemoRules) return null;
    const fm = fairMark(r);
    out[e.key] = {
      title: e.title,
      advertisedPence: r.advertisedPence,
      lines: r.receipt.lines.filter((l) => l.category !== "supplier" && l.amountPence > 0).map((l) => ({ label: l.label, pence: l.amountPence })),
      truePence: r.trueCostPence,
      fm,
    };
  }
  return out as Record<"stop" | "check" | "safe", ExampleReceipt>;
}

/** "£1,596" */
export function gbp(pence: number): string {
  return `£${(pence / 100).toLocaleString("en-GB", { minimumFractionDigits: pence % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
}
