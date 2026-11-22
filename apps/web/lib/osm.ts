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
/** Saved counts are deleted after 90 days (purge_old_data); until then an old one beats an error. */
const KEEP_DAYS = 90;
/** The nightly job re-counts a popular resort once its count is this old. */
const REFRESH_AFTER_DAYS = 25;
/** Two searches this close (e.g. "Costa Adeje" and "Costa Adeje, Tenerife") share one count. */
const NEAR_M = 600;
/** How long one map server gets: a family's page can't wait long, the nightly job can. */
const LIVE_SERVER_MS = 20_000;
const CRON_SERVER_MS = 75_000;

/** Visit and Plan B pages may run for 45 seconds; we stop asking OpenStreetMap well before that. */
const PAGE_BUDGET_MS = 36_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Nominatim's usage policy allows one request a second from the whole site, not per server.
 * Every server takes its turn through one shared counter in our database. If no turn comes
 * up in time, the caller uses its backup instead of queueing a family's page.
 */
async function nominatimTurn(waitMs: number): Promise<boolean> {
  const db = supabaseAdmin();
  if (!db) return true; // a developer's computer: no shared counter, and only one person using it
  const until = Date.now() + waitMs;
  for (;;) {
    const { data, error } = await db.rpc("hit_rate_limit", { p_bucket: "osm:nominatim", p_max: 1, p_window_seconds: 1 });
    if (error) {
      console.error("Nominatim turn check failed:", error.message);
      return false; // can't be sure it's our turn, so don't ask Nominatim
    }
    if (data === true) return true;
    if (Date.now() + 350 > until) return false;
    await sleep(350);
  }
}

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

/**
 * Saved counts and hospitals are stored under GEO_VERSION + key. Bump it when the way we find a
 * place changes, so places found the old way are looked up again (old rows are purged at 90 days).
 * g2 (22 Nov 2026): "Alcúdia, Mallorca" had been found as a street in California.
 */
const GEO_VERSION = "g2:";
const stored = (key: string) => GEO_VERSION + key;
const unstored = (k: string) => (k.startsWith(GEO_VERSION) ? k.slice(GEO_VERSION.length) : k.replace(/^g\d+:/, ""));

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

  const saved = await savedByKey(key);
  if (saved && ageDays(saved.fetchedAt) < FRESH_DAYS) return { ok: true, cached: true, place: saved };
  if (!allowFetch) return { ok: false, reason: "unavailable" };
  const deadline = Date.now() + PAGE_BUDGET_MS;

  const geo = await geocode(key);
  if (geo === "unavailable") return saved ? { ok: true, cached: true, place: saved } : { ok: false, reason: "unavailable" };
  if (!geo) return saved ? { ok: true, cached: true, place: saved } : { ok: false, reason: "not_found" };

  // The same spot saved under another name ("costa adeje" vs "costa adeje, tenerife", or a place
  // the nightly job checked): use that count instead of asking the busy map servers again.
  const near = await savedNear(geo.lat, geo.lon, FRESH_DAYS);
  if (near) {
    await saveSnapshot({ ...near, query: key });
    return { ok: true, cached: true, place: near };
  }

  const counts = await countAround(geo.lat, geo.lon, deadline, LIVE_SERVER_MS);
  if (!counts) {
    // The map servers are busy. An older saved count (it shows its date) beats an error.
    const older = saved ?? (await savedNear(geo.lat, geo.lon, KEEP_DAYS));
    return older ? { ok: true, cached: true, place: older } : { ok: false, reason: "unavailable" };
  }
  const place: PlaceSnapshot = { query: key, displayName: geo.displayName, lat: geo.lat, lon: geo.lon, counts, fetchedAt: new Date().toISOString() };
  await saveSnapshot(place);
  return { ok: true, cached: false, place };
}

/**
 * The nightly job (api/cron/places): count a popular resort ahead of time, with far more patience
 * than a family's page can have, so the page answers from the saved count.
 */
export async function refreshPlace(rawQuery: string, deadline: number): Promise<"fresh" | "saved" | "not_found" | "unavailable"> {
  const key = placeKey(rawQuery);
  const saved = await savedByKey(key);
  if (saved && ageDays(saved.fetchedAt) < REFRESH_AFTER_DAYS) return "fresh";
  const geo = await geocode(key);
  if (geo === "unavailable") return "unavailable";
  if (!geo) return "not_found";
  const near = await savedNear(geo.lat, geo.lon, REFRESH_AFTER_DAYS);
  if (near) {
    await saveSnapshot({ ...near, query: key });
    return "fresh";
  }
  const counts = await countAround(geo.lat, geo.lon, deadline, CRON_SERVER_MS);
  if (!counts) return "unavailable";
  await saveSnapshot({ query: key, displayName: geo.displayName, lat: geo.lat, lon: geo.lon, counts, fetchedAt: new Date().toISOString() });
  return "saved";
}

