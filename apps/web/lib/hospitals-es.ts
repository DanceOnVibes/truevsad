import { islandAt } from "@truevsad/true-cost";
import data from "./hospitals-es.json";

/**
 * Spain's general hospitals, from the Ministry of Health's official catalogue (map positions from
 * Eurostat's copy of the same catalogue). Built by scripts/import-hospitals-es.py, refreshed yearly.
 * The catalogue doesn't record emergency departments, so the card never claims one.
 */
export interface OfficialHospital {
  ccn: string;
  name: string;
  address: string;
  postcode: string;
  town: string;
  public: boolean;
  runBy: string;
  beds: number;
  lat: number;
  lon: number;
}

export const HOSPITALS_ES = data as {
  source: string;
  sourceUrl: string;
  positionsUrl: string;
  asOf: string;
  hospitals: OfficialHospital[];
};

function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h =
    Math.sin(rad(bLat - aLat) / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(rad(bLon - aLon) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/**
 * The closest general hospitals to a point. On a Canary island, only hospitals on the same island
 * (a family can't drive across the sea); elsewhere, within maxKm.
 */
export function nearestOfficialHospitals(
  lat: number,
  lon: number,
  max = 3,
  maxKm = 60,
): (OfficialHospital & { km: number })[] {
  const island = islandAt(lat, lon)?.name;
  return HOSPITALS_ES.hospitals
    .filter((h) => (island ? islandAt(h.lat, h.lon)?.name === island : true))
    .map((h) => ({ ...h, km: Math.round(distanceKm(lat, lon, h.lat, h.lon) * 10) / 10 }))
    .filter((h) => island || h.km <= maxKm)
    .sort((a, b) => a.km - b.km)
    .slice(0, max);
}
