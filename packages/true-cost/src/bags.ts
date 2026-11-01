import { mentions } from "./scope";

/**
 * Cabin bag rules per airline, and "Will my bag fit?".
 *
 * Every row comes from the airline's own page, with its exact words and the date checked
 * (data/bags/airline_bag_rules_uk_2026-10-31.csv). A row is `verified` only when two independent
 * research passes quoted the same numbers from the airline's own page. Unconfirmed sizes are null
 * and show as "not checked yet" — never filled in from memory.
 *
 * These are advisory: they never change a price or FairMark. A gate fee is a penalty for getting
 * it wrong, not a cost of the deal.
 */

export type BagKind = "underseat" | "cabin";
/** Free on every fare, paid extra, or included only on some fares/bundles. */
export type BagPrice = "free" | "paid" | "some_fares";

export interface BagAllowance {
  kind: BagKind;
  /** Max size in cm, any order; null when not confirmed. */
  dims: [number, number, number] | null;
  maxKg: number | null;
  /** Do wheels and handles count towards the size? */
  wheelsCount: "yes" | "no" | "not stated";
  /** Extra cm wheels may add when they don't count (Wizz Air: up to 5 cm). */
  wheelExtraCm?: number;
  price: BagPrice;
  priceNote?: string;
  /** The airline's own published gate fee, exactly as published (currency included). */
  gateFee?: string;
  /** What the airline charges to add this bag, as published on its own fees page. */
  buyPrice?: string;
  /** Where buyPrice / gateFee come from, when that's a different page from sourceUrl. */
  feeSourceUrl?: string;
  /** Paid cabin bag includes priority boarding. */
  priority?: boolean;
  sourceUrl: string;
  quote: string;
  checkedOn: string;
  verified: boolean;
}

export interface AirlineBags {
  airline: string;
  /** Names that point to this airline in a deal (seller or airline field). */
  aliases: string[];
  bags: BagAllowance[];
  /** Plain extra facts from the same pages (infants, gate triggers). */
  notes: string[];
}

const C = "2026-10-31";

