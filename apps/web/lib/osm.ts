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

/**
 * Find a place: OpenStreetMap's Nominatim first, then Photon (komoot's search over the same
 * OpenStreetMap data) only if Nominatim doesn't answer. "Not found" from Nominatim is final.
 */
async function geocode(q: string): Promise<{ lat: number; lon: number; displayName: string } | null | "unavailable"> {
  const main = await geocodeNominatim(q);
  if (main !== "unavailable") return main;
  return geocodePhoton(q);
}

async function geocodePhoton(q: string): Promise<{ lat: number; lon: number; displayName: string } | null | "unavailable"> {
  const url = `https://photon.komoot.io/api/?${new URLSearchParams({ q, limit: "1", lang: "en" })}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(8_000) });
    if (!res.ok) {
      console.error("Photon returned", res.status);
      return "unavailable";
    }
    const json = (await res.json()) as {
      features?: { geometry?: { coordinates?: [number, number] }; properties?: Record<string, string | undefined> }[];
    };
    const f = json.features?.[0];
    const [lon, lat] = f?.geometry?.coordinates ?? [];
    if (!f || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    const p = f.properties ?? {};
    const displayName = [p.name, p.city, p.county, p.state, p.country].filter((x, i, a) => x && a.indexOf(x) === i).join(", ") || q;
    return { lat: lat as number, lon: lon as number, displayName };
  } catch (err) {
    console.error("Photon request failed", (err as Error).name);
    return "unavailable";
  }
}

async function geocodeNominatim(q: string): Promise<{ lat: number; lon: number; displayName: string } | null | "unavailable"> {
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
    return Object.fromEntries(SIGNALS.map((s, i) => [s, Number(counts[i]!.tags?.total ?? 0) || 0])) as unknown as PlaceCounts;
  } catch (err) {
    console.error("Overpass request failed", (err as Error).name);
    return null;
  }
}

function normaliseCounts(raw: unknown): PlaceCounts {
  const r = (raw ?? {}) as Record<string, unknown>;
  return Object.fromEntries(SIGNALS.map((s) => [s, Math.max(0, Number(r[s]) || 0)])) as unknown as PlaceCounts;
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

// ---------------------------------------------------------------------------
// Plan B: hospitals with an emergency department near a place
// ---------------------------------------------------------------------------
//
// Plan B does its own small lookup (find the place, then one hospital query) instead of reusing
// Visit before you book's big counting query: a hospital card shouldn't fail because counting
// playgrounds timed out. Results are cached in their own table for 30 days.

/** The main Overpass server first, then public mirrors listed on the OpenStreetMap wiki. */
const OVERPASS_SERVERS = [
  OVERPASS,
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

export interface NearbyHospital {
  name: string;
  /** Street address as mapped, if OpenStreetMap has one. */
  address: string | null;
  lat: number;
  lon: number;
  /** Straight-line distance from the place's centre. */
  km: number;
}

export interface HospitalPlace {
  query: string;
  displayName: string;
  lat: number;
  lon: number;
}

export type HospitalLookup =
  | { ok: true; place: HospitalPlace; hospitals: NearbyHospital[] | null; fetchedAt: string }
  | { ok: false; reason: "not_found" | "unavailable" | "invalid" };

/** How far we look. Islands are small, but rural hotels can be a long way from a town. */
const HOSPITAL_RADIUS_M = 40_000;

/** Overpass: hospitals mapped as having an emergency department, with their names and addresses. */
export function hospitalQuery(lat: number, lon: number): string {
  const at = `${lat.toFixed(5)},${lon.toFixed(5)}`;
  return `[out:json][timeout:20];\nnwr["amenity"="hospital"]["emergency"="yes"](around:${HOSPITAL_RADIUS_M},${at});\nout tags center 40;`;
}

function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLon = rad(bLon - aLon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

type OverpassHospital = {
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

/** The three closest, from an Overpass answer. Exported for tests. */
export function pickHospitals(elements: OverpassHospital[], lat: number, lon: number): NearbyHospital[] {
  const seen = new Set<string>();
  const out: NearbyHospital[] = [];
  for (const e of elements) {
    const p = e.center ?? (e.lat != null && e.lon != null ? { lat: e.lat, lon: e.lon } : null);
    const t = e.tags ?? {};
    const name = (t["name:en"] ?? t.name ?? "").trim();
    if (!p || !name) continue; // an unnamed hospital is no use to a taxi driver
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const street = [t["addr:street"], t["addr:housenumber"]].filter(Boolean).join(" ");
    const town = [t["addr:postcode"], t["addr:city"]].filter(Boolean).join(" ");
    const address = [street, town].filter(Boolean).join(", ") || null;
    out.push({ name: name.slice(0, 120), address: address?.slice(0, 200) ?? null, lat: p.lat, lon: p.lon, km: Math.round(distanceKm(lat, lon, p.lat, p.lon) * 10) / 10 });
  }
  return out.sort((a, b) => a.km - b.km).slice(0, 3);
}

/** One Overpass query, trying the backup servers if the main one is busy. Null if all fail. */
async function overpassJson<T>(query: string, perServerMs: number): Promise<T | null> {
  for (const server of OVERPASS_SERVERS) {
    try {
      const res = await fetch(server, {
        method: "POST",
        headers: { "User-Agent": USER_AGENT, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(perServerMs),
      });
      if (res.ok) return (await res.json()) as T;
      console.error("Overpass", new URL(server).hostname, "returned", res.status);
    } catch (err) {
      console.error("Overpass", new URL(server).hostname, "failed", (err as Error).name);
    }
  }
  return null;
}

/**
 * The place and its nearest hospitals with an emergency department.
 * Cached for 30 days. `allowFetch` = false never touches OpenStreetMap.
 * If the place is found but the hospital query fails, the place still comes back (hospitals null).
 */
export async function hospitalsFor(rawQuery: string, allowFetch: boolean): Promise<HospitalLookup> {
  const key = placeKey(rawQuery);
  if (key.length < 2) return { ok: false, reason: "invalid" };

  const db = supabaseAdmin();
  if (db) {
    const { data } = await db
      .from("hospital_snapshot")
      .select("display_name, lat, lon, hospitals, fetched_at")
      .eq("query_key", key)
      .maybeSingle();
    if (data && Date.now() - Date.parse(data.fetched_at as string) < FRESH_DAYS * 86_400_000) {
      return {
        ok: true,
        place: { query: key, displayName: data.display_name as string, lat: Number(data.lat), lon: Number(data.lon) },
        hospitals: data.hospitals as NearbyHospital[],
        fetchedAt: data.fetched_at as string,
      };
    }
  }
  if (!allowFetch) return { ok: false, reason: "unavailable" };

  const geo = await geocode(key);
  if (geo === "unavailable") return { ok: false, reason: "unavailable" };
  if (!geo) return { ok: false, reason: "not_found" };
  const place: HospitalPlace = { query: key, displayName: geo.displayName, lat: geo.lat, lon: geo.lon };

  const json = await overpassJson<{ elements?: OverpassHospital[] }>(hospitalQuery(geo.lat, geo.lon), 12_000);
  const fetchedAt = new Date().toISOString();
  if (!json) return { ok: true, place, hospitals: null, fetchedAt };

  const hospitals = pickHospitals(json.elements ?? [], geo.lat, geo.lon);
  if (db) {
    const { error } = await db.from("hospital_snapshot").upsert({
      query_key: key,
      display_name: place.displayName.slice(0, 300),
      lat: place.lat,
      lon: place.lon,
      hospitals,
      fetched_at: fetchedAt,
    });
    if (error) console.error("hospital_snapshot save failed:", error.message);
  }
  return { ok: true, place, hospitals, fetchedAt };
}
