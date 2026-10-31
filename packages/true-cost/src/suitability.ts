/**
 * Visit Before You Book — is this place a good fit for *your* group?
 *
 * Pure scoring from counts of mapped places nearby (from OpenStreetMap). No network here.
 * Scores are a guide, not a verdict: mapping can be incomplete, and we say so.
 */

/** Counts of mapped places around a destination point. Radii are fixed in PLACE_SIGNALS. */
export interface PlaceCounts {
  playground: number;
  beach: number;
  park: number;
  waterOrThemePark: number;
  nightclub: number;
  barOrPub: number;
  restaurantOrCafe: number;
  supermarket: number;
  pharmacy: number;
  medical: number;
  attraction: number;
}

export type PlaceSignal = keyof PlaceCounts;

/** What each count means and how far we look. Used by the server query and the UI. */
export const PLACE_SIGNALS: Record<PlaceSignal, { label: string; radiusM: number }> = {
  playground: { label: "playgrounds", radiusM: 1500 },
  beach: { label: "beaches", radiusM: 1500 },
  park: { label: "parks", radiusM: 1500 },
  waterOrThemePark: { label: "water or theme parks", radiusM: 10000 },
  nightclub: { label: "nightclubs", radiusM: 1000 },
  barOrPub: { label: "bars and pubs", radiusM: 1000 },
  restaurantOrCafe: { label: "restaurants and cafés", radiusM: 1000 },
  supermarket: { label: "supermarkets", radiusM: 1500 },
  pharmacy: { label: "pharmacies", radiusM: 1500 },
  medical: { label: "hospitals, clinics or doctors", radiusM: 10000 },
  attraction: { label: "attractions, museums and viewpoints", radiusM: 3000 },
};

export type Lens = "families" | "couples" | "groups";

export const LENSES: Record<Lens, string> = {
  families: "Families with young children",
  couples: "Couples",
  groups: "Groups, stag and hen",
};

export type Light = "green" | "amber" | "red";

export interface LensScore {
  lens: Lens;
  /** 0–100 */
  score: number;
  light: Light;
  /** Why: the strongest positives and warnings, in plain English. */
  good: string[];
  watch: string[];
}

/** Diminishing returns: the first few count most. 0 → 0, `enough` or more → 1. */
function sat(n: number, enough: number): number {
  return Math.min(1, Math.max(0, n) / enough);
}

function km(m: number): string {
  return m >= 1000 ? `${m / 1000} km` : `${m} m`;
}

function near(c: PlaceCounts, s: PlaceSignal): string {
  const n = c[s];
  return `${n} ${PLACE_SIGNALS[s].label} within ${km(PLACE_SIGNALS[s].radiusM)}`;
}

function lightFor(score: number): Light {
  return score >= 65 ? "green" : score >= 40 ? "amber" : "red";
}

/** Weighted positives (0–1 each), minus penalties (0–1 each), scaled to 0–100. */
function combine(pos: [number, number][], neg: [number, number][]): number {
  const wsum = pos.reduce((s, [, w]) => s + w, 0);
  const p = pos.reduce((s, [v, w]) => s + v * w, 0) / wsum;
  const n = neg.reduce((s, [v, w]) => s + v * w, 0);
  return Math.round(Math.max(0, Math.min(1, p - n)) * 100);
}

export function scorePlace(c: PlaceCounts): LensScore[] {
  const families = (() => {
    const score = combine(
      [
        [sat(c.playground, 3), 3],
        [sat(c.beach + c.park, 2), 3],
        [sat(c.waterOrThemePark, 1), 1],
        [sat(c.supermarket, 2), 2],
        [sat(c.pharmacy, 1), 2],
        [sat(c.medical, 1), 1],
      ],
      [
        [sat(c.nightclub - 2, 8), 0.35], // a couple of clubs is normal; a strip of them is noisy
        [sat(c.barOrPub - 25, 50), 0.15],
      ],
    );
    const good: string[] = [];
    const watch: string[] = [];
    if (c.playground) good.push(near(c, "playground"));
    if (c.beach) good.push(near(c, "beach"));
    if (c.waterOrThemePark) good.push(near(c, "waterOrThemePark"));
    if (c.supermarket) good.push(near(c, "supermarket"));
    if (!c.playground) watch.push(`No playgrounds mapped within ${km(PLACE_SIGNALS.playground.radiusM)}`);
    if (!c.pharmacy) watch.push(`No pharmacy mapped within ${km(PLACE_SIGNALS.pharmacy.radiusM)}`);
    if (!c.medical) watch.push(`No hospital, clinic or doctor mapped within ${km(PLACE_SIGNALS.medical.radiusM)}`);
    if (c.nightclub >= 3) watch.push(`${near(c, "nightclub")}: can be noisy late at night`);
    return { lens: "families" as const, score, light: lightFor(score), good, watch };
  })();

  const couples = (() => {
    const score = combine(
      [
        [sat(c.restaurantOrCafe, 20), 3],
        [sat(c.beach, 1), 2],
        [sat(c.attraction, 5), 2],
        [sat(c.barOrPub, 5), 1],
      ],
      [[sat(c.nightclub - 4, 10), 0.2]],
    );
    const good: string[] = [];
    const watch: string[] = [];
    if (c.restaurantOrCafe) good.push(near(c, "restaurantOrCafe"));
    if (c.beach) good.push(near(c, "beach"));
    if (c.attraction) good.push(near(c, "attraction"));
    if (c.restaurantOrCafe < 5) watch.push("Few places to eat out within walking distance");
    if (c.nightclub >= 5) watch.push(`${near(c, "nightclub")}: lively at night`);
    return { lens: "couples" as const, score, light: lightFor(score), good, watch };
  })();

  const groups = (() => {
    const score = combine(
      [
        [sat(c.barOrPub, 15), 3],
        [sat(c.nightclub, 3), 3],
        [sat(c.restaurantOrCafe, 15), 2],
        [sat(c.beach, 1), 1],
      ],
      [],
    );
    const good: string[] = [];
    const watch: string[] = [];
    if (c.barOrPub) good.push(near(c, "barOrPub"));
    if (c.nightclub) good.push(near(c, "nightclub"));
    if (c.restaurantOrCafe) good.push(near(c, "restaurantOrCafe"));
    if (!c.nightclub) watch.push(`No nightclubs mapped within ${km(PLACE_SIGNALS.nightclub.radiusM)}`);
    if (c.barOrPub < 5) watch.push("Quiet: few bars or pubs within walking distance");
    return { lens: "groups" as const, score, light: lightFor(score), good, watch };
  })();

  return [families, couples, groups];
}

/** Very sparse data usually means the place is badly mapped, not that it's empty. */
export function looksUnderMapped(c: PlaceCounts): boolean {
  const total = Object.values(c).reduce((s, n) => s + n, 0);
  return total < 5;
}
