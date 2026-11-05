/**
 * Which names may be shown in public. Families type the seller and destination themselves, so a
 * typed name never reaches the leaderboard, the deal board or the homepage ticker on its own:
 *
 *   - a seller is shown only once its name is on the approved list (public_name table);
 *   - a place is shown only as a real place name we recognise inside what was typed
 *     ("Muthu La Perla Tenerife" → "Tenerife"), never the hotel; anything we don't recognise
 *     waits for a person to approve it.
 *
 * No database access here, so it can be tested on its own.
 */

/** "Jet2holidays.com", "jet2 holidays" → "jet2holidays": one leaderboard row per seller. */
export function sellerKey(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\b(www|com|co|uk|ltd|limited)\b/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

/** "Golden Donaire Beach, Tarragona, Spain" → "tarragona spain": town/region + country, without the hotel. */
export function placeKey(destination: string): string {
  const parts = destination.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
  return (parts.length >= 3 ? parts.slice(-2) : parts.length === 2 ? parts : parts.slice(0, 1)).join(" ");
}

/** The same place without the hotel, keeping the family's spelling: what a reviewer sees. */
export function placeLabel(destination: string): string {
  const parts = destination.split(",").map((x) => x.trim()).filter(Boolean);
  return (parts.length >= 3 ? parts.slice(-2) : parts.length === 2 ? parts : parts.slice(0, 1)).join(", ").slice(0, 80);
}

/** Lower case, no accents, words separated by single spaces. */
export function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Popular UK holiday places that have no fee rule of their own (places with a fee rule are
 * known already). Only real place names: a match must be whole words.
 */
export const EXTRA_PLACES = [
  "Tenerife", "Lanzarote", "Gran Canaria", "Fuerteventura", "La Palma", "La Gomera", "Canary Islands", "Canaries",
  "Costa del Sol", "Costa Blanca", "Costa Calida", "Costa de la Luz", "Costa Almeria", "Benidorm", "Malaga", "Marbella",
  "Torremolinos", "Fuengirola", "Benalmadena", "Nerja", "Alicante", "Albir", "Calpe", "Javea", "Torrevieja", "Seville",
  "Madrid", "Valencia", "Granada", "Cadiz", "Almeria", "Murcia", "Playa de las Americas", "Los Cristianos", "Costa Adeje",
  "Puerto de la Cruz", "Puerto del Carmen", "Playa Blanca", "Costa Teguise", "Maspalomas", "Playa del Ingles",
  "Puerto Rico de Gran Canaria", "Corralejo", "Caleta de Fuste", "Madeira", "Funchal", "Azores", "Porto Santo",
  "Antalya", "Belek", "Alanya", "Kemer", "Bodrum", "Dalaman", "Marmaris", "Fethiye", "Olu Deniz", "Oludeniz", "Kusadasi",
  "Didim", "Icmeler", "Istanbul", "Cyprus", "Paphos", "Ayia Napa", "Protaras", "Larnaca", "Limassol", "Polis",
  "Cancun", "Riviera Maya", "Playa del Carmen", "Tulum", "Punta Cana", "Puerto Plata", "Montego Bay", "Negril",
  "Ocho Rios", "Barbados", "St Lucia", "Saint Lucia", "Antigua", "Grenada", "Tobago", "Aruba", "Cuba", "Varadero",
  "Dubai", "Abu Dhabi", "Ras Al Khaimah", "Oman", "Muscat", "Doha", "Phuket", "Bangkok", "Krabi", "Koh Samui",
  "Khao Lak", "Pattaya", "Chiang Mai", "Bali", "Maldives", "Mauritius", "Seychelles", "Sri Lanka", "Goa", "Kerala",
  "Sharm el Sheikh", "Marrakech", "Agadir", "Lake Garda", "Sorrento", "Amalfi Coast", "Sicily", "Sardinia", "Naples",
  "Milan", "Puglia", "Tuscany", "Disneyland Paris", "Nice", "Cannes", "Amsterdam", "Prague", "Budapest", "Krakow",
  "Reykjavik", "Lapland", "Rovaniemi", "Halkidiki", "Paxos", "Kalkan", "Lake Bled", "Montenegro", "Budva",
  "Kotor", "Albania", "Saranda", "Tunisia", "Hammamet", "Sousse", "Djerba", "Bulgaria", "Sunny Beach", "Bansko",
  "Andorra", "Austria", "Tyrol", "Swiss Alps", "Les Deux Alpes", "Val Thorens", "Tignes", "Chamonix",
] as const;

/**
 * The real place name inside what a family typed, or null. Prefers the most specific
 * place (a town over a country, the longer name over the shorter). Very short names
 * ("Kos", "Sal", "Vis") only count when they are a whole comma-separated part, so a
 * hotel called "Vis a Vis" is never taken for the island of Vis.
 */
export function knownPlaceIn(destination: string, places: Iterable<string>, countries: Iterable<string> = []): string | null {
  const parts = destination.split(",").map(fold).filter(Boolean);
  const whole = ` ${parts.join(" ")} `;
  const countrySet = new Set([...countries].map(fold));
  let best: { name: string; country: boolean; len: number } | null = null;
  const consider = (name: string, isCountry: boolean) => {
    const f = fold(name);
    if (!f) return;
    const hit = f.length < 4 ? parts.includes(f) : whole.includes(` ${f} `);
    if (!hit) return;
    const cand = { name, country: isCountry || countrySet.has(f), len: f.length };
    if (!best || (best.country && !cand.country) || (best.country === cand.country && cand.len > best.len)) best = cand;
  };
  for (const p of places) consider(p, false);
  for (const c of countries) consider(c, true);
  return best ? (best as { name: string }).name : null;
}
