import { formatGBP } from "./money";
import { partySize } from "./party";
import type { Offer, Party } from "./types";

/**
 * Does the advert's own maths add up, and was it priced for this family?
 *
 * Pure checks on what the advert itself says (Offer.advertCheck). They never change the price:
 * they add a plain note so the family checks before booking. Catches AI misreads, and adverts
 * whose per-person and total prices don't agree.
 */

const people = (a: number, c: number) =>
  [`${a} adult${a === 1 ? "" : "s"}`, c ? `${c} child${c === 1 ? "" : "ren"}` : ""].filter(Boolean).join(" and ");

export function advertNotes(party: Party, offer: Pick<Offer, "advertCheck" | "freeChildClaim">): string[] {
  const a = offer.advertCheck;
  if (!a) return [];
  const notes: string[] = [];

  // 1. Per-person × people should equal the total the advert shows.
  const advAdults = a.adults ?? party.adults;
  const advChildren = a.children ?? party.childAges.length;
  if (a.perPersonPence && a.totalPence && a.perPersonPence > 0 && a.totalPence > 0) {
    const paying = offer.freeChildClaim ? advAdults : advAdults + advChildren;
    const expected = a.perPersonPence * paying;
    const off = Math.abs(expected - a.totalPence);
    if (paying > 0 && off > Math.max(100, expected * 0.01)) {
      notes.push(
        `The advert's own numbers don't add up: ${formatGBP(a.perPersonPence)} per person × ${paying} ` +
          `paying = ${formatGBP(expected)}, but it shows ${formatGBP(a.totalPence)} in total. ` +
          "Check which price is right before you book.",
      );
    }
  }

  // 2. Priced for a different party than this family.
  if (a.adults !== undefined || a.children !== undefined) {
    const famChildren = party.childAges.length;
    if (advAdults !== party.adults || advChildren !== famChildren) {
      notes.push(
        `The advertised price is for ${people(advAdults, advChildren)}. Your party is ` +
          `${people(party.adults, famChildren)} (${partySize(party)} people), so the seller's price ` +
          "for your family may be different. Check it on their site.",
      );
    }
  }
  return notes;
}
