import { mentions } from "./scope";

/**
 * Local taxes charged as a percentage of the room price. A package price doesn't show the room
 * price, so these can't be worked out and are never added to the true price. The receipt names
 * them instead, with the official wording, so the family can ask the seller.
 */
export interface LocalTaxNote {
  places: string[];
  name: string;
  text: string;
  sourceUrl: string;
  checkedOn: string;
}

export const LOCAL_TAX_NOTES: LocalTaxNote[] = [
  {
    places: ["Amsterdam"],
    name: "Amsterdam tourist tax",
    text: "12.5% of the room price per night, worked out on the price before VAT and without breakfast. Ask the seller whether it's in your price; if not, the hotel adds it.",
    sourceUrl: "https://lokaleregelgeving.overheid.nl/CVDR703815/1",
    checkedOn: "2026-11-01",
  },
  {
    places: [
      "Turkey", "Türkiye", "Turkiye", "Antalya", "Belek", "Lara", "Kemer", "Alanya", "Bodrum", "Marmaris",
      "Icmeler", "Fethiye", "Oludeniz", "Ölüdeniz", "Dalaman", "Dalyan", "Kusadasi", "Kuşadası", "Istanbul", "Gocek", "Göcek",
    ],
    name: "Turkey accommodation tax",
    text: "2% of the hotel bill, including board and other services sold with the room (cut to 1% from 1 May to 31 December 2026). The hotel adds it to its bill, so ask the seller whether it's in your price.",
    sourceUrl: "https://intvrg.gib.gov.tr/KONAKLAMA_VERGISI_BEYANNAMESI_DUZENLEME_KILAVUZU.pdf",
    checkedOn: "2026-11-01",
  },
];

export function localTaxNoteFor(destination: string | undefined | null): LocalTaxNote | undefined {
  if (!destination) return undefined;
  return LOCAL_TAX_NOTES.find((n) => n.places.some((p) => mentions(destination, p)));
}
