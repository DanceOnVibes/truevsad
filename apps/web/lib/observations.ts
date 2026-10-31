import { partySize, type FairMark, type Offer, type Party, type TrueCostResult } from "@truevsad/true-cost";
import { placeKey, sellerKey } from "./quotes";
import { supabaseAdmin } from "./supabase-admin";

/**
 * Anonymous price observations — one row per X-ray, kept for 2 years.
 *
 * They let us measure, over time and without scraping, how prices move in school holidays and
 * how fair each seller is. Deliberately NOT linked to the quote or the family: no quote id, no
 * ages, no link, and only the week of travel and of checking. From the postcode we keep only the
 * AREA letters ("SE11" → "SE"), which cover tens of thousands of homes.
 */

/** "SE11" → "SE", "B3" → "B", "CF10" → "CF". Anything else → null. */
export function postcodeArea(outward: string | undefined): string | null {
  const m = /^([A-Z]{1,2})[0-9]/.exec((outward ?? "").toUpperCase());
  return m ? m[1]! : null;
}

/** Monday of the week containing `d` (UTC), as YYYY-MM-DD. */
export function mondayOf(d: Date): string {
  const t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const dow = (new Date(t).getUTCDay() + 6) % 7; // Monday = 0
  return new Date(t - dow * 86_400_000).toISOString().slice(0, 10);
}

export async function logObservation(input: {
  party: Party;
  offer: Offer;
  result: TrueCostResult;
  fairMark: FairMark;
  /** The advert's own currency, when it wasn't pounds. */
  advertisedCurrency?: "EUR" | "USD";
}): Promise<void> {
  const db = supabaseAdmin();
  if (!db) return;
  const { party, offer, result, fairMark } = input;
  const people = partySize(party);
  if (people < 1 || result.advertisedPence <= 0) return;

  const { error } = await db.from("price_observation").insert({
    observed_week: mondayOf(new Date()),
    seller_key: offer.supplierName ? sellerKey(offer.supplierName).slice(0, 80) || null : null,
    seller_name: offer.supplierName?.slice(0, 120) ?? null,
    place_key: offer.destination ? placeKey(offer.destination).slice(0, 120) || null : null,
    travel_week: offer.departDate ? mondayOf(new Date(`${offer.departDate}T00:00:00Z`)) : null,
    nights: offer.nights,
    party_size: people,
    children: party.childAges.length,
    headline_basis: offer.headlineBasis,
    advertised_pp_pence: Math.round(result.advertisedPence / people),
    true_pp_pence: Math.round(result.trueCostPence / people),
    includes: offer.includes ?? [],
    free_child_claim: offer.freeChildClaim === true,
    fairmark_percent: fairMark.percent,
    engine_version: result.engineVersion,
    home_area: postcodeArea(party.outwardPostcode),
    advertised_currency: input.advertisedCurrency ?? "GBP",
  });
  if (error) console.error("price_observation insert failed:", error.message);
}
