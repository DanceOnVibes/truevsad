import { describe, expect, it } from "vitest";
import { EXTRA_PLACES, knownPlaceIn, placeKey, placeLabel, sellerKey } from "./names";

// A few fee-rule regions (the real list comes from the database) and FCDO country names.
const PLACES = ["Kos", "Sal", "Vis", "Split", "Greece", "Mallorca", "Palma de Mallorca", "Magaluf", "St Julian's", "Sunny Beach", ...EXTRA_PLACES];
const COUNTRIES = ["Spain", "Greece", "Mexico", "Croatia", "USA", "Malta", "Turkey", "Cyprus", "Portugal", "Bulgaria"];

describe("names: only a real place is ever shown, never the hotel", () => {
  it("finds the place inside what families really typed", () => {
    expect(knownPlaceIn("Muthu La Perla Tenerife", PLACES, COUNTRIES)).toBe("Tenerife");
    expect(knownPlaceIn("TUI BLUE El Dorado Seaside Palms, Riviera Maya, Mexico - Caribbean Coast, Mexico", PLACES, COUNTRIES)).toBe("Riviera Maya");
    expect(knownPlaceIn("Golden Donaire Beach", PLACES, COUNTRIES)).toBeNull();
  });
  it("prefers the most specific place, and a town over a country", () => {
    expect(knownPlaceIn("Palma de Mallorca, Mallorca, Spain", PLACES, COUNTRIES)).toBe("Palma de Mallorca");
    expect(knownPlaceIn("St Julians Bay Hotel, Malta", PLACES, COUNTRIES)).toBe("St Julian's");
    expect(knownPlaceIn("Seaside Resort, Spain", PLACES, COUNTRIES)).toBe("Spain");
  });
  it("matches whole words only", () => {
    expect(knownPlaceIn("Hotel Vis a Vis, Benidorm", PLACES, COUNTRIES)).toBe("Benidorm");
    expect(knownPlaceIn("Scam Holidays Ltd", PLACES, COUNTRIES)).toBeNull();
  });
  it("takes a very short name only when it stands alone between commas", () => {
    expect(knownPlaceIn("Kos, Greece", PLACES, COUNTRIES)).toBe("Kos");
    expect(knownPlaceIn("Kos Palace Hotel", PLACES, COUNTRIES)).toBeNull();
  });
});

describe("names: keys", () => {
  it("one key per seller however it's typed", () => {
    expect(sellerKey("Jet2holidays.com")).toBe("jet2holidays");
    expect(sellerKey("jet2 holidays")).toBe("jet2holidays");
    expect(sellerKey("Ryanair ")).toBe("ryanair");
    expect(sellerKey("lastminute.com")).toBe("lastminute");
  });
  it("places without the hotel", () => {
    expect(placeKey("Golden Donaire Beach, Tarragona, Spain")).toBe("tarragona spain");
    expect(placeLabel("TUI BLUE X, Riviera Maya, Mexico")).toBe("Riviera Maya, Mexico");
  });
});
