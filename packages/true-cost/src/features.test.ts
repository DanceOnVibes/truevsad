import { describe, expect, it } from "vitest";
import {
  calculateTrueCost,
  classifyTrip,
  fairShare,
  scorePlace,
  selectRules,
  shoulderWeeks,
  type FeeRule,
  type Offer,
  type PlaceCounts,
  type SchoolHoliday,
} from "./index";

describe("seasonal rules", () => {
  const summer: FeeRule = {
    id: "s", category: "levy", label: "Tax (summer)", unit: "per_adult_per_night",
    amount: { kind: "fixed", pence: 281 }, confidence: 0.7, months: [5, 6, 7, 8, 9, 10],
  };
  const winter: FeeRule = { ...summer, id: "w", label: "Tax (winter)", amount: { kind: "fixed", pence: 70 }, months: [11, 12, 1, 2, 3, 4] };

  it("uses the rate for the travel month", () => {
    expect(selectRules([summer, winter], { departDate: "2027-02-14" }).map((r) => r.id)).toEqual(["w"]);
    expect(selectRules([summer, winter], { departDate: "2027-08-01" }).map((r) => r.id)).toEqual(["s"]);
  });
  it("assumes summer without a date, and says so", () => {
    const rules = selectRules([summer, winter], {});
    expect(rules.map((r) => r.id)).toEqual(["s"]);
    const res = calculateTrueCost({
      party: { adults: 2, childAges: [] },
      offer: { headlinePence: 50000, headlineBasis: "total", currency: "GBP", nights: 7 },
      rules,
    });
    expect(res.notes.length).toBe(1);
  });
});

describe("School Window", () => {
  const hols: SchoolHoliday[] = [
    { authority: "Test", name: "October half term", startsOn: "2026-10-24", endsOn: "2026-11-01" },
    { authority: "Test", name: "Summer holidays", startsOn: "2027-07-22", endsOn: "2027-09-01" },
  ];
  it("inside a holiday misses no school", () => {
    const t = classifyTrip("2026-10-24", 7, hols);
    expect(t.status).toBe("school_holiday");
    expect(t.schoolDaysMissed).toBe(0);
  });
  it("just before a holiday is shoulder", () => {
    // Mon 19 Oct – Mon 26 Oct: misses Mon–Fri 19–23 Oct
    const t = classifyTrip("2026-10-19", 7, hols);
    expect(t.status).toBe("shoulder");
    expect(t.schoolDaysMissed).toBe(5);
  });
  it("far from any holiday is term time", () => {
    expect(classifyTrip("2027-03-01", 7, hols).status).toBe("term_time");
  });
  it("lists shoulder weeks", () => {
    expect(shoulderWeeks(hols[0]!)).toEqual({
      before: ["2026-10-17", "2026-10-23"],
      after: ["2026-11-02", "2026-11-08"],
    });
  });
  it("rejects impossible dates", () => {
    expect(() => classifyTrip("2026-02-30", 3, hols)).toThrow();
  });
});

describe("Visit Before You Book", () => {
  const base: PlaceCounts = {
    playground: 0, beach: 0, park: 0, waterOrThemePark: 0, nightclub: 0, barOrPub: 0,
    restaurantOrCafe: 0, supermarket: 0, pharmacy: 0, medical: 0, attraction: 0,
  };
  it("rates a family resort green for families", () => {
    const s = scorePlace({ ...base, playground: 4, beach: 2, park: 2, waterOrThemePark: 1, supermarket: 3, pharmacy: 2, medical: 2, restaurantOrCafe: 20, barOrPub: 6 });
    expect(s.find((l) => l.lens === "families")!.light).toBe("green");
  });
  it("warns families about a nightclub strip, and suits groups", () => {
    const s = scorePlace({ ...base, nightclub: 12, barOrPub: 60, restaurantOrCafe: 30, beach: 1, supermarket: 1, pharmacy: 1, medical: 1 });
    const fam = s.find((l) => l.lens === "families")!;
    expect(fam.watch.some((w) => w.includes("noisy"))).toBe(true);
    expect(s.find((l) => l.lens === "groups")!.light).toBe("green");
    expect(fam.score).toBeLessThan(s.find((l) => l.lens === "groups")!.score);
  });
});

describe("Fair Share", () => {
  const offer: Offer = { headlinePence: 50000, headlineBasis: "per_person", currency: "GBP", nights: 7 };
  const rules: FeeRule[] = [
    { id: "tax", category: "levy", label: "Tax", unit: "per_person_per_night", amount: { kind: "fixed", pence: 153 }, confidence: 0.7, minAge: 17, maxNights: 7 },
    { id: "room", category: "levy", label: "Room fee", unit: "per_party_per_night", amount: { kind: "fixed", pence: 851 }, confidence: 0.7 },
    { id: "park", category: "door_to_door", label: "Parking", unit: "per_party", amount: { kind: "fixed", pence: 9001 }, confidence: 0.5 },
  ];
  const families = [
    { adults: 2, childAges: [7, 1] },
    { adults: 2, childAges: [] },
  ];

  it("shares add up exactly to the group's true price", () => {
    const r = fairShare({ offer, rules, families });
    expect(r.shares.reduce((s, f) => s + f.trueCostPence, 0)).toBe(r.group.trueCostPence);
  });
  it("each family pays for its own people", () => {
    const r = fairShare({ offer, rules, families });
    // Family 1 has 4 people at £500, family 2 has 2: family 1 pays more.
    expect(r.shares[0]!.trueCostPence).toBeGreaterThan(r.shares[1]!.trueCostPence);
    // Taxes follow adults only (children exempt), so both families pay the same tax.
    expect(r.shares[0]!.advertisedPence).toBe(200000);
    expect(r.shares[1]!.advertisedPence).toBe(100000);
  });
  it("splits a total price by head count", () => {
    const r = fairShare({ offer: { ...offer, headlineBasis: "total", headlinePence: 300001 }, rules: [], families });
    expect(r.shares.map((s) => s.advertisedPence)).toEqual([200001, 100000]);
  });
});
