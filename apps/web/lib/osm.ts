import { PLACE_SIGNALS, type PlaceCounts, type PlaceSignal } from "@truevsad/true-cost";
import { supabaseAdmin } from "./supabase-admin";

/**
 * Visit Before You Book — what's around a place, from OpenStreetMap.
 *
 * - Geocoding: Nominatim (OpenStreetMap's search). Counting: the Overpass API.
 *   Both are free community services, so we follow their rules: identify ourselves,
 *   keep volume low (rate-limited per visitor) and cache every result (30 days, in London).
 * - We only ever send a PLACE NAME (e.g. "Salou, Spain"). Nothing about the family.
 * - This is not scraping airlines or holiday sellers: it's open map data under the ODbL
 *   licence, and every page that shows it credits "© OpenStreetMap contributors".
 */

const USER_AGENT = "TrueVsAd/0.1 (+https://truevsad.co.uk; hello@truevsad.co.uk)";
const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const OVERPASS = "https://overpass-api.de/api/interpreter";
const FRESH_DAYS = 30;

/** OpenStreetMap tags for each signal. Order matters: Overpass answers in this order. */
const SELECTORS: Record<PlaceSignal, string[]> = {
  playground: ['nwr["leisure"="playground"]'],
  beach: ['nwr["natural"="beach"]'],
  park: ['nwr["leisure"="park"]'],
  waterOrThemePark: ['nwr["leisure"="water_park"]', 'nwr["tourism"="theme_park"]'],
  nightclub: ['nwr["amenity"="nightclub"]'],
  barOrPub: ['nwr["amenity"="bar"]', 'nwr["amenity"="pub"]'],
  restaurantOrCafe: ['nwr["amenity"="restaurant"]', 'nwr["amenity"="cafe"]'],
  supermarket: ['nwr["shop"="supermarket"]'],
  pharmacy: ['nwr["amenity"="pharmacy"]'],
  medical: ['nwr["amenity"="hospital"]', 'nwr["amenity"="clinic"]', 'nwr["amenity"="doctors"]'],
  attraction: ['nwr["tourism"="attraction"]', 'nwr["tourism"="museum"]', 'nwr["tourism"="viewpoint"]'],
};
const SIGNALS = Object.keys(SELECTORS) as PlaceSignal[];

export interface PlaceSnapshot {
  query: string;
  displayName: string;
  lat: number;
  lon: number;
  counts: PlaceCounts;
  fetchedAt: string;
}

export type PlaceLookup =
  | { ok: true; place: PlaceSnapshot; cached: boolean }
  | { ok: false; reason: "not_found" | "unavailable" | "invalid" };

/** "  Salou,  SPAIN " → "salou, spain" — the cache key. */
export function placeKey(q: string): string {
  return q
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N},'’ -]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

/** Cached snapshot if fresh. `allowFetch` = false never touches OpenStreetMap. */
export async function lookupPlace(rawQuery: string, allowFetch: boolean): Promise<PlaceLookup> {
  const key = placeKey(rawQuery);
  if (key.length < 2) return { ok: false, reason: "invalid" };

  const db = supabaseAdmin();
  if (db) {
    const { data } = await db
      .from("place_snapshot")
      .select("display_name, lat, lon, counts, fetched_at")
      .eq("query_key", key)
      .maybeSingle();
    if (data && Date.now() - Date.parse(data.fetched_at as string) < FRESH_DAYS * 86_400_000) {
      return {
        ok: true,
        cached: true,
        place: {
          query: key,
          displayName: data.display_name as string,
          lat: Number(data.lat),
          lon: Number(data.lon),
          counts: normaliseCounts(data.counts),
          fetchedAt: data.fetched_at as string,
        },
      };
    }
  }
  if (!allowFetch) return { ok: false, reason: "unavailable" };

  const geo = await geocode(key);
  if (geo === "unavailable") return { ok: false, reason: "unavailable" };
  if (!geo) return { ok: false, reason: "not_found" };

  const counts = await countAround(geo.lat, geo.lon);
  if (!counts) return { ok: false, reason: "unavailable" };

  const place: PlaceSnapshot = {
    query: key,
    displayName: geo.displayName,
    lat: geo.lat,
    lon: geo.lon,
    counts,
    fetchedAt: new Date().toISOString(),
  };
  if (db) {
    const { error } = await db.from("place_snapshot").upsert({
      query_key: key,
      display_name: place.displayName.slice(0, 300),
      lat: place.lat,
      lon: place.lon,
      counts,
      fetched_at: place.fetchedAt,
    });
    if (error) console.error("place_snapshot save failed:", error.message);
  }
  return { ok: true, cached: false, place };
}

