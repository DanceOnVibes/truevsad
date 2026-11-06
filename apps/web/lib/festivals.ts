import { fold } from "@truevsad/true-cost";

/**
 * Festivals listed on DanceOnVibes (danceonvibes.com), run by the same company as TrueVsAd.
 * Only the name, place and page link: no dates or prices, because TrueVsAd never shows a figure
 * it hasn't sourced and checked itself. Copied from danceonvibes.com/festivals/calendar, 6 Nov 2026.
 */
export type Festival = {
  /** Short code used in links: /xray?festival=untold */
  key: string;
  name: string;
  city: string;
  country: string;
  /** The festival's page on DanceOnVibes. */
  page: string;
};

const DOV = "https://danceonvibes.com/festival/";

export const FESTIVALS: Festival[] = [
  { key: "untold", name: "Untold", city: "Cluj-Napoca", country: "Romania", page: `${DOV}Untold` },
  { key: "tomorrowland", name: "Tomorrowland", city: "Boom", country: "Belgium", page: `${DOV}Tomorrowland` },
  { key: "defqon1", name: "Defqon.1", city: "Biddinghuizen", country: "Netherlands", page: `${DOV}Defqon.1` },
  { key: "awakenings", name: "Awakenings", city: "Hilvarenbeek", country: "Netherlands", page: `${DOV}Awakenings` },
  { key: "time-warp", name: "Time Warp", city: "Mannheim", country: "Germany", page: `${DOV}Time%20Warp` },
  { key: "boom", name: "Boom Festival", city: "Idanha-a-Nova", country: "Portugal", page: `${DOV}Boom%20Festival` },
  { key: "ultra-miami", name: "Ultra Miami", city: "Miami", country: "United States", page: `${DOV}Ultra%20Miami` },
  { key: "edc-las-vegas", name: "EDC Las Vegas", city: "Las Vegas", country: "United States", page: `${DOV}EDC%20Las%20Vegas` },
  { key: "sunburn", name: "Sunburn", city: "Goa", country: "India", page: `${DOV}Sunburn` },
];

/** The same-company line shown next to every link to DanceOnVibes. */
export const SAME_COMPANY =
  "DanceOnVibes is run by DanceOnVibes Limited, the same company as TrueVsAd. We earn nothing from these links.";

export function festivalByKey(key: string | null | undefined): Festival | undefined {
  if (!key) return undefined;
  return FESTIVALS.find((f) => f.key === key.trim().toLowerCase());
}

/** Festivals in a place, matched on the town as a whole word (so "Boom" doesn't match "Boomtown"). */
export function festivalsIn(...texts: (string | null | undefined)[]): Festival[] {
  const words = ` ${texts.filter(Boolean).map((t) => fold(t!)).join(" ").replace(/[^a-z0-9]+/g, " ")} `;
  return FESTIVALS.filter((f) => {
    const city = fold(f.city).replace(/[^a-z0-9]+/g, " ").trim();
    return words.includes(` ${city} `);
  });
}
