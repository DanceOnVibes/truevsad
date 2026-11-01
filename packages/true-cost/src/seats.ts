import { mentions } from "./scope";
import { childrenInBand } from "./party";
import type { FeeRule, Party } from "./types";

/**
 * Seats: we count only what an airline makes a FAMILY pay to sit together.
 *
 * - Adults-only bookings: choosing seats is a preference, not a hidden cost → nothing counted.
 * - With a child under 12: the airline's own rule decides —
 *     "free"      the airline seats each child next to / close to an adult at no charge → nothing;
 *     "one_adult" one parent must buy a seat so the children can sit with them → one adult's seat;
 *     unknown     the rule's own unit (per adult), until we have the airline's policy.
 *
 * Every policy comes from an official page with its exact words and the date checked.
 */
export type FamilySeatPolicy = "free" | "one_adult";

export interface AirlineSeating {
  airline: string;
  aliases: string[];
  policy: FamilySeatPolicy;
  sourceUrl: string;
  quote: string;
  checkedOn: string;
}

export const FAMILY_SEATING: AirlineSeating[] = [
  {
    // Changed after the CMA opened its case (11 Jun 2026). Ryanair's announcement of 25 Jun 2026;
    // its help page says the same: "If random allocation is selected, children will be seated next
    // to an accompanying adult on the same reservation free of charge."
    airline: "Ryanair",
    aliases: ["Ryanair"],
    policy: "free",
    sourceUrl: "https://corporate.ryanair.com/news/ryanair-tweaks-seat-allocation-for-families-to-match-industry-standard/",
    quote: "Ryanair does not charge any fee for children to sit beside their parent or accompanying adult.",
    checkedOn: "2026-11-01",
  },
  {
    airline: "easyJet",
    aliases: ["easyJet"],
    policy: "free",
    sourceUrl: "https://www.easyjet.com/en/help/boarding-and-flying/flying-with-children",
    quote: "we'll still make sure each child under 12 is seated close to an adult on your booking and we will arrange this at the airport or on board.",
    checkedOn: "2026-10-31",
  },
  {
    airline: "British Airways",
    aliases: ["British Airways", "BA Holidays"],
    policy: "free",
    sourceUrl: "https://www.britishairways.com/content/information/seating/reserving-your-seat",
    quote: "We'll make sure each child under 12 years sits next to an adult from your booking",
    checkedOn: "2026-10-31",
  },
  {
    // TUI Airways flights. Same FAQ on tui.co.uk and tuiholidays.ie.
    airline: "TUI",
    aliases: ["TUI", "TUI Airways"],
    policy: "free",
    sourceUrl:
      "https://www.tui.co.uk/destinations/faq/airport-flights-and-luggage/seats/im-travelling-with-my-family-do-i-need-to-reserve-our-seats-together",
    quote:
      "If you're flying with TUI Airways and there's a child under the age of 12 on your booking, we'll make sure they're seated with at least one adult in your party.",
    checkedOn: "2026-11-01",
  },
];

export function familySeatingFor(name: string | undefined): AirlineSeating | undefined {
  if (!name) return undefined;
  return FAMILY_SEATING.find((a) => a.aliases.some((alias) => mentions(name, alias)));
}

/**
 * Units for a "seats" rule (covers: "seats"), or null when nothing is counted.
 * The rule's supplierName is the airline whose seat price it is.
 */
export function seatUnits(rule: FeeRule, party: Party): { units: number; label: string } | null {
  const under12 = childrenInBand(party, 0, 11);
  if (under12 === 0) return null; // adults (and teens) can sit apart for free: a preference, not a cost
  const policy = familySeatingFor(rule.supplierName)?.policy;
  if (policy === "free") return null;
  if (policy === "one_adult") return { units: 1, label: "1 parent's family seat so the children can sit with them" };
  const n = party.adults;
  return { units: n, label: `${n} adult${n === 1 ? "" : "s"} (seats together; children under 12 sit with an adult)` };
}
