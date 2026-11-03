import { mentions } from "./scope";

/**
 * Plan B — what a family needs when something goes wrong on holiday: the power is out, the
 * signal is going and the card machine is dead.
 *
 * Three parts:
 *  1. The Plan B card: one page per trip that works offline (built in the family's browser).
 *  2. Good-to-know notes for fragile places: islands whose whole grid has failed recently.
 *  3. "If it goes wrong" on the receipt: what help this kind of booking gives you.
 *
 * Rules (the same as the rest of TrueVsAd):
 *  - Every fact has an official source and a checked date. Our own advice is labelled as advice.
 *  - Nothing here is ever added to a price, a FairMark or the order of deals.
 *  - No live alerts: we don't track outages, storms or news. In an emergency the answer is 112.
 *  - Facts, not fear: "the island lost power on 2 November" is a fact; "unsafe" is a judgement we don't make.
 *
 * First country: Spain, including the Canary and Balearic Islands.
 */

export type BookingType = "package" | "separate";

/** The FCDO's 24-hour line in London, for family back home. */
export const FCDO_LONDON = {
  phone: "+44 (0)20 7008 5000",
  text: "The Foreign Office's 24-hour line in London. Choose 'Consular services for British nationals'.",
  sourceUrl: "https://www.gov.uk/guidance/consular-assistance-how-the-foreign-commonwealth-development-office-provides-support",
  checkedOn: "2026-11-03",
} as const;

/** What consular staff can and can't do, in the FCDO's own terms. */
export const CONSULAR_HELP = {
  can: [
    "Help in an emergency",
    "Get you an emergency travel document if you lose your passport (there's a fee)",
    "Support you if you're in hospital, arrested or a victim of crime",
  ],
  cannot: [
    "Pay your bills or give you money",
    "Give legal advice",
    "Issue a new passport (HM Passport Office does that)",
  ],
  sourceUrl: FCDO_LONDON.sourceUrl,
  checkedOn: "2026-11-03",
} as const;

export interface Sourced {
  text: string;
  sourceUrl: string;
  sourceName: string;
  checkedOn: string;
}

export interface Consulate {
  name: string;
  /** Islands it covers, as GOV.UK lists them. */
  covers: string[];
  address: string;
  /** How to reach it, in GOV.UK's words. */
  contact: string;
  sourceUrl: string;
  checkedOn: string;
}

export interface Island {
  name: string;
  /** Resort and town names a deal might use instead of the island's name. */
  places: string[];
  consulate: string;
}

export interface FragileEvent {
  /** YYYY-MM-DD */
  date: string;
  /** What happened, as the official source states it. */
  text: string;
  sourceUrl: string;
  sourceName: string;
}

export interface FragilePlace {
  place: string;
  events: FragileEvent[];
  checkedOn: string;
}

export interface PlanBCountry {
  country: string;
  /** ISO 639-1 code for the child card's second language. */
  language: string;
  languageName: string;
  places: string[];
  emergency: { number: string } & Sourced;
  /** What 112 does when your own network has no signal. */
  emergencyNoSignal: Sourced;
  alerts: Sourced;
  /** GOV.UK's "getting help" page for the country. */
  ukHelpUrl: string;
}

const C = "2026-11-03";

export const CONSULATES: Consulate[] = [
  {
    name: "British Consulate Las Palmas de Gran Canaria",
    covers: ["Gran Canaria", "Lanzarote", "Fuerteventura"],
    address: "Calle Luis Morote 6-3º, 35007 Las Palmas de Gran Canaria",
    contact: "Visits by appointment only. For emergencies and enquiries, use the FCDO contact form (24/7).",
    sourceUrl: "https://www.gov.uk/world/organisations/british-consulate-las-palmas-de-gran-canaria",
    checkedOn: C,
  },
  {
    name: "British Consulate Santa Cruz de Tenerife",
    covers: ["Tenerife", "La Palma", "La Gomera", "El Hierro"],
    address: "Plaza Weyler, 8, 1º, 38003 Santa Cruz de Tenerife",
    contact: "Visits by appointment only. For emergencies and enquiries, use the FCDO contact form (24/7).",
    sourceUrl: "https://www.gov.uk/world/organisations/british-consulate-santa-cruz-de-tenerife",
    checkedOn: C,
  },
];

/**
 * Canary Islands, most specific first. "La Palma" must be checked before anything that says
 * "Palma" (Palma de Mallorca), and "San Sebastián de La Gomera" before "San Sebastian".
 */