export const AIRLINE_BAGS: AirlineBags[] = [
  {
    airline: "Aer Lingus",
    aliases: ["Aer Lingus"],
    bags: [
      { kind: "underseat", dims: [40, 30, 20], maxKg: null, wheelsCount: "yes", price: "free", sourceUrl: "https://www.aerlingus.com/prepare/bags/carry-on-baggage", quote: "It must fit inside the gauge units at the airport (including wheels and handles).", checkedOn: C, verified: true },
      { kind: "cabin", dims: [55, 40, 24], maxKg: 10, wheelsCount: "yes", price: "some_fares", priceNote: "Included with Plus, Advantage and AerSpace; not with Saver (from €9.99/£9.99 to add)", gateFee: "€35 to put a 10kg bag in the hold", feeSourceUrl: "https://www.aerlingus.com/localized/en/modals/baggage-information.html", sourceUrl: "https://www.aerlingus.com/prepare/bags/carry-on-baggage", quote: "Fare Types - All Plus, Advantage, AerSpace and Economy fares purchased via British Airways (Not included in Saver fares)", checkedOn: C, verified: true },
    ],
    notes: ["Applies to Aer Lingus and Aer Lingus Regional flights within Europe."],
  },
  {
    airline: "British Airways",
    aliases: ["British Airways", "BA Holidays", "britishairways"],
    bags: [
      { kind: "underseat", dims: [40, 30, 15], maxKg: null, wheelsCount: "not stated", price: "free", priceNote: "Must easily fit under the seat in front", sourceUrl: "https://www.britishairways.com/content/information/baggage-essentials", quote: "Max dimensions of 40 x 30 x 15cm (16 x 12 x 6in)", checkedOn: C, verified: true },
      { kind: "cabin", dims: [56, 45, 25], maxKg: null, wheelsCount: "yes", price: "free", priceNote: "You must be able to lift it into the locker yourself", sourceUrl: "https://www.britishairways.com/content/information/baggage-essentials", quote: "Max dimensions of 56 x 45 x 25cm (22 x 18 x 10in) – including wheels and handles", checkedOn: C, verified: true },
    ],
    notes: [
      "Economy Basic includes no checked bag. Economy with a checked bag: 1 bag up to 23kg and 90 × 75 × 43cm.",
    ],
  },
  {
    airline: "easyJet",
    aliases: ["easyJet"],
    bags: [
      { kind: "underseat", dims: [45, 36, 20], maxKg: 15, wheelsCount: "yes", price: "free", sourceUrl: "https://www.easyjet.com/en/help/baggage/cabin-bags", quote: "It can be a maximum size of 45 x 36 x 20 cm (including any handles and wheels) and must be kept under the seat in front of you.", checkedOn: C, verified: true },
      { kind: "cabin", dims: [56, 45, 25], maxKg: 15, wheelsCount: "yes", price: "paid", priceNote: "Included with some seats and memberships", buyPrice: "from £5.99 online", feeSourceUrl: "https://www.easyjet.com/en/terms-and-conditions/fees", gateFee: "£60", priority: true, sourceUrl: "https://www.easyjet.com/en/help/baggage/cabin-bags", quote: "It's always cheaper to add a large cabin bag online than at the boarding gate, where it costs £60.", checkedOn: C, verified: true },
    ],
    notes: ["Hold bags paid at the airport bag drop cost £60 (easyJet's own page)."],
  },
  {
    airline: "Jet2",
    aliases: ["Jet2", "Jet2holidays"],
    bags: [
      { kind: "underseat", dims: [40, 30, 20], maxKg: null, wheelsCount: "not stated", price: "free", sourceUrl: "https://www.jet2.com/en/baggage", quote: "You can also bring one small under-seat bag onboard (such as a handbag or laptop bag) which must not exceed 40 x 30 x 20cm in size", checkedOn: C, verified: true },
      { kind: "cabin", dims: [56, 45, 25], maxKg: 10, wheelsCount: "yes", price: "free", sourceUrl: "https://www.jet2.com/en/baggage", quote: "each passenger has a 10kg hand luggage allowance included as standard (excluding infants) which must be no larger than 56cm x 45cm x 25cm (including wheels and handles)", checkedOn: C, verified: true },
    ],
    notes: ["Infants get an extra 10kg allowance, and up to two baby items (pushchair, car seat, travel cot) go free."],
  },
  {
    airline: "Lufthansa",
    aliases: ["Lufthansa"],
    bags: [
      { kind: "underseat", dims: [40, 30, 15], maxKg: null, wheelsCount: "not stated", price: "free", sourceUrl: "https://www.lufthansa.com/ao/en/carry-on-baggage", quote: "1 personal item. max. 40 x 30 x 15 cm.", checkedOn: C, verified: true },
      { kind: "cabin", dims: [55, 40, 23], maxKg: 8, wheelsCount: "not stated", price: "some_fares", priceNote: "Check your fare: Economy Basic on short and medium-haul flights doesn't include it", sourceUrl: "https://www.lufthansa.com/ao/en/carry-on-baggage", quote: "1 item of carry-on baggage. max. 8 kg max. 55 x 40 x 23 cm.", checkedOn: C, verified: true },
    ],
    notes: [],
  },
  {
    airline: "Norwegian",
    aliases: ["Norwegian"],
    bags: [
      { kind: "underseat", dims: [30, 40, 20], maxKg: 10, wheelsCount: "not stated", price: "free", priceNote: "On every ticket; 10kg on LowFare", sourceUrl: "https://www.norwegian.com/en/travel-info/baggage/hand-baggage", quote: "Small underseat cabin bag (30x40x20cm)", checkedOn: C, verified: true },
      { kind: "cabin", dims: [55, 40, 23], maxKg: 10, wheelsCount: "not stated", price: "some_fares", priceNote: "Included with LowFare+ (10kg combined) and Flex (15kg combined); not with LowFare", buyPrice: "£5–£9 on LowFare", feeSourceUrl: "https://www.norwegian.com/us/travel-info/baggage/changed-bag-rules/", sourceUrl: "https://www.norwegian.com/en/travel-info/baggage/hand-baggage", quote: "Overhead cabin bag (55x40x23cm)", checkedOn: C, verified: true },
    ],
    notes: ["Norwegian counts the combined weight of all your hand baggage."],
  },
  {
    airline: "Ryanair",
    aliases: ["Ryanair"],
    bags: [
      { kind: "underseat", dims: [40, 30, 20], maxKg: null, wheelsCount: "not stated", price: "free", sourceUrl: "https://help.ryanair.com/hc/en-gb/articles/12888036565521-Ryanair-s-Bag-Policy", quote: "All our fares include one small personal bag which can be brought on board, such as a handbag or laptop bag (40 x 30 x 20 cm), which must fit under the seat in front of you.", checkedOn: C, verified: true },
      { kind: "cabin", dims: [55, 40, 20], maxKg: 10, wheelsCount: "not stated", price: "paid", priceNote: "Sold as Priority & 2 Cabin Bags", buyPrice: "£12.49–£36 when you book, £19.99–£45.50 if added later (varies by route and date)", gateFee: "£46–£75 to put a 10kg bag in the hold", feeSourceUrl: "https://www.ryanair.com/gb/en/useful-info/help-centre/fees", priority: true, sourceUrl: "https://help.ryanair.com/hc/en-gb/articles/12888036565521-Ryanair-s-Bag-Policy", quote: "This allows you to carry a small personal bag (40 x 30 x 20 cm), which must fit under the seat in front of you and a 10kg bag (55x40x20cm) onboard", checkedOn: C, verified: true },
    ],
    notes: [
      "A bag that doesn't fit Ryanair's sizer is refused at the gate or put in the hold for a fee set in Ryanair's regulations (the amount isn't on its bag page).",
      "Lap infants get no cabin bag, but a baby bag up to 5kg (45×35×20cm) is allowed.",
    ],
  },
  {
    airline: "TUI",
    aliases: ["TUI", "TUI Airways"],
    bags: [
      { kind: "underseat", dims: [40, 30, 20], maxKg: null, wheelsCount: "not stated", price: "free", sourceUrl: "https://www.tui.co.uk/destinations/info/luggage-allowance", quote: "You can also bring one small personal item or laptop, which must be stored under the seat in front of you. The maximum dimensions for this are 40cm x 30cm x 20cm.", checkedOn: C, verified: true },
      { kind: "cabin", dims: [55, 40, 20], maxKg: 10, wheelsCount: "not stated", price: "free", sourceUrl: "https://www.tui.co.uk/destinations/info/luggage-allowance", quote: "Each piece of hand luggage can weigh up to 10kg and fit within the maximum dimensions of 55cm x 40cm x 20cm.", checkedOn: C, verified: true },
    ],
    notes: [
      "If hand luggage exceeds the size or weight limits, it goes in the hold and \"a charge may apply\" (amount not stated).",
      "Children under 2 don't have a hand luggage allowance.",
    ],
  },
  {
    airline: "Vueling",
    aliases: ["Vueling"],
    bags: [
      { kind: "underseat", dims: [40, 30, 20], maxKg: null, wheelsCount: "not stated", price: "free", sourceUrl: "https://help.vueling.com/hc/en-gb/articles/19798835176081-Hand-Luggage-Allowance-Cabin-bags-allowance", quote: "1 free underseat cabin bag size (max. 40x30x20 cm)", checkedOn: C, verified: true },
      { kind: "cabin", dims: [55, 40, 20], maxKg: 10, wheelsCount: "not stated", price: "some_fares", priceNote: "Included with Fly, Fly Grande and Fly Pro bundles; paid on basic fares (€10–59 online)", gateFee: "€110–140", sourceUrl: "https://www.vueling.com/en/service-prices", quote: "If at the boarding gate any piece of luggage exceeds 55x40x20 cm, you will have to check it in at a cost of 110 EUR to 140 EUR per item and flight.", checkedOn: C, verified: true },
    ],
    notes: ["Passengers travelling with infants get the under-seat bag and a 10kg cabin bag included."],
  },
  {
    airline: "Wizz Air",
    aliases: ["Wizz Air", "Wizz"],
    bags: [
      { kind: "underseat", dims: [40, 30, 20], maxKg: 10, wheelsCount: "no", wheelExtraCm: 5, price: "free", sourceUrl: "https://www.wizzair.com/cms/api/docs/default-source/downloadable-documents/general-conditions-of-carriage/gcc-wuk/wauk-gccs---2023---en.pdf", quote: "THE CABIN BAGGAGE MUST NOT EXCEED 40X30X20 CM, EXLUDING HANDLES AND WHEELS.", checkedOn: C, verified: true },
      { kind: "cabin", dims: [55, 40, 23], maxKg: null, wheelsCount: "no", wheelExtraCm: 5, price: "paid", priceNote: "Sold with WIZZ Priority", priority: true, sourceUrl: "https://www.wizzair.com/en-gb/information-and-services/wizz-services/wizz-priority", quote: "Priority passengers are entitled to bring an extra trolley bag (max. 55x40x23 cm) in addition to the free carry-on bag (max. 40x30x20 cm) into the cabin.", checkedOn: C, verified: true },
    ],
    notes: ["Wizz Air doesn't count handles and wheels in the size, but wheels may add no more than 5cm."],
  },
];

