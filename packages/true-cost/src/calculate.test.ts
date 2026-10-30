import { describe, expect, it } from "vitest";
import { calculateTrueCost, ruleApplies, toOutwardPostcode, type FeeRule } from "./index";

const family = { adults: 2, childAges: [7, 1], outwardPostcode: "SE11" };

describe("calculateTrueCost", () => {
  it("expands a per-person headline to the whole party", () => {
    const r = calculateTrueCost({
      party: family,
      offer: { headlinePence: 39900, headlineBasis: "per_person", currency: "GBP", nights: 7 },
    });
    expect(r.advertisedPence).toBe(39900 * 4);
    expect(r.trueCostPence).toBe(39900 * 4);
    expect(r.gapPence).toBe(0);
  });

  it("adds rule lines and computes the gap", () => {
    const rules: FeeRule[] = [
      { id: "bag", category: "party_extra", label: "Hold bag", unit: "per_person",
        amount: { kind: "fixed", pence: 3000 }, minAge: 2, confidence: 0.8 },
      { id: "tax", category: "levy", label: "Tourist tax", unit: "per_person_per_night",
        amount: { kind: "fixed", pence: 250 }, minAge: 16, confidence: 0.7 },
      { id: "fx", category: "payment_fx", label: "Card FX", unit: "per_party",
        amount: { kind: "percent", basisPoints: 299 }, confidence: 0.5 },
    ];
    const r = calculateTrueCost({
      party: family,
      offer: { headlinePence: 200000, headlineBasis: "total", currency: "GBP", nights: 3 },
      rules,
    });
    // bag: 2 adults + 7yo (infant excluded) = 3 × £30
    expect(r.receipt.subtotals.party_extra).toBe(9000);
    // tax: 2 adults only (kids under 16) × 3 nights × £2.50
    expect(r.receipt.subtotals.levy).toBe(1500);
    // fx: 2.99% of £2,000
    expect(r.receipt.subtotals.payment_fx).toBe(5980);
    expect(r.gapPence).toBe(9000 + 1500 + 5980);
    expect(r.confidence).toBeGreaterThan(0);
    expect(r.confidence).toBeLessThanOrEqual(1);
  });

  it("rejects DOB-style or invalid ages", () => {
    expect(() =>
      calculateTrueCost({
        party: { adults: 2, childAges: [19] },
        offer: { headlinePence: 1000, headlineBasis: "total", currency: "GBP", nights: 1 },
      }),
    ).toThrow();
  });
});

describe("toOutwardPostcode", () => {
  it("keeps only the outward code", () => {
    expect(toOutwardPostcode("se11 5ab")).toBe("SE11");
    expect(toOutwardPostcode("SW1A1AA")).toBe("SW1A");
    expect(toOutwardPostcode("M1")).toBe("M1");
    expect(toOutwardPostcode("nonsense")).toBeUndefined();
  });
});

describe("ruleApplies", () => {
  const base: FeeRule = {
    id: "t", category: "levy", label: "Tax", unit: "per_party",
    amount: { kind: "fixed", pence: 100 }, confidence: 0.9,
  };
  const canary = { ...base, regions: ["Canary Islands", "Tenerife", "Gran Canaria"] };

  it("applies unscoped rules everywhere", () => {
    expect(ruleApplies(base, {})).toBe(true);
  });
  it("matches scoped rules on whole words, ignoring case and accents", () => {
    expect(ruleApplies(canary, { destination: "Costa Adeje, TENERIFE" })).toBe(true);
    expect(ruleApplies(canary, { destination: "Gran Canária (Maspalomas)" })).toBe(true);
    expect(ruleApplies(canary, { destination: "Paris" })).toBe(false);
    expect(ruleApplies(canary, { destination: "Tenerifeish" })).toBe(false);
  });
  it("skips scoped rules when the destination is unknown", () => {
    expect(ruleApplies(canary, {})).toBe(false);
  });
  it("matches supplier-only rules", () => {
    const ej = { ...base, supplierName: "easyJet" };
    expect(ruleApplies(ej, { supplierName: "easyJet holidays" })).toBe(true);
    expect(ruleApplies(ej, { supplierName: "Jet2" })).toBe(false);
  });
});

describe("inclusions", () => {
  const bag: FeeRule = {
    id: "bag", category: "party_extra", label: "Hold bag", unit: "per_person",
    amount: { kind: "fixed", pence: 5000 }, confidence: 0.7, covers: "hold_bag",
  };
  it("skips a fee the deal already includes", () => {
    expect(ruleApplies(bag, { includes: ["hold_bag", "transfers"] })).toBe(false);
  });
  it("still charges when it is not included", () => {
    expect(ruleApplies(bag, { includes: ["transfers"] })).toBe(true);
    expect(ruleApplies(bag, {})).toBe(true);
  });
});
