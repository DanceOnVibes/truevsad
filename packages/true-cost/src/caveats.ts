import type { Offer, TrueCostResult } from "./types";

/**
 * "What this receipt checked, and what it didn't."
 *
 * Every receipt states its method and its limits in plain facts — never "we estimate" or
 * "we assume". A family (or a regulator) can see exactly what the true price covers.
 */
export interface ReceiptScope {
  /** How the figures above were counted (method, stated as fact). */
  counted: string[];
  /** Costs this receipt did not check. Named exactly, so nobody mistakes the total for everything. */
  notChecked: string[];
}

export function receiptScope(
  offer: Pick<Offer, "includes">,
  result: Pick<TrueCostResult, "receipt">,
): ReceiptScope {
  const lines = result.receipt.lines;
  const includes = offer.includes ?? [];
  const added = (re: RegExp) => lines.some((l) => l.category !== "supplier" && re.test(l.label));

  const counted: string[] = [];
  if (added(/hold bag/i)) counted.push("Hold bags: one per person aged 2 and over.");
  if (lines.some((l) => /per room/i.test(l.label))) counted.push("Per-room fees: one room for the whole party.");
  if (lines.some((l) => l.category === "levy" && /4-star/i.test(l.label)))
    counted.push("Tourist tax: the 4-star hotel rate (3-star is lower, 5-star higher).");

  const notChecked: string[] = [];
  if (!includes.includes("transfers") && !added(/transfer/i)) notChecked.push("Transfers between the resort airport and your stay.");
  notChecked.push("Getting to and from the UK airport (parking, train or fuel).");
  notChecked.push("Meals beyond the board basis, spending money and travel insurance.");

  return { counted, notChecked };
}