/** Airlines we couldn't check from a working page yet (not shown until we can). */
export const BAGS_NOT_CHECKED = ["KLM"] as const;

export function airlineBagsFor(name: string | undefined): AirlineBags | undefined {
  if (!name) return undefined;
  return AIRLINE_BAGS.find((a) => a.aliases.some((alias) => mentions(name, alias)));
}

export type FitResult = "fits" | "too_big" | "too_heavy" | "fits_if_wheels" | "not_checked";

/**
 * Does a bag (measured INCLUDING wheels and handles) fit this allowance? Sizes are compared
 * largest to largest, so a bag that fits on its side counts as fitting.
 */
export function bagFits(bag: { dims: [number, number, number]; kg?: number }, a: BagAllowance): FitResult {
  if (!a.dims || !a.verified) return "not_checked";
  const mine = [...bag.dims].sort((x, y) => y - x);
  const limit = [...a.dims].sort((x, y) => y - x);
  const over = mine.map((d, i) => d - limit[i]!);
  const heavy = bag.kg !== undefined && a.maxKg !== null && bag.kg > a.maxKg;
  if (over.every((o) => o <= 0)) return heavy ? "too_heavy" : "fits";
  // Wizz Air: wheels don't count, but may add up to 5cm. One side over by that much may be wheels.
  const tooFar = over.filter((o) => o > 0);
  if (a.wheelsCount === "no" && a.wheelExtraCm && tooFar.length === 1 && tooFar[0]! <= a.wheelExtraCm) {
    return heavy ? "too_heavy" : "fits_if_wheels";
  }
  return "too_big";
}