export const CANARY_ISLANDS: Island[] = [
  {
    name: "La Palma",
    places: ["La Palma", "Santa Cruz de La Palma", "Los Llanos de Aridane", "Puerto Naos", "Los Cancajos", "Tazacorte", "Breña Baja", "Brena Baja", "Fuencaliente"],
    consulate: "British Consulate Santa Cruz de Tenerife",
  },
  {
    name: "La Gomera",
    places: ["La Gomera", "San Sebastián de La Gomera", "San Sebastian de La Gomera", "Valle Gran Rey", "Playa Santiago"],
    consulate: "British Consulate Santa Cruz de Tenerife",
  },
  {
    name: "El Hierro",
    places: ["El Hierro", "La Restinga"],
    consulate: "British Consulate Santa Cruz de Tenerife",
  },
  {
    name: "Tenerife",
    places: [
      "Tenerife", "Playa de las Americas", "Playa de las Américas", "Los Cristianos", "Costa Adeje", "Adeje", "Puerto de la Cruz",
      "Los Gigantes", "Golf del Sur", "El Médano", "El Medano", "Callao Salvaje", "Playa Paraiso", "Puerto de Santiago",
    ],
    consulate: "British Consulate Santa Cruz de Tenerife",
  },
  {
    name: "Gran Canaria",
    places: [
      "Gran Canaria", "Las Palmas", "Maspalomas", "Playa del Ingles", "Playa del Inglés", "Puerto de Mogán",
      "Puerto de Mogan", "Mogán", "Mogan", "Meloneras", "San Agustín", "San Agustin", "Amadores", "Taurito", "Arguineguín", "Arguineguin",
    ],
    consulate: "British Consulate Las Palmas de Gran Canaria",
  },
  {
    name: "Lanzarote",
    places: ["Lanzarote", "La Graciosa", "Playa Blanca", "Puerto del Carmen", "Costa Teguise", "Arrecife", "Puerto Calero", "Teguise", "Yaiza"],
    consulate: "British Consulate Las Palmas de Gran Canaria",
  },
  {
    name: "Fuerteventura",
    places: ["Fuerteventura", "Corralejo", "Caleta de Fuste", "Costa Calma", "Morro Jable", "Jandía", "Jandia", "El Cotillo", "Puerto del Rosario"],
    consulate: "British Consulate Las Palmas de Gran Canaria",
  },
];

export const SPAIN: PlanBCountry = {
  country: "Spain",
  language: "es",
  languageName: "Spanish",
  places: [
    "Spain", "España", "Espana", "Canary Islands", "Canaries", "Islas Canarias", "Balearic Islands", "Balearics",
    "Mallorca", "Majorca", "Menorca", "Minorca", "Ibiza", "Formentera", "Palma de Mallorca", "Magaluf", "Alcudia", "Alcúdia",
    "Santa Ponsa", "Cala d'Or", "Puerto Pollensa", "Port de Pollença", "Cala Millor", "Sa Coma", "Sant Antoni",
    "Playa d'en Bossa", "Costa del Sol", "Costa Blanca", "Costa Brava", "Costa Dorada", "Costa Daurada", "Costa Cálida",
    "Costa Calida", "Costa de la Luz", "Costa de Almería", "Costa de Almeria", "Benidorm", "Málaga", "Malaga", "Marbella",
    "Torremolinos", "Fuengirola", "Benalmádena", "Benalmadena", "Nerja", "Estepona", "Puerto Banús", "Puerto Banus",
    "Alicante", "Calpe", "Altea", "Jávea", "Javea", "Dénia", "Denia", "La Manga", "Murcia", "Almería", "Almeria",
    "Roquetas de Mar", "Mojácar", "Mojacar", "Barcelona", "Madrid", "Seville", "Sevilla", "Valencia", "Salou", "Cambrils",
    "La Pineda", "Lloret de Mar", "Tossa de Mar", "Tarragona", "Granada", "Cádiz", "Cadiz", "Bilbao", "Peñíscola", "Peniscola",
    ...CANARY_ISLANDS.flatMap((i) => i.places),
  ],
  emergency: {
    number: "112",
    text: "Call 112 for an ambulance, the fire service or the police.",
    sourceUrl: "https://www.gov.uk/foreign-travel-advice/spain/getting-help",
    sourceName: "GOV.UK",
    checkedOn: C,
  },
  emergencyNoSignal: {
    text: "112 is free and works from a locked phone, a phone without an active SIM, or when your own network has no signal (another network must be in range).",
    sourceUrl: "https://administracion.gob.es/pag_Home/Tu-espacio-europeo/derechos-obligaciones/ciudadanos/asistencia-sanitaria/numeros-urgencia.html",
    sourceName: "Spanish government",
    checkedOn: C,
  },
  alerts: {
    text: "Spain sends emergency warnings to phones in the affected area (ES-Alert). The most serious level can't be switched off, so keep your phone's sound on. The optional levels aren't used in Spain at the moment.",
    sourceUrl: "https://www.incibe.es/ciudadania/blog/alertas-de-proteccion-civil-en-espana-como-funcionan-y-como-configurarlas-en-tu",
    sourceName: "INCIBE (Spanish government cyber-security institute)",
    checkedOn: C,
  },
  ukHelpUrl: "https://www.gov.uk/foreign-travel-advice/spain/getting-help",
};

