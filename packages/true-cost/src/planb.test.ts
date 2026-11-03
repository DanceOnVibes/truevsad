import { describe, expect, it } from "vitest";
import {
  CARD_PHRASES,
  countryFor,
  fragileNoteFor,
  ifItGoesWrong,
  islandFor,
  PACKAGE_HELP,
  planBFor,
  SEPARATE_HELP,
  suggestBookingType,
} from "./planb";

describe("Plan B: where you're going", () => {
  it("finds the island from a resort name", () => {
    expect(islandFor("Costa Adeje, Tenerife")?.name).toBe("Tenerife");
    expect(islandFor("Playa Blanca")?.name).toBe("Lanzarote");
    expect(islandFor("Corralejo, Spain")?.name).toBe("Fuerteventura");
  });

  it("never mixes up La Palma with Palma de Mallorca, or Las Palmas", () => {
    expect(islandFor("Palma de Mallorca")).toBeUndefined();
    expect(countryFor("Palma de Mallorca")?.country).toBe("Spain");
    expect(islandFor("Las Palmas, Gran Canaria")?.name).toBe("Gran Canaria");
    expect(islandFor("Los Llanos, La Palma")?.name).toBe("La Palma");
  });

  it("picks the consulate GOV.UK lists for each island", () => {
    expect(planBFor("Lanzarote")?.consulate?.name).toBe("British Consulate Las Palmas de Gran Canaria");
    expect(planBFor("La Gomera")?.consulate?.name).toBe("British Consulate Santa Cruz de Tenerife");
    expect(planBFor("Benidorm")?.consulate).toBeUndefined(); // mainland: GOV.UK's Spain page only
  });

  it("covers Spain only for now, and says nothing elsewhere", () => {
    expect(planBFor("Benidorm")?.country.emergency.number).toBe("112");
    expect(planBFor("Paphos, Cyprus")).toBeUndefined();
    expect(planBFor(undefined)).toBeUndefined();
  });
});

describe("Plan B: fragile places", () => {
  it("shows an officially confirmed whole-island cut", () => {
    const note = fragileNoteFor("Puerto Naos, La Palma", "2026-11-03");
    expect(note?.place).toBe("La Palma");
    expect(note?.events[0]?.date).toBe("2026-11-02");
    expect(note?.events[0]?.sourceName).toBe("Gobierno de Canarias");
  });

  it("drops a cut three years after it happened", () => {
    expect(fragileNoteFor("La Gomera", "2025-06-01")?.events).toHaveLength(1);
    expect(fragileNoteFor("La Gomera", "2026-11-03")).toBeUndefined();
  });

  it("never shows a cut before it happened, or for places with none on record", () => {
    expect(fragileNoteFor("La Palma", "2026-11-01")).toBeUndefined();
    expect(fragileNoteFor("Tenerife", "2026-11-03")).toBeUndefined();
    expect(fragileNoteFor("Benidorm", "2026-11-03")).toBeUndefined();
  });
});

describe("Plan B: if it goes wrong", () => {
  it("a package gets the organiser's duty, plus flight delays", () => {
    const r = ifItGoesWrong("package");
    expect(r.lines[0]).toBe(PACKAGE_HELP);
    expect(r.lines).toHaveLength(2);
    expect(r.askSeller).toBe(false);
  });

  it("separate bookings don't claim a duty nobody has", () => {
    const r = ifItGoesWrong("separate");
    expect(r.lines[0]).toBe(SEPARATE_HELP);
    expect(r.lines.some((l) => l === PACKAGE_HELP)).toBe(false);
  });

  it("when we don't know, shows both and says to ask the seller", () => {
    const r = ifItGoesWrong(undefined);
    expect(r.lines).toHaveLength(3);
    expect(r.askSeller).toBe(true);
  });

  it("never promises compensation", () => {
    for (const l of ifItGoesWrong(undefined).lines) expect(l.text).not.toMatch(/you will (get|receive) compensation/i);
  });
});

describe("Plan B: guessing the booking type", () => {
  it("only suggests a package from the seller's holiday brand or the advert's own words", () => {
    expect(suggestBookingType({ supplierName: "Jet2holidays" })?.type).toBe("package");
    expect(suggestBookingType({ supplierName: "Jet2" })).toBeUndefined(); // flight only
    expect(suggestBookingType({ text: "7 nights, ATOL protected, from £499pp" })?.type).toBe("package");
    expect(suggestBookingType({ text: "Package holiday to Tenerife" })?.type).toBe("package");
    expect(suggestBookingType({ text: "Hotel only, 7 nights" })).toBeUndefined();
  });
});

describe("Plan B: card phrases", () => {
  it("has every phrase in both languages", () => {
    const keys = Object.keys(CARD_PHRASES.en!).sort();
    expect(Object.keys(CARD_PHRASES.es!).sort()).toEqual(keys);
    for (const v of Object.values(CARD_PHRASES.es!)) if (typeof v === "string") expect(v.length).toBeGreaterThan(3);
  });
});