const ageDays = (iso: string) => (Date.now() - Date.parse(iso)) / 86_400_000;

function rowToSnapshot(query: string, d: Record<string, unknown>): PlaceSnapshot {
  return {
    query,
    displayName: d.display_name as string,
    lat: Number(d.lat),
    lon: Number(d.lon),
    counts: normaliseCounts(d.counts),
    fetchedAt: d.fetched_at as string,
  };
}

async function savedByKey(key: string): Promise<PlaceSnapshot | null> {
  const db = supabaseAdmin();
  if (!db) return null;
  const { data } = await db.from("place_snapshot").select("display_name, lat, lon, counts, fetched_at").eq("query_key", stored(key)).maybeSingle();
  return data ? rowToSnapshot(key, data) : null;
}

/** The newest saved count within NEAR_M of this spot, no older than maxDays. */
async function savedNear(lat: number, lon: number, maxDays: number): Promise<PlaceSnapshot | null> {
  const db = supabaseAdmin();
  if (!db) return null;
  const dLat = NEAR_M / 111_320;
  const dLon = dLat / Math.max(0.2, Math.cos((lat * Math.PI) / 180));
  const { data, error } = await db
    .from("place_snapshot")
    .select("query_key, display_name, lat, lon, counts, fetched_at")
    .gte("lat", lat - dLat)
    .lte("lat", lat + dLat)
    .gte("lon", lon - dLon)
    .lte("lon", lon + dLon)
    .gte("fetched_at", new Date(Date.now() - maxDays * 86_400_000).toISOString())
    .order("fetched_at", { ascending: false })
    .limit(10);
  if (error || !data) return null;
  const hit = data
    .map((d) => ({ d, m: metresBetween(lat, lon, Number(d.lat), Number(d.lon)) }))
    .filter((x) => x.m <= NEAR_M)
    .sort((a, b) => a.m - b.m)[0];
  return hit ? rowToSnapshot(unstored(hit.d.query_key as string), hit.d) : null;
}

async function saveSnapshot(p: PlaceSnapshot): Promise<void> {
  const db = supabaseAdmin();
  if (!db) return;
  const { error } = await db.from("place_snapshot").upsert({
    query_key: stored(p.query),
    display_name: p.displayName.slice(0, 300),
    lat: p.lat,
    lon: p.lon,
    counts: p.counts,
    fetched_at: p.fetchedAt,
  });
  if (error) console.error("place_snapshot save failed:", error.message);
}

function metresBetween(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

type Geo = { lat: number; lon: number; displayName: string };
type Candidate = Geo & { isPlace: boolean };

/** A town, village, resort area or island, rather than a street, shop or hotel that shares its name. */
const PLACE_CLASSES = new Set(["place", "boundary"]);
/** "Town, island" should land within this distance of the island or region typed after the comma. */
const CONTEXT_KM = 150;

const fold = (t: string) => t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/**
 * Find a place: OpenStreetMap's Nominatim first, then Photon (komoot's search over the same
 * OpenStreetMap data) only if Nominatim doesn't answer. "Not found" from Nominatim is final.
 *
 * Nominatim's first answer can be a street, shop or hotel that merely carries the name: "Alcúdia,
 * Mallorca" was a street in a California estate called Mallorca, "Puerto Rico, Gran Canaria" was in
 * the Caribbean. Plan B then built a card for the wrong country. So a "town, region" search must
 * end on a town, village or area that lies within 150 km of the region typed; if no answer does,
 * we say "not found" (the page asks for the region or country) rather than guess.
 */
async function geocode(q: string): Promise<Geo | null | "unavailable"> {
  const main = await geocodeNominatim(q);
  if (main !== "unavailable") return main;
  return geocodePhoton(q);
}

async function geocodeNominatim(q: string): Promise<Geo | null | "unavailable"> {
  const first = await nominatimSearch(q, 5);
  if (first === "unavailable") return "unavailable";
  const parts = q.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) {
    // A single name: prefer a town or area over a street with the same name.
    const pick = first.find((c) => c.isPlace) ?? first[0];
    return pick ? strip(pick) : null;
  }
  const town = parts[0]!;
  const context = parts.slice(1).join(", ");
  const contextWords = fold(context).split(/[\s,]+/).filter((w) => w.length > 2);
  const top = first[0];
  // The usual case, answered at once: a town or area whose address names the region typed.
  if (top?.isPlace && contextWords.every((w) => fold(top.displayName).includes(w))) return strip(top);

  // Otherwise place the region, then take the nearest town or area of that name around it.
  const ctx = await nominatimSearch(context, 1);
  // Can't check the region now: trust only a town or area, never a street or shop.
  if (ctx === "unavailable") return top?.isPlace ? strip(top) : "unavailable";
  const anchor = ctx[0];
  if (!anchor) return top?.isPlace ? strip(top) : null;
  const country = lastPart(anchor.displayName);
  // A country typed after the comma ("İçmeler, Turkey") is matched by country, since a big
  // country's centre can be far from its resorts; an island or region by distance.
  const contextIsCountry = !anchor.displayName.includes(",");
  const more = await nominatimSearch(town, 10);
  const more2 = !contextIsCountry && country ? await nominatimSearch(`${town}, ${country}`, 10) : [];
  const pool = [...first, ...(more === "unavailable" ? [] : more), ...(more2 === "unavailable" ? [] : more2)];
  const near = pool
    .map((c) => ({ c, km: metresBetween(anchor.lat, anchor.lon, c.lat, c.lon) / 1000 }))
    .filter((x) => (contextIsCountry ? lastPart(x.c.displayName) === country : x.km <= CONTEXT_KM))
    .sort((a, b) => Number(b.c.isPlace) - Number(a.c.isPlace) || a.km - b.km);
  return near[0] ? strip(near[0].c) : null;
}

