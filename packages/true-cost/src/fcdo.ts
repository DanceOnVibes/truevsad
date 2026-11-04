/**
 * Plan B, layer 1: every country, from the FCDO's own travel advice on GOV.UK.
 *
 * The site fetches each country's guide from the GOV.UK Content API once a day (public, no key,
 * reusable under the Open Government Licence v3.0 with credit to GOV.UK). This file only reads what
 * the FCDO publishes; it never adds anything of its own:
 *  - the emergency numbers, exactly as the FCDO lists them
 *  - the natural hazards the FCDO flags for that country, in its own words
 *  - whether the FCDO advises against travel to all or part of the country
 *
 * Emergency numbers also get a second check by people (our research, two sources). Until a
 * country's numbers are double-checked, the card says so.
 */

export const FCDO_API = "https://www.gov.uk/api/content";
export const FCDO_WEB = "https://www.gov.uk/foreign-travel-advice";
export const FCDO_LICENCE = "Contains public sector information licensed under the Open Government Licence v3.0.";

export interface FcdoCountryRef {
  slug: string;
  name: string;
  synonyms: string[];
  /** When the FCDO last changed the guide, from the index. Null if the index doesn't say. */
  updatedAt: string | null;
}

export interface FcdoNumber {
  service: string;
  number: string;
}

export interface FcdoHazard {
  title: string;
  text: string;
}

export type FcdoAlert =
  | "avoid_all_but_essential_travel_to_parts"
  | "avoid_all_travel_to_parts"
  | "avoid_all_but_essential_travel_to_whole_country"
  | "avoid_all_travel_to_whole_country";

export interface FcdoAdvice {
  slug: string;
  name: string;
  synonyms: string[];
  updatedAt: string | null;
  url: string;
  alertStatus: string[];
  /** The FCDO's "Emergency services" text and the numbers in it. Null if the guide has none. */
  emergency: { text: string; numbers: FcdoNumber[] } | null;
  hazards: FcdoHazard[];
}

/** What each FCDO travel alert means, in the FCDO's terms. */
export const FCDO_ALERT_TEXT: Record<FcdoAlert, string> = {
  avoid_all_but_essential_travel_to_parts: "The FCDO advises against all but essential travel to parts of this country.",
  avoid_all_travel_to_parts: "The FCDO advises against all travel to parts of this country.",
  avoid_all_but_essential_travel_to_whole_country: "The FCDO advises against all but essential travel to this whole country.",
  avoid_all_travel_to_whole_country: "The FCDO advises against all travel to this whole country.",
};

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“",
  ndash: "–", mdash: "—", hellip: "…", pound: "£", euro: "€",
};

/** HTML to plain text: tags out, entities decoded, whitespace tidied, one line per block. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|h[1-6]|div|tr)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n: string) => ENTITIES[n.toLowerCase()] ?? m)
    .split("\n")
    .map((l) => l.replace(/[ \t ]+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

interface Section {
  level: number;
  title: string;
  html: string;
}

/** Split HTML at its h2–h4 headings. Text before the first heading is a level-9 section with no title. */
export function sections(html: string): Section[] {
  const out: Section[] = [];
  const re = /<h([2-4])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let last = 0;
  let current: Section = { level: 9, title: "", html: "" };
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    current.html = html.slice(last, m.index);
    out.push(current);
    current = { level: Number(m[1]), title: htmlToText(m[2] ?? ""), html: "" };
    last = re.lastIndex;
  }
  current.html = html.slice(last);
  out.push(current);
  return out.filter((s) => s.title || s.html.trim());
}

/** A section's own text plus everything under it, up to the next heading at the same level or higher. */
function withChildren(all: Section[], i: number): Section[] {
  const head = all[i]!;
  const kids: Section[] = [];
  for (let j = i + 1; j < all.length; j++) {
    if (all[j]!.level <= head.level) break;
    kids.push(all[j]!);
  }
  return kids;
}