async function geocode(q: string): Promise<{ lat: number; lon: number; displayName: string } | null | "unavailable"> {
  const url = `${NOMINATIM}?${new URLSearchParams({ q, format: "jsonv2", limit: "1", "accept-language": "en" })}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Referer: "https://truevsad.co.uk/" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      console.error("Nominatim returned", res.status);
      return "unavailable";
    }
    const list = (await res.json()) as { lat?: string; lon?: string; display_name?: string }[];
    const hit = list[0];
    const lat = Number(hit?.lat);
    const lon = Number(hit?.lon);
    if (!hit || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { lat, lon, displayName: String(hit.display_name ?? q) };
  } catch (err) {
    console.error("Nominatim request failed", (err as Error).name);
    return "unavailable";
  }
}

/** One Overpass request that returns one count per signal, in SIGNALS order. */
export function overpassQuery(lat: number, lon: number): string {
  const at = `${lat.toFixed(5)},${lon.toFixed(5)}`;
  const blocks = SIGNALS.map((s) => {
    const r = PLACE_SIGNALS[s].radiusM;
    return `(${SELECTORS[s].map((sel) => `${sel}(around:${r},${at});`).join("")});out count;`;
  });
  return `[out:json][timeout:25];\n${blocks.join("\n")}`;
}

async function countAround(lat: number, lon: number): Promise<PlaceCounts | null> {
  try {
    const res = await fetch(OVERPASS, {
      method: "POST",
      headers: { "User-Agent": USER_AGENT, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ data: overpassQuery(lat, lon) }),
      signal: AbortSignal.timeout(28_000),
    });
    if (!res.ok) {
      console.error("Overpass returned", res.status);
      return null;
    }
    const json = (await res.json()) as { elements?: { type: string; tags?: { total?: string } }[] };
    const counts = (json.elements ?? []).filter((e) => e.type === "count");
    if (counts.length !== SIGNALS.length) return null;
    return Object.fromEntries(SIGNALS.map((s, i) => [s, Number(counts[i]!.tags?.total ?? 0) || 0])) as PlaceCounts;
  } catch (err) {
    console.error("Overpass request failed", (err as Error).name);
    return null;
  }
}

function normaliseCounts(raw: unknown): PlaceCounts {
  const r = (raw ?? {}) as Record<string, unknown>;
  return Object.fromEntries(SIGNALS.map((s) => [s, Math.max(0, Number(r[s]) || 0)])) as PlaceCounts;
}

/** Map + Street View links. Built from coordinates only. */
export function placeLinks(lat: number, lon: number) {
  const ll = `${lat.toFixed(5)},${lon.toFixed(5)}`;
  const d = 0.015;
  return {
    embed: `https://www.openstreetmap.org/export/embed.html?bbox=${(lon - d * 1.6).toFixed(5)},${(lat - d).toFixed(5)},${(lon + d * 1.6).toFixed(5)},${(lat + d).toFixed(5)}&layer=mapnik&marker=${ll}`,
    osm: `https://www.openstreetmap.org/?mlat=${lat.toFixed(5)}&mlon=${lon.toFixed(5)}#map=15/${ll.replace(",", "/")}`,
    streetView: `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${ll}`,
    googleMaps: `https://www.google.com/maps/search/?api=1&query=${ll}`,
  };
}
