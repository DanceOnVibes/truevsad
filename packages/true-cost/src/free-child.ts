import { calculateTrueCost } from "./calculate";
import { childrenInBand } from "./party";
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
  // Hold bags are shared (one per two people), so removing one child often changes nothing.
  // Instead each eligible person carries an equal share of the party's bag cost.
  const isBag = (r: FeeRule) => r.covers === "hold_bag" && r.unit === "per_person";
  const others = rules.filter((r) => !isBag(r));
  const bagRules = rules.filter(isBag);
  const all = extrasFor(party, offer, others);
  const bagShare = (age: number) =>
    bagRules.reduce((sum, r) => {
      if (age < (r.minAge ?? 0) || age > (r.maxAge ?? 17)) return sum;
      const eligible = party.adults + childrenInBand(party, r.minAge, r.maxAge);
      const total = extrasFor(party, offer, [r]);
      return eligible > 0 ? sum + Math.round(total / eligible) : sum;
    }, 0);
  return party.childAges.map((age, i) => {
    const without = { ...party, childAges: party.childAges.filter((_, j) => j !== i) };
    return { age, pence: all - extrasFor(without, offer, others) + bagShare(age) };
  });
}
