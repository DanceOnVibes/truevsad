import { calculateTrueCost } from "./calculate";
import type { FeeRule, Offer, Party } from "./types";

/**
 * "Kids go free"? Each child still costs whatever the extras add for them: bags, seats, taxes,
 * entry documents. Worked out as the difference the child makes to the extras, with the
 * advertised price set aside, so it's exact for every rule the engine knows.
 */
export interface ChildCost {
  age: number;
  pence: number;
}

function extrasFor(party: Party, offer: Offer, rules: FeeRule[]): number {
  // Advertised price zeroed: what's left is exactly the extras for this party.
  return calculateTrueCost({ party, offer: { ...offer, headlinePence: 0, headlineBasis: "total", supplierLines: undefined }, rules })
    .trueCostPence;
}

export function childExtras(input: { party: Party; offer: Offer; rules: FeeRule[] }): ChildCost[] {
  const { party, offer, rules } = input;
  if (party.childAges.length === 0) return [];
  const all = extrasFor(party, offer, rules);
  return party.childAges.map((age, i) => {
    const without = { ...party, childAges: party.childAges.filter((_, j) => j !== i) };
    return { age, pence: all - extrasFor(without, offer, rules) };
  });
}
