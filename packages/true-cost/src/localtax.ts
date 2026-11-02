import { mentions } from "./scope";

/**
 * Local taxes we can't work out from a deal's price: a percentage of the room price (a package
 * price doesn't show it), or a levy that hasn't started yet (it depends on when you travel).
 * They are never added to the true price. The receipt names them instead, with the official
 * wording, so the family can ask the seller.
 */
export interface LocalTaxNote {
  places: string[];
  name: string;
  text: string;
  sourceUrl: string;
  /** A temporary change, shown only until it ends, with its own source. */
  temporary?: { text: string; until: string; sourceUrl: string };
  checkedOn: string;
}

export const LOCAL_TAX_NOTES: LocalTaxNote[] = [
  {
    places: ["Amsterdam"],
    name: "Amsterdam tourist tax",
    text: "12.5% of the room price per night, worked out on the price before VAT and without breakfast. A package price doesn't show the room price, so we can't work it out. Ask the seller whether it's in your price; if not, the hotel adds it.",
    sourceUrl: "https://lokaleregelgeving.overheid.nl/CVDR703815/1",
    checkedOn: "2026-11-01",
  },
  {
    places: [
      "Turkey", "Türkiye", "Turkiye", "Antalya", "Belek", "Lara Beach", "Kemer", "Alanya", "Bodrum", "Marmaris",
      "Icmeler", "Fethiye", "Oludeniz", "Ölüdeniz", "Dalaman", "Dalyan", "Kusadasi", "Kuşadası", "Istanbul", "Gocek", "Göcek",
    ],
    name: "Turkey accommodation tax",
    text: "2% of the hotel bill, including board and other services sold with the room. A package price doesn't show the room price, so we can't work it out. The hotel adds it to its bill, so ask the seller whether it's in your price.",
    sourceUrl: "https://intvrg.gib.gov.tr/KONAKLAMA_VERGISI_BEYANNAMESI_DUZENLEME_KILAVUZU.pdf",
    temporary: {
      text: "Cut to 1% from 1 May to 31 December 2026 (Presidential Decision 11263).",
      until: "2026-12-31",
      sourceUrl: "https://www.turmob.org.tr/ekutuphane/Read/2fb71798-8698-460a-97fd-d0f9013fb9ba",
    },
    checkedOn: "2026-11-01",
  },
  {
    places: ["Edinburgh"],
    name: "Edinburgh visitor levy",
    text: "5% of the accommodation cost (before VAT, without extras like parking or meals) for the first 5 nights, for stays from 24 July 2026. Ask whether it's in your price.",
    sourceUrl: "https://www.edinburgh.gov.uk/business/visitor-levy-edinburgh",
    checkedOn: "2026-11-01",
  },
  {
    places: ["Glasgow"],
    name: "Glasgow visitor levy",
    text: "From 25 January 2027: 5% of the accommodation cost for the whole stay.",
    sourceUrl: "https://www.glasgow.gov.uk/article/14799/Glasgow-s-Visitor-Levy",
    checkedOn: "2026-11-01",
  },
  {
    places: ["Aberdeen"],
    name: "Aberdeen visitor levy",
    text: "From 1 April 2027: 7% of the accommodation cost for the whole stay.",
    sourceUrl: "https://support.visitscotland.org/advice-support/start-your-business/legislation/visitor-levy",
    checkedOn: "2026-11-01",
  },
  {
    places: ["Stirling"],
    name: "Stirling visitor levy",
    text: "From 14 June 2027: 3% of the accommodation cost (a refund can be asked for nights after the first 7).",
    sourceUrl: "https://support.visitscotland.org/advice-support/start-your-business/legislation/visitor-levy",
    checkedOn: "2026-11-01",
  },
  {
    places: ["West Dunbartonshire", "Balloch", "Dumbarton", "Clydebank"],
    name: "West Dunbartonshire visitor levy",
    text: "From 1 July 2027: 5% of the accommodation cost for the whole stay.",
    sourceUrl: "https://support.visitscotland.org/advice-support/start-your-business/legislation/visitor-levy",
    checkedOn: "2026-11-01",
  },
  {
    places: ["Cardiff", "Caerdydd"],
    name: "Cardiff visitor levy",
    text: "From 1 April 2027: £1.30 per person per night (75p for camping pitches and shared hostel rooms, where under-18s are exempt). Stays over 31 nights are exempt.",
    sourceUrl: "https://www.gov.wales/check-if-local-council-charges-visitor-levy-wales",
    checkedOn: "2026-11-01",
  },
];

export function localTaxNoteFor(destination: string | undefined | null): LocalTaxNote | undefined {
  if (!destination) return undefined;
  return LOCAL_TAX_NOTES.find((n) => n.places.some((p) => mentions(destination, p)));
}
