import type { Party } from "./types";

/** UK outward code: e.g. SW1A, SE11, M1, B33, EC1V. */
const OUTWARD_CODE = /^[A-Z]{1,2}[0-9][A-Z0-9]?$/;

export class PartyValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PartyValidationError";
  }
}

/**
 * Accepts a full or partial postcode and keeps ONLY the outward part.
 * "se11 5xx" → "SE11". We never store the inward code.
 */
export function toOutwardPostcode(input: string): string | undefined {
  const cleaned = input.trim().toUpperCase().replace(/\s+/g, " ");
  if (!cleaned) return undefined;
  const outward = cleaned.includes(" ")
    ? cleaned.split(" ")[0]!
    : cleaned.length > 4
      ? cleaned.slice(0, -3) // full postcode typed without a space
      : cleaned;
  return OUTWARD_CODE.test(outward) ? outward : undefined;
}

export function validateParty(party: Party): void {
  if (!Number.isInteger(party.adults) || party.adults < 1 || party.adults > 9) {
    throw new PartyValidationError("Party needs between 1 and 9 adults.");
  }
  if (party.childAges.length > 9) {
    throw new PartyValidationError("Maximum 9 children per party.");
  }
  for (const age of party.childAges) {
    if (!Number.isInteger(age) || age < 0 || age > 17) {
      throw new PartyValidationError("Child ages must be whole numbers from 0 to 17.");
    }
  }
  if (party.outwardPostcode !== undefined && !OUTWARD_CODE.test(party.outwardPostcode)) {
    throw new PartyValidationError("Outward postcode only, e.g. SE11.");
  }
}

export function partySize(party: Party): number {
  return party.adults + party.childAges.length;
}

/** Children counted by a rule's age band. */
export function childrenInBand(party: Party, minAge = 0, maxAge = 17): number {
  return party.childAges.filter((a) => a >= minAge && a <= maxAge).length;
}