export const PLAN_B_COUNTRIES: PlanBCountry[] = [SPAIN];

/** A note shows for this many years after the last officially confirmed whole-island cut. */
export const FRAGILE_YEARS = 3;

/**
 * Islands whose whole grid has failed, confirmed by an official body (not only the press).
 * Events older than FRAGILE_YEARS drop off by themselves. Press-only events wait here as comments
 * until an official page confirms them.
 *
 * Waiting for an official source (press only so far):
 *  - Lanzarote and La Graciosa, early October 2026
 *  - La Palma, 10 June 2025
 *  - La Gomera, 18 January 2026
 */
export const FRAGILE_PLACES: FragilePlace[] = [
  {
    place: "La Palma",
    events: [
      {
        date: "2026-11-02",
        text: "The whole island lost power (a “cero energético”). The Canary Islands government ended its emergency-plan alert the same day.",
        sourceUrl: "https://www3.gobiernodecanarias.org/noticias/2026/11/02/",
        sourceName: "Gobierno de Canarias",
      },
    ],
    checkedOn: C,
  },
  {
    place: "La Gomera",
    events: [
      {
        date: "2023-07-30",
        text: "The whole island lost power (a “cero energético”); the next day only 4,145 of 15,313 customers had power back.",
        sourceUrl: "https://www3.gobiernodecanarias.org/noticias/zapata-exige-a-endesa-que-acelere-la-reposicion-electrica-en-la-gomera-y-califica-lo-ocurrido-de-inaceptable/",
        sourceName: "Gobierno de Canarias",
      },
    ],
    checkedOn: C,
  },
];

/** Which Canary island a destination names, if any. */
export function islandFor(destination: string | undefined | null): Island | undefined {
  if (!destination) return undefined;
  return CANARY_ISLANDS.find((i) => i.places.some((p) => mentions(destination, p)));
}

export function countryFor(destination: string | undefined | null): PlanBCountry | undefined {
  if (!destination) return undefined;
  return PLAN_B_COUNTRIES.find((c) => c.places.some((p) => mentions(destination, p)));
}

function addYears(iso: string, years: number): string {
  const [y, m, d] = iso.split("-");
  return `${Number(y) + years}-${m}-${d}`;
}

/** Officially confirmed whole-island cuts in the last FRAGILE_YEARS, newest first. */
export function fragileNoteFor(
  destination: string | undefined | null,
  today: string = new Date().toISOString().slice(0, 10),
): { place: string; events: FragileEvent[]; checkedOn: string } | undefined {
  const island = islandFor(destination);
  if (!island) return undefined;
  const entry = FRAGILE_PLACES.find((f) => f.place === island.name);
  if (!entry) return undefined;
  const events = entry.events
    .filter((e) => e.date <= today && addYears(e.date, FRAGILE_YEARS) > today)
    .sort((a, b) => b.date.localeCompare(a.date));
  return events.length ? { place: entry.place, events, checkedOn: entry.checkedOn } : undefined;
}

export interface PlanB {
  country: PlanBCountry;
  island?: string;
  consulate?: Consulate;
  fragile?: { place: string; events: FragileEvent[]; checkedOn: string };
}

/** Everything Plan B knows about a destination, or undefined if we don't cover that country yet. */
export function planBFor(destination: string | undefined | null, today?: string): PlanB | undefined {
  const country = countryFor(destination);
  if (!country) return undefined;
  const island = islandFor(destination);
  const consulate = island ? CONSULATES.find((c) => c.name === island.consulate) : undefined;
  return { country, island: island?.name, consulate, fragile: fragileNoteFor(destination, today) };
}

// ---------------------------------------------------------------------------
// Part 3: "If it goes wrong", on the receipt
// ---------------------------------------------------------------------------

export interface HelpLine {
  heading: string;
  text: string;
  sourceName: string;
  sourceUrl: string;
}

export const PACKAGE_HELP: HelpLine = {
  heading: "This is a package",
  text: "If you're in difficulty on the trip, the organiser must give you appropriate help without undue delay: information on health services, local authorities and consular help, help contacting home, and help finding other travel. It can only charge if you caused the problem yourself, on purpose or through negligence, and then no more than its actual costs.",
  sourceName: "Package Travel Regulations 2018, regulation 18",
  sourceUrl: "https://www.legislation.gov.uk/uksi/2018/634/regulation/18",
};

