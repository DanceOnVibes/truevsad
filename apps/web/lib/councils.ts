/**
 * Suggest a family's council from the FIRST HALF of their postcode (e.g. "SE11"), for School
 * Window. Uses postcodes.io (free, open ONS data). Only the outward code is sent; nothing is stored.
 * Outward codes can cross council borders, so we return every council it covers and the family confirms.
 */

const cache = new Map<string, { at: number; councils: string[] }>();

/** "Bristol, City of" → "Bristol"; "Westminster" → "Westminster". */
function tidyName(name: string): string {
  return name.replace(/,\s*City of$/i, "").replace(/^City of\s+/i, "").trim();
}

export async function councilsForOutcode(outcode: string): Promise<string[] | null> {
  const oc = outcode.trim().toUpperCase();
  if (!/^[A-Z]{1,2}[0-9][A-Z0-9]?$/.test(oc)) return null;
  const hit = cache.get(oc);
  if (hit && Date.now() - hit.at < 7 * 86_400_000) return hit.councils;
  try {
    const res = await fetch(`https://api.postcodes.io/outcodes/${encodeURIComponent(oc)}`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (res.status === 404) return [];
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: { admin_district?: string[]; admin_county?: string[] } };
    // County councils (Kent, Essex, Hampshire, Surrey, Hertfordshire, Lancashire) set term dates for
    // their districts, so the county counts too. Unitary areas have no county ("(pseudo) …", never matched).
    const names = [...(data.result?.admin_district ?? []), ...(data.result?.admin_county ?? [])];
    const councils = [...new Set(names.map(tidyName))];
    cache.set(oc, { at: Date.now(), councils });
    return councils;
  } catch {
    return null;
  }
}

/** Councils we hold school dates for, matched loosely ("Bristol" ↔ "Bristol, City of"). */
export function matchSupported(found: string[], supported: string[]): string[] {
  const norm = (s: string) => tidyName(s).toLowerCase();
  const set = new Map(supported.map((s) => [norm(s), s]));
  return found.map((f) => set.get(norm(f))).filter((x): x is string => Boolean(x));
}
