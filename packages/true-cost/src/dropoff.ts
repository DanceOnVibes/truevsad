import { mentions } from "./scope";

/**
 * Being dropped off at a UK airport: what the airport charges, and its own free option.
 *
 * Shown as "Good to know" on the receipt when the family says which airport they fly from.
 * Never added to the true price: plenty of families park, take the train or use the free option.
 * Every figure is the airport's own wording, with the date we checked.
 */
export interface AirportDropOff {
  airport: string;
  /** Names and codes a family might use ("LGW", "London Gatwick"). */
  aliases: string[];
  /** The terminal drop-off charge, as the airport states it. */
  charge: string;
  /** The airport's own free way to be dropped off, if it has one. */
  free?: string;
  /** When the charge must be paid, if it isn't taken at a barrier. */
  payBy?: string;
  sourceUrl: string;
  quote: string;
  checkedOn: string;
}

export const AIRPORT_DROPOFF: AirportDropOff[] = [
  {
    airport: "Heathrow",
    aliases: ["Heathrow", "LHR"],
    charge: "£7 every time you enter a terminal drop-off zone",
    free: "Free drop-off at Heathrow's Park & Ride car parks, with a free bus to the terminal",
    payBy: "midnight the next day (£80 charge if you don't, £40 if paid within 14 days)",
    sourceUrl: "https://www.heathrow.com/transport-and-directions/terminal-drop-off-charge",
    quote: "A £7 charge applies at Heathrow every time a vehicle enters the terminal drop-off areas.",
    checkedOn: "2026-11-01",
  },
  {
    airport: "Gatwick",
    aliases: ["Gatwick", "LGW"],
    charge: "£10 for 10 minutes, then £1 a minute (30 minutes maximum)",
    free: "Long Stay car parks free for up to 2 hours, with a free shuttle bus to the terminals",
    payBy: "midnight the day after (£100 charge if you don't, £60 if paid within 14 days)",
    sourceUrl: "https://www.gatwickairport.com/drop-off.html",
    quote: "£10 for 10 minutes / £1 for each additional minute up to 20 minutes",
    checkedOn: "2026-11-01",
  },
  {
    airport: "Manchester",
    aliases: ["Manchester", "MAN"],
    charge: "£5.50 for 5 minutes, £6.50 for 10 minutes",
    free: "Free Drop Off area at JetParks 1, with a free shuttle bus (about 6 minutes)",
    payBy: "midnight the following day (£100 charge if you don't, £60 if paid within 14 days)",
    sourceUrl: "https://www.manchesterairport.co.uk/parking/pick-up-and-drop-off-info/",
    quote: "5 minutes £5.50 / 10 minutes £6.50 / All passengers can use our free Drop Off area, located in JetParks 1.",
    checkedOn: "2026-11-01",
  },
  {
    airport: "Stansted",
    aliases: ["Stansted", "STN"],
    charge: "£10 for up to 15 minutes, £28 over 15 minutes",
    free: "Mid Stay car park free for up to 60 minutes, with a free shuttle bus",
    payBy: "midnight the day after (£100 charge if you don't, £60 if paid within 14 days)",
    sourceUrl: "https://www.stanstedairport.com/getting-to-and-from/pick-up-and-drop-off/",
    quote: "Up to 15 minutes | £10 / Over 15 minutes | £28",
    checkedOn: "2026-11-01",
  },
  {
    airport: "Luton",
    aliases: ["Luton", "LTN"],
    charge: "£9 for 12 minutes, then £1 a minute (30 minutes maximum)",
    free: "Long Stay car park free for up to 2 hours, with a shuttle bus to the terminal",
    payBy: "midnight the following day (£95 charge if you don't, £55 if paid within 14 days)",
    sourceUrl: "https://www.london-luton.co.uk/to-and-from-lla/dropping-off",
    quote: "£9 for 12 minutes / £1 per minute thereafter (max stay 30 minutes)",
    checkedOn: "2026-11-01",
  },
  {
    airport: "Birmingham",
    aliases: ["Birmingham", "BHX"],
    charge: "£7 for the first 15 minutes (Premium Set Down, next to the terminal)",
    free: "Drop Off car park free for up to 10 minutes (5–10 minute covered walk, or the free bus)",
    sourceUrl: "https://www.birminghamairport.co.uk/parking/drop-off-and-pick-up/",
    quote: "costs £7 for the first 15 minutes / it's also free for up to 10 minutes",
    checkedOn: "2026-11-01",
  },
  {
    airport: "Bristol",
    aliases: ["Bristol", "BRS"],
    charge: "from £8.50 for up to 10 minutes",
    free: "Waiting Zone free for up to 1 hour, with a shuttle bus",
    sourceUrl: "https://www.bristolairport.co.uk/parking/drop-and-go",
    quote: "Prices start from £8.50 for up to 10 minutes.",
    checkedOn: "2026-11-01",
  },
  {
    airport: "East Midlands",
    aliases: ["East Midlands", "EMA"],
    charge: "£8 for up to 10 minutes, then £1 a minute (30 minutes maximum)",
    free: "Long Stay 2 car park free for up to 60 minutes, with a free shuttle bus",
    payBy: "midnight the day after (£100 charge if you don't, £60 if paid within 14 days)",
    sourceUrl: "https://www.eastmidlandsairport.com/getting-to-and-from/pick-up-and-drop-off/",
    quote: "Up to 10 minutes £8 / Every minute after the first 10 minutes £1",
    checkedOn: "2026-11-01",
  },
  {
    airport: "Leeds Bradford",
    aliases: ["Leeds Bradford", "Leeds", "LBA"],
    charge: "£6.50 for 10 minutes",
    free: "One Hour Free Zone, free for up to an hour (3–4 minute uphill walk)",
    sourceUrl: "https://www.leedsbradfordairport.co.uk/at-the-airport/facilities/one-hour-free-zone",
    quote: "The standard fee is £6.50 for a 10-minute stay. / Park for up to one hour for free",
    checkedOn: "2026-11-01",
  },
  {
    airport: "Liverpool",
    aliases: ["Liverpool", "John Lennon", "LPL"],
    charge: "£4–£5 for up to 10 minutes (the airport's own pages give both)",
    free: "Drop Off 2 car park free for up to 40 minutes (5–10 minute walk)",
    sourceUrl: "https://lennon.liverpoolairport.com/parking/drop-off-2",
    quote: "Free for up to 40 minutes, charges payable thereafter.",
    checkedOn: "2026-11-01",
  },
  {
    airport: "Newcastle",
    aliases: ["Newcastle", "NCL"],
    charge: "£5–£6 for up to 10 minutes (the airport's own pages give both)",
    free: "Airport Waiting Zone at Callerton Parkway, free for up to 90 minutes, with a shuttle bus",
    sourceUrl: "https://www.newcastleairport.com/car-parking/picking-up-dropping-off",
    quote: "Parking is also available at the Airport Waiting Zone, located at Callerton Parkway, which provides free parking for up to 90 minutes.",
    checkedOn: "2026-11-01",
  },
  {
    airport: "Edinburgh",
    aliases: ["Edinburgh", "EDI"],
    charge: "£8.50 for up to 10 minutes, then £1 a minute",
    free: "Long Stay car park free for 30 minutes (about a 10 minute walk; no shuttle bus)",
    sourceUrl: "https://www.edinburghairport.com/edinburgh-airport-parking/drop-off-and-pick-up",
    quote: "Up to 10 minutes | £8.50 / 10 minutes and above | £1 per minute",
    checkedOn: "2026-11-01",
  },
  {
    airport: "Glasgow",
    aliases: ["Glasgow", "GLA"],
    charge: "£7 for up to 15 minutes",
    free: "Long Stay car park free for up to 1 hour, then the free shuttle bus",
    sourceUrl: "https://www.glasgowairport.com/to-and-from/pick-up-and-drop-off/",
    quote: "Pick Up & Drop Off is charged at £7.00 to stay for up to 15 minutes.",
    checkedOn: "2026-11-01",
  },
];

export function dropOffFor(name: string | undefined | null): AirportDropOff | undefined {
  if (!name) return undefined;
  return AIRPORT_DROPOFF.find((a) => a.aliases.some((alias) => mentions(name, alias)));
}