export const SEPARATE_HELP: HelpLine = {
  heading: "Flight and stay booked separately",
  text: "The duty to help you on the trip (regulation 18) is part of a package contract, so no single company has to help you with the whole holiday. Each company's duties are in its own terms.",
  sourceName: "Package Travel Regulations 2018, regulation 18",
  sourceUrl: "https://www.legislation.gov.uk/uksi/2018/634/regulation/18",
};

export const FLIGHT_DELAY_HELP: HelpLine = {
  heading: "If your flight is delayed",
  text: "On flights covered by UK rules, such as your flight out of the UK, the airline must look after you whatever the reason for the delay: food and drink, two phone calls or emails, and a hotel with transport if you're stuck overnight. Compensation is different: airlines don't have to pay it for “extraordinary circumstances”.",
  sourceName: "Civil Aviation Authority",
  sourceUrl: "https://www.caa.co.uk/air-passengers/travel-problems-and-rights/delays-and-cancellations/delays/",
};

export const HELP_CHECKED_ON = C;

/** The receipt's "If it goes wrong" lines. Unknown booking type shows both, and says how to tell. */
export function ifItGoesWrong(bookingType: BookingType | undefined | null): { lines: HelpLine[]; askSeller: boolean } {
  if (bookingType === "package") return { lines: [PACKAGE_HELP, FLIGHT_DELAY_HELP], askSeller: false };
  if (bookingType === "separate") return { lines: [SEPARATE_HELP, FLIGHT_DELAY_HELP], askSeller: false };
  return { lines: [PACKAGE_HELP, SEPARATE_HELP, FLIGHT_DELAY_HELP], askSeller: true };
}

/**
 * A first guess at the booking type, which the family then confirms with one tap.
 * Only a package seller's own holiday brand or the advert's own words count. Never a guess from price.
 */
export function suggestBookingType(input: { text?: string | null; supplierName?: string | null }): {
  type: BookingType;
  reason: string;
} | undefined {
  const supplier = input.supplierName ?? "";
  if (/jet2\s*holidays|\btui\b|easy\s*jet\s*holidays|british\s*airways\s*holidays|\bba\s*holidays/i.test(supplier))
    return { type: "package", reason: `${supplier.trim()} sells flights and hotel together as a package` };
  const text = input.text ?? "";
  if (/\bpackage\s+holiday|\bATOL[-\s]protected\b|\bATOL\s+(number|no\.?)\b/i.test(text))
    return { type: "package", reason: "the advert mentions a package or ATOL protection" };
  return undefined;
}

// ---------------------------------------------------------------------------
// The child card and the taxi line: fixed phrases, never machine-translated at run time.
// ---------------------------------------------------------------------------

export interface CardPhrases {
  stayingAt: string;
  ifLost: string;
  meetingPoint: string;
  parentPhone: string;
  speaksEnglish: string;
  takeMeHere: string;
}

/**
 * Translated once and checked by a native speaker before going live.
 * `checked` is false until that check is done, so the page can say so.
 */
export const CARD_PHRASES: Record<string, CardPhrases & { checked: boolean }> = {
  en: {
    stayingAt: "I'm staying at",
    ifLost: "If I'm lost, please call my parent",
    meetingPoint: "Our meeting point",
    parentPhone: "My parent's phone",
    speaksEnglish: "I speak English",
    takeMeHere: "Please take me to this address",
    checked: true,
  },
  es: {
    stayingAt: "Me alojo en",
    ifLost: "Si me he perdido, por favor llame a mi padre o a mi madre",
    meetingPoint: "Nuestro punto de encuentro",
    parentPhone: "Teléfono de mi padre o mi madre",
    speaksEnglish: "Hablo inglés",
    takeMeHere: "Por favor, lléveme a esta dirección",
    checked: false,
  },
};

/** Our own advice, labelled as advice wherever it shows. */
export const PLAN_B_ADVICE = {
  powerCut: [
    "Card machines, cash machines, lifts and traffic lights need power.",
    "On an island, tap water can depend on electricity too.",
    "Mobile signal may stop after a few hours.",
  ],
  beforeYouFly: [
    "Carry some cash in euros.",
    "Pack a charged power bank.",
    "Download an offline map of the area.",
    "Print this card, or save it to your phone.",
  ],
} as const;

/** What the card does not check, said plainly. */
export const PLAN_B_NOT_CHECKED = [
  "Live news, weather or outages: in an emergency, call 112 and follow the local authorities.",
  "Whether ES-Alert warnings reach a UK phone on roaming: Spain's official pages don't say.",
  "Whether the hospitals listed are open right now: map data can be out of date, so ask your hotel.",
] as const;