const SERVICE = /^([A-Za-z][A-Za-z ()'’,/&-]{1,48}?)\s*[:–—-]\s*(\d{2,6})((?:\s*(?:,|or|\/)\s*\d{2,6})*)/;

/** Bump when the reader changes, so the daily job re-reads every country with the new version. */
export const FCDO_PARSER_VERSION = 2;

/**
 * "Ambulance: 1669" lines → numbers. Also "Ambulance, fire and police: 112", and "112 or 999" as two.
 * "Telephone: 191 (ambulance, fire, police)" takes its name from the brackets: "Ambulance, fire, police".
 * A number the FCDO repeats further down (e.g. "Police: 191") is shown once, under its first name.
 *
 * All or nothing: if any line holds a number we can't take apart safely (a full international
 * number, or a heading with the numbers in bullet points below it), we return nothing, and the
 * card shows the FCDO's own text word for word instead of a list that could be incomplete.
 */
export function numbersIn(text: string): FcdoNumber[] {
  const out: FcdoNumber[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.replace(/^•\s*/, "").trim();
    if (/\+\d/.test(line) || /^[A-Za-z][A-Za-z ()'’,/&-]{1,48}:\s*$/.test(line)) return [];
    const m = SERVICE.exec(line);
    if (!m) continue;
    const rest = line.slice(m[0].length).trim();
    if (/^\(?\d/.test(rest)) return [];
    let service = m[1]!.trim();
    const brackets = /^\(([^)]{3,60})\)/.exec(rest);
    if (/^(telephone|tel|phone|call)$/i.test(service)) {
      if (!brackets) return [];
      const named = brackets[1]!.trim();
      service = named.charAt(0).toUpperCase() + named.slice(1);
    }
    const all = [m[2]!, ...(m[3] ?? "").split(/,|or|\//).map((x) => x.trim())].filter((x) => /^\d{2,6}$/.test(x));
    for (const number of all) {
      if (out.some((n) => n.number === number)) continue;
      out.push({ service, number });
    }
  }
  return out;
}

type Part = { slug?: string; title?: string; body?: unknown };

/** A part's body is an HTML string, or (in some API versions) a list of content types. */
function partHtml(p: Part): string {
  if (typeof p.body === "string") return p.body;
  if (Array.isArray(p.body)) {
    const html = (p.body as { content_type?: string; content?: string }[]).find((b) => b.content_type === "text/html");
    return html?.content ?? "";
  }
  return "";
}

/** Read one country's guide from the Content API's JSON. Returns null if it isn't a travel advice guide. */
export function parseTravelAdvice(json: unknown): FcdoAdvice | null {
  const j = json as {
    base_path?: string;
    title?: string;
    document_type?: string;
    public_updated_at?: string;
    details?: { country?: { name?: string; slug?: string; synonyms?: string[] }; alert_status?: string[]; parts?: Part[] };
  };
  if (!j || j.document_type !== "travel_advice" || !j.base_path?.startsWith("/foreign-travel-advice/")) return null;
  const slug = j.details?.country?.slug ?? j.base_path.split("/").pop() ?? "";
  const name = j.details?.country?.name ?? (j.title ?? "").replace(/\s+travel advice$/i, "");
  if (!slug || !name) return null;
  const parts = j.details?.parts ?? [];

  let emergency: FcdoAdvice["emergency"] = null;
  const hazards: FcdoHazard[] = [];
  for (const p of parts) {
    const all = sections(partHtml(p));
    all.forEach((s, i) => {
      if (!emergency && /^emergency services\b/i.test(s.title)) {
        const text = htmlToText([s, ...withChildren(all, i)].map((x) => x.html).join("\n"));
        if (text) emergency = { text: text.slice(0, 800), numbers: numbersIn(text) };
      }
      if (!hazards.length && /(extreme weather|natural disasters|natural hazards)/i.test(s.title)) {
        for (const k of withChildren(all, i)) {
          if (k.level !== s.level + 1 || !k.title) continue;
          const text = htmlToText(k.html);
          if (text) hazards.push({ title: k.title, text: text.slice(0, 1200) });
        }
      }
    });
  }

  return {
    slug,
    name,
    synonyms: j.details?.country?.synonyms ?? [],
    updatedAt: j.public_updated_at ?? null,
    url: `${FCDO_WEB}/${slug}`,
    alertStatus: (j.details?.alert_status ?? []).filter((a) => a in FCDO_ALERT_TEXT),
    emergency,
    hazards,
  };
}

/** Read the index of all guides: one entry per country. */
export function parseTravelAdviceIndex(json: unknown): FcdoCountryRef[] {
  const j = json as {
    links?: {
      children?: {
        base_path?: string;
        title?: string;
        public_updated_at?: string;
        details?: { country?: { name?: string; slug?: string; synonyms?: string[] } };
      }[];
    };
  };
  const out: FcdoCountryRef[] = [];
  for (const c of j?.links?.children ?? []) {
    const slug = c.details?.country?.slug ?? c.base_path?.split("/").pop();
    const name = c.details?.country?.name ?? c.title?.replace(/\s+travel advice$/i, "");
    if (!slug || !name || !c.base_path?.startsWith("/foreign-travel-advice/")) continue;
    out.push({ slug, name, synonyms: c.details?.country?.synonyms ?? [], updatedAt: c.public_updated_at ?? null });
  }
  return out;
}

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Names the map uses that differ from the FCDO's, mapped to the FCDO's slug. */
export const COUNTRY_ALIASES: Record<string, string> = {
  "united states": "usa",
  "united states of america": "usa",
  us: "usa",
  turkiye: "turkey",
  czechia: "czech-republic",
  "korea republic of": "south-korea",
  "republic of korea": "south-korea",
  "cote d ivoire": "cote-d-ivoire",
  "ivory coast": "cote-d-ivoire",
  uae: "united-arab-emirates",
  "people s republic of china": "china",
  "hong kong sar china": "hong-kong",
  "macao sar china": "macao",
  "viet nam": "vietnam",
  "lao people s democratic republic": "laos",
  "russian federation": "russia",
  "bahamas": "bahamas",
  "the netherlands": "netherlands",
  holland: "netherlands",
};

/** Which FCDO guide a country name belongs to (from the map, e.g. "Thailand"), or undefined. */
export function matchFcdoCountry(countryName: string, countries: { slug: string; name: string; synonyms?: string[] }[]): string | undefined {
  const n = norm(countryName);
  if (!n) return undefined;
  const alias = COUNTRY_ALIASES[n];
  if (alias && countries.some((c) => c.slug === alias)) return alias;
  for (const c of countries) {
    if (norm(c.name) === n || norm(c.slug) === n || (c.synonyms ?? []).some((s) => norm(s) === n)) return c.slug;
  }
  return undefined;
}

/** The country at the end of a map name like "Patong, Kathu, Phuket Province, Thailand". */
export function countryFromDisplayName(displayName: string): string {
  const parts = displayName.split(",").map((p) => p.trim()).filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

/** How fresh our copy is. The site refreshes daily; more than 3 days old means refreshing has failed. */
export function fcdoFreshness(fetchedAt: string, now: Date = new Date()): "fresh" | "stale" {
  const t = Date.parse(fetchedAt);
  return Number.isFinite(t) && now.getTime() - t <= 3 * 86_400_000 ? "fresh" : "stale";
}

/** A country's numbers, double-checked by us against two sources. */
export interface VerifiedNumbers {
  slug: string;
  numbers: FcdoNumber[];
  sources: { name: string; url: string }[];
  checkedOn: string;
}

/**
 * Do our double-checked numbers agree with the FCDO's? "agree" only when every number the FCDO
 * lists is among ours. A disagreement is never hidden: the card shows the FCDO's list and says so.
 */
export function compareNumbers(fcdo: FcdoNumber[], verified: VerifiedNumbers | undefined): "agree" | "differ" | "unchecked" {
  if (!verified || !verified.numbers.length) return "unchecked";
  const ours = new Set(verified.numbers.map((n) => n.number.replace(/\D/g, "")));
  return fcdo.length && fcdo.every((n) => ours.has(n.number.replace(/\D/g, ""))) ? "agree" : "differ";
}

/** What a card built from the FCDO's advice does not check, said plainly. */
export const FCDO_NOT_CHECKED = [
  "Live news, weather or outages: in an emergency, call the local emergency number and follow the local authorities.",
  "Hospitals come from the map: they can be out of date, and not every one has an emergency department. Ask your hotel.",
  "How likely any hazard is where you're going: we don't rate places. The FCDO's page and the local authorities have the detail.",
] as const;

/** The first sentences of a hazard, short enough for a card. The full text stays on GOV.UK. */
export function shortHazard(text: string, max = 280): string {
  const flat = text.replace(/\n+/g, " ").replace(/^•\s*/, "").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  return stop > 80 ? cut.slice(0, stop + 1) : `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}