const lastPart = (displayName: string) => displayName.split(",").pop()?.trim() ?? "";
const strip = (c: Candidate): Geo => ({ lat: c.lat, lon: c.lon, displayName: c.displayName });

async function nominatimSearch(q: string, limit: number): Promise<Candidate[] | "unavailable"> {
  if (!(await nominatimTurn(2_500))) return "unavailable"; // busy: Photon answers instead
  const url = `${NOMINATIM}?${new URLSearchParams({ q, format: "jsonv2", limit: String(limit), "accept-language": "en" })}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Referer: "https://truevsad.co.uk/" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      console.error("Nominatim returned", res.status);
      return "unavailable";
    }
    const list = (await res.json()) as { lat?: string; lon?: string; display_name?: string; category?: string }[];
    return list
      .map((h) => ({
        lat: Number(h.lat),
        lon: Number(h.lon),
        displayName: String(h.display_name ?? q),
        isPlace: PLACE_CLASSES.has(String(h.category)),
      }))
      .filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lon));
  } catch (err) {
    console.error("Nominatim request failed", (err as Error).name);
    return "unavailable";
  }
}

async function geocodePhoton(q: string): Promise<Geo | null | "unavailable"> {
  const url = `https://photon.komoot.io/api/?${new URLSearchParams({ q, limit: "5", lang: "en" })}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(8_000) });
    if (!res.ok) {
      console.error("Photon returned", res.status);
      return "unavailable";
    }
    const json = (await res.json()) as {
      features?: { geometry?: { coordinates?: [number, number] }; properties?: Record<string, string | undefined> }[];
    };
    // Only a town, village or area: Photon has no region check, so a street of the same name is
    // never trusted here (Plan B must not land in the wrong country).
    const f = json.features?.find((x) => PLACE_CLASSES.has(String(x.properties?.osm_key)));
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

/** One Overpass request that returns one count per signal, in SIGNALS order. */
export function overpassQuery(lat: number, lon: number, serverTimeoutS = 25): string {
  const at = `${lat.toFixed(5)},${lon.toFixed(5)}`;
  const blocks = SIGNALS.map((s) => {
    const r = PLACE_SIGNALS[s].radiusM;
    return `(${SELECTORS[s].map((sel) => `${sel}(around:${r},${at});`).join("")});out count;`;
  });
  return `[out:json][timeout:${serverTimeoutS}];\n${blocks.join("\n")}`;
}

async function countAround(lat: number, lon: number, deadline: number, perServerMs: number): Promise<PlaceCounts | null> {
  // The main server gets most of the time; a backup gets whatever is left before the deadline.
  const json = await overpassJson<{ elements?: { type: string; tags?: { total?: string } }[] }>(
    overpassQuery(lat, lon, Math.max(25, Math.floor(perServerMs / 1000) - 5)),
    perServerMs,
    OVERPASS_SERVERS.length,
    deadline,
  );
  if (!json) return null;
  const counts = (json.elements ?? []).filter((e) => e.type === "count");
  if (counts.length !== SIGNALS.length) return null;
  return Object.fromEntries(SIGNALS.map((s, i) => [s, Number(counts[i]!.tags?.total ?? 0) || 0])) as unknown as PlaceCounts;
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
  return out.sort((a, b) => a.km - b.km).slice(0, 8); // the page keeps the closest 3 on the same island
}

/** One Overpass query, trying the backup servers if the main one is busy. Null if all fail. */
async function overpassJson<T>(
  query: string,
  perServerMs: number,
  maxServers = OVERPASS_SERVERS.length,
  deadline = Number.POSITIVE_INFINITY,
): Promise<T | null> {
  for (const server of OVERPASS_SERVERS.slice(0, maxServers)) {
    const ms = Math.min(perServerMs, deadline - Date.now());
    if (ms < 3_000) break; // not enough time left for an answer: the page says "try again"
    try {
      const res = await fetch(server, {
        method: "POST",
        headers: { "User-Agent": USER_AGENT, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(ms),
      });
      if (res.ok) return (await res.json()) as T;
      console.error("Overpass", new URL(server).hostname, "returned", res.status);
    } catch (err) {
      console.error("Overpass", new URL(server).hostname, "failed", (err as Error).name);
    }
  }
  return null;
}

type NominatimPlace = {
  lat?: string;
  lon?: string;
  name?: string;
  category?: string;
  type?: string;
  extratags?: Record<string, string> | null;
  address?: Record<string, string> | null;
};

/**
 * Hospitals from a Nominatim answer: only places mapped as a hospital AND tagged
 * emergency=yes, so we never call a hospital an emergency department when the map doesn't.
 * Exported for tests.
 */
export function pickNominatimHospitals(list: NominatimPlace[], lat: number, lon: number): NearbyHospital[] {
  const elements: OverpassHospital[] = list
    .filter((p) => p.category === "amenity" && p.type === "hospital" && p.extratags?.emergency === "yes")
    .map((p) => {
      const a = p.address ?? {};
      return {
        lat: Number(p.lat),
        lon: Number(p.lon),
        tags: Object.fromEntries(
          Object.entries({
            name: p.name ?? "",
            "addr:street": a.road,
            "addr:housenumber": a.house_number,
            "addr:postcode": a.postcode,
            "addr:city": a.city ?? a.town ?? a.village ?? a.municipality,
          }).filter(([, v]) => v),
        ) as Record<string, string>,
      };
    })
    .filter((e) => Number.isFinite(e.lat) && Number.isFinite(e.lon));
  return pickHospitals(elements, lat, lon);
}

/** Hospitals within about 40 km, from Nominatim's search. Null if Nominatim doesn't answer. */
async function nominatimHospitals(lat: number, lon: number): Promise<NearbyHospital[] | null> {
  if (!(await nominatimTurn(3_000))) return null; // busy: the Overpass backup answers instead
  const dLat = 0.36; // about 40 km
  const dLon = 0.45;
  const url = `${NOMINATIM}?${new URLSearchParams({
    q: "hospital",
    format: "jsonv2",
    viewbox: `${(lon - dLon).toFixed(4)},${(lat + dLat).toFixed(4)},${(lon + dLon).toFixed(4)},${(lat - dLat).toFixed(4)}`,
    bounded: "1",
    limit: "40",
    extratags: "1",
    addressdetails: "1",
    "accept-language": "en",
  })}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Referer: "https://truevsad.co.uk/" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error("Nominatim (hospitals) returned", res.status);
      return null;
    }
    return pickNominatimHospitals((await res.json()) as NominatimPlace[], lat, lon);
  } catch (err) {
    console.error("Nominatim (hospitals) request failed", (err as Error).name);
    return null;
  }
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
      .eq("query_key", stored(key))
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
  const deadline = Date.now() + PAGE_BUDGET_MS;

  const geo = await geocode(key);
  if (geo === "unavailable") return { ok: false, reason: "unavailable" };
  if (!geo) return { ok: false, reason: "not_found" };
  const place: HospitalPlace = { query: key, displayName: geo.displayName, lat: geo.lat, lon: geo.lon };

  // Nominatim first: it answers our servers reliably. Overpass (often too slow for cloud
  // servers) only as a backup, with a short wait so the page still loads in time.
  // Nominatim's limit (one request a second, site-wide) is kept by nominatimTurn().
  let hospitals = await nominatimHospitals(geo.lat, geo.lon);
  if (hospitals === null) {
    const json = await overpassJson<{ elements?: OverpassHospital[] }>(hospitalQuery(geo.lat, geo.lon), 7_000, 2, deadline);
    hospitals = json ? pickHospitals(json.elements ?? [], geo.lat, geo.lon) : null;
  }
  const fetchedAt = new Date().toISOString();
  if (!hospitals) return { ok: true, place, hospitals: null, fetchedAt };

  if (db) {
    const { error } = await db.from("hospital_snapshot").upsert({
      query_key: stored(key),
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
