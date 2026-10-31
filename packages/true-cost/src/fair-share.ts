import { calculateTrueCost } from "./calculate";
import { partySize } from "./party";
import type { FeeRule, Offer, Party, Pence, TrueCostResult } from "./types";

/**
 * Fair Share — two or more families on one deal: who pays what?
 *
 * Fair means each family pays for what it causes:
 *  - per-person costs (the per-person price, bags, taxes, ESTA…) follow the people in each family,
 *    including age rules (a child exempt from a tax adds nothing to their family's share);
 *  - whole-party costs (per-party fees, per-room-per-night fees) are split equally between families;
 *  - a "total" headline price is split by number of people.
 * The shares always add up exactly to the group's true price.
 */

export interface FamilyShare {
  party: Party;
  people: number;
  advertisedPence: Pence;
  trueCostPence: Pence;
  perPersonPence: Pence;
}

export interface FairShareResult {
  group: TrueCostResult;
  shares: FamilyShare[];
}

/** Split `amount` into `n` whole-pence parts that add up exactly (remainder to the first parts). */
function splitEvenly(amount: number, n: number): number[] {
  const base = Math.floor(amount / n);
  const rest = amount - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < rest ? 1 : 0));
}

/** Split `amount` by weights into whole pence that add up exactly. */
function splitByWeight(amount: number, weights: number[]): number[] {
  const total = weights.reduce((s, w) => s + w, 0);
  const raw = weights.map((w) => (amount * w) / total);
  const parts = raw.map(Math.floor);
  let rest = amount - parts.reduce((s, p) => s + p, 0);
  // Hand out leftover pence to the biggest remainders.
  const order = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac);
  for (const { i } of order) {
    if (rest <= 0) break;
    parts[i] = parts[i]! + 1;
    rest--;
  }
  return parts;
}

export function fairShare(input: { offer: Offer; rules: FeeRule[]; families: Party[] }): FairShareResult {
  const { offer, rules, families } = input;
  if (families.length < 1 || families.length > 6) throw new Error("Split between 1 and 6 families.");

  const group: Party = {
    adults: families.reduce((s, f) => s + f.adults, 0),
    childAges: families.flatMap((f) => f.childAges),
  };
  const groupResult = calculateTrueCost({ party: group, offer, rules });

  const n = families.length;
  const people = families.map(partySize);
  const totalHeadlines =
    offer.headlineBasis === "total" ? splitByWeight(offer.headlinePence, people) : null;

  // Whole-party fixed fees are shared equally: family i gets its slice of each one.
  const partyRuleSlices = new Map<string, number[]>();
  for (const r of rules) {
    if ((r.unit === "per_party" || r.unit === "per_party_per_night") && r.amount.kind === "fixed") {
      partyRuleSlices.set(r.id, splitEvenly(r.amount.pence, n));
    }
  }

  const shares: FamilyShare[] = families.map((party, i) => {
    const familyOffer: Offer = totalHeadlines
      ? { ...offer, headlinePence: totalHeadlines[i]!, supplierLines: undefined }
      : { ...offer, supplierLines: undefined };
    const familyRules = rules.map((r) => {
      const slices = partyRuleSlices.get(r.id);
      return slices ? { ...r, amount: { kind: "fixed" as const, pence: slices[i]! } } : r;
    });
    const res = calculateTrueCost({ party, offer: familyOffer, rules: familyRules });
    return {
      party,
      people: people[i]!,
      advertisedPence: res.advertisedPence,
      trueCostPence: res.trueCostPence,
      perPersonPence: 0,
    };
  });

  // Per-night slices can leave a few pence of rounding; give it to the first family so it adds up.
  const diff = groupResult.trueCostPence - shares.reduce((s, f) => s + f.trueCostPence, 0);
  if (diff !== 0) shares[0]!.trueCostPence += diff;
  for (const s of shares) s.perPersonPence = Math.round(s.trueCostPence / s.people);

  return { group: groupResult, shares };
}
