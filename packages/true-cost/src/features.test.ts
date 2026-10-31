import { describe, expect, it } from "vitest";
import {
  calculateTrueCost,
  childExtras,
  receiptScope,
  familySeatingFor,
  AIRLINE_BAGS,
  airlineBagsFor,
  bagFits,
  familyWindows,
  quoteDifference,
  advertNotes,
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

describe("exclusive groups", () => {
  const base = { category: "levy" as const, unit: "per_person_per_night" as const, confidence: 0.6, exclusiveGroup: "catalonia" };
  const bcn: FeeRule = { ...base, id: "bcn", label: "Barcelona", amount: { kind: "fixed", pence: 770 }, regions: ["Barcelona"] };
  const rest: FeeRule = { ...base, id: "rest", label: "Catalonia", amount: { kind: "fixed", pence: 165 }, regions: ["Catalonia", "Calella", "Salou"] };

  it("a Barcelona-province town written with 'Barcelona' is charged once, at the most specific rate", () => {
    expect(selectRules([rest, bcn], { destination: "Hotel Sol, Calella, Barcelona, Spain" }).map((r) => r.id)).toEqual(["bcn"]);
  });
  it("elsewhere in Catalonia uses the regional rate", () => {
    expect(selectRules([rest, bcn], { destination: "Golden Donaire Beach, Salou, Spain" }).map((r) => r.id)).toEqual(["rest"]);
  });
});

describe("tax coverage", () => {
  const tax: FeeRule = { id: "t", category: "levy", label: "Tax", unit: "per_person_per_night", amount: { kind: "fixed", pence: 100 }, confidence: 0.8, regions: ["Mallorca"], covers: "local_taxes" };
  const offer = (destination: string, includes: Offer["includes"] = []): Offer => ({ headlinePence: 50000, headlineBasis: "total", currency: "GBP", nights: 7, destination, includes });
  const party = { adults: 2, childAges: [] };
  it("knows Mallorca (a tax rule matched)", () => {
    const o = offer("Alcudia, Mallorca, Spain");
    expect(calculateTrueCost({ party, offer: o, rules: selectRules([tax], o) }).taxCoverage).toBe(true);
  });
  it("knows Tenerife has no tourist tax", () => {
    const o = offer("Costa Adeje, Tenerife, Spain");
    expect(calculateTrueCost({ party, offer: o, rules: selectRules([tax], o) }).taxCoverage).toBe(true);
  });
  it("doesn't pretend to know Turkey", () => {
    const o = offer("Side, Antalya, Turkey");
    expect(calculateTrueCost({ party, offer: o, rules: selectRules([tax], o) }).taxCoverage).toBe(false);
  });
  it("never charges taxes twice when the deal includes them", () => {
    const o = offer("Alcudia, Mallorca, Spain", ["local_taxes"]);
    const r = calculateTrueCost({ party, offer: o, rules: selectRules([tax], o) });
    expect(r.trueCostPence).toBe(50000);
    expect(r.taxCoverage).toBe(true);
  });
});

describe("free child places", () => {
  const rules: FeeRule[] = [
    { id: "bag", category: "party_extra", label: "Hold bag", unit: "per_person", amount: { kind: "fixed", pence: 6667 }, confidence: 0.4, minAge: 2, covers: "hold_bag" },
    { id: "tax", category: "levy", label: "Tax", unit: "per_person_per_night", amount: { kind: "fixed", pence: 275 }, confidence: 0.9, minAge: 16, regions: ["Mallorca"], covers: "local_taxes" },
    { id: "room", category: "levy", label: "Room fee", unit: "per_party_per_night", amount: { kind: "fixed", pence: 834 }, confidence: 0.7 },
  ];
  const offer: Offer = { headlinePence: 60000, headlineBasis: "per_person", currency: "GBP", nights: 7, destination: "Alcudia, Mallorca, Spain", freeChildClaim: true };
  it("a 'free' 7-year-old still costs a share of the bags; a baby costs nothing", () => {
    // 3 people aged 2+ → 2 bags (one per two people) = £133.34, shared equally: £44.45 each.
    const c = childExtras({ party: { adults: 2, childAges: [7, 1] }, offer, rules: selectRules(rules, offer) });
    expect(c).toEqual([{ age: 7, pence: 4445 }, { age: 1, pence: 0 }]);
  });
  it("a 16-year-old also pays the tourist tax; room fees don't count per child", () => {
    const c = childExtras({ party: { adults: 2, childAges: [16] }, offer, rules: selectRules(rules, offer) });
    expect(c).toEqual([{ age: 16, pence: 4445 + 7 * 275 }]);
  });
});

describe("receipt scope", () => {
  const line = (category: "supplier" | "levy" | "party_extra", label: string) => ({ category, label, amountPence: 100, source: "rule" as const, confidence: 0.5 });
  it("states how it counted and what it didn't check, without hedging words", () => {
    const c = receiptScope({ includes: [] }, { receipt: { lines: [line("supplier", "Advertised"), line("party_extra", "Hold bag, return"), line("levy", "Balearic tourist tax (4-star hotel, May–Oct rate)")], subtotals: {} as never } });
    expect(c.notChecked.some((s) => s.includes("Transfers"))).toBe(true);
    expect(c.counted.some((s) => s.includes("one per two people"))).toBe(true);
    expect(c.counted.some((s) => s.includes("4-star"))).toBe(true);
    expect([...c.counted, ...c.notChecked].some((s) => /assum|estimat|guess/i.test(s))).toBe(false);
  });
  it("doesn't list transfers when the deal includes them", () => {
    const c = receiptScope({ includes: ["transfers"] }, { receipt: { lines: [], subtotals: {} as never } });
    expect(c.notChecked.some((s) => s.includes("Transfers"))).toBe(false);
    expect(c.counted).toEqual([]);
  });
});

describe("advisory hold bags", () => {
  const bag: FeeRule = { id: "bag", category: "party_extra", label: "Hold bag, return", unit: "per_person", amount: { kind: "fixed", pence: 7000 }, confidence: 0.5, minAge: 2, covers: "hold_bag" };
  const offer: Offer = { headlinePence: 300000, headlineBasis: "total", currency: "GBP", nights: 7 };
  it("counts one bag per two people aged 2+, rounded up, and marks it advisory", () => {
    const r = calculateTrueCost({ party: { adults: 2, childAges: [7, 11, 1] }, offer, rules: [bag] });
    const line = r.receipt.lines.find((l) => l.label === "Hold bag, return")!;
    expect(line.amountPence).toBe(2 * 7000);
    expect(line.advisory).toBe(true);
    expect(line.working!.includes("1 per 2 people aged 2+")).toBe(true);
  });
  it("the seller's standard bag stays the same whatever the family takes", () => {
    const none = calculateTrueCost({ party: { adults: 2, childAges: [7, 11], holdBags: 0 }, offer, rules: [bag] });
    expect(none.standardBagPence).toBe(7000);
    const included = calculateTrueCost({ party: { adults: 2, childAges: [] }, offer: { ...offer, includes: ["hold_bag"] }, rules: selectRules([bag], { includes: ["hold_bag"] }) });
    expect(included.standardBagPence).toBe(0);
  });
  it("uses the family's own number, including none", () => {
    const three = calculateTrueCost({ party: { adults: 2, childAges: [7, 11], holdBags: 3 }, offer, rules: [bag] });
    expect(three.trueCostPence).toBe(300000 + 3 * 7000);
    const none = calculateTrueCost({ party: { adults: 2, childAges: [7, 11], holdBags: 0 }, offer, rules: [bag] });
    expect(none.trueCostPence).toBe(300000);
  });
});

describe("advert maths and party checks", () => {
  const party = { adults: 2, childAges: [7, 11] };
  it("flags per-person × people that doesn't match the total", () => {
    const notes = advertNotes(party, { freeChildClaim: true, advertCheck: { perPersonPence: 89900, totalPence: 269700 } });
    expect(notes.length).toBe(1);
    expect(notes[0]!.includes("don't add up")).toBe(true);
    expect(notes[0]!.includes("£1,798.00")).toBe(true);
  });
  it("is quiet when the maths adds up", () => {
    expect(advertNotes(party, { advertCheck: { perPersonPence: 50000, totalPence: 200000 } })).toEqual([]);
  });
  it("says when the price was for a different party", () => {
    const notes = advertNotes(party, { advertCheck: { adults: 2, children: 0 } });
    expect(notes.length).toBe(1);
    expect(notes[0]!.includes("2 adults.")).toBe(true);
  });
});

describe("month and airline matching, stale figures", () => {
  const summer: FeeRule = { id: "s", category: "levy", label: "Summer tax", unit: "per_adult_per_night", amount: { kind: "fixed", pence: 300 }, confidence: 0.9, months: [5, 6, 7, 8, 9, 10] };
  const winter: FeeRule = { ...summer, id: "w", label: "Winter tax", amount: { kind: "fixed", pence: 100 }, months: [11, 12, 1, 2, 3, 4] };
  it("a travel month picks the rate, with no summer note", () => {
    const offer: Offer = { headlinePence: 1000, headlineBasis: "total", currency: "GBP", nights: 1, departMonth: 2 };
    const rules = selectRules([summer, winter], offer);
    expect(rules.map((r) => r.id)).toEqual(["w"]);
    expect(calculateTrueCost({ party: { adults: 1, childAges: [] }, offer, rules }).notes).toEqual([]);
  });
  it("an airline's own fee applies to a package that names the airline", () => {
    const ry: FeeRule = { id: "ry", category: "party_extra", label: "Ryanair bag", unit: "per_person", amount: { kind: "fixed", pence: 7000 }, confidence: 0.5, supplierName: "Ryanair", covers: "hold_bag" };
    const offer = { supplierName: "loveholidays", airline: "Ryanair" };
    expect(selectRules([ry], offer).length).toBe(1);
    expect(selectRules([ry], { supplierName: "loveholidays" }).length).toBe(0);
  });
  it("a figure checked over a year ago counts for half, and the receipt says so", () => {
    const tax: FeeRule = { ...summer, months: undefined, checkedOn: "2025-01-10" };
    const r = calculateTrueCost({ party: { adults: 2, childAges: [] }, offer: { headlinePence: 1000, headlineBasis: "total", currency: "GBP", nights: 1 }, rules: [tax], asOf: "2026-10-31" });
    expect(r.receipt.lines[1]!.confidence).toBe(0.45);
    expect(r.receipt.lines[1]!.checkedOn).toBe("2025-01-10");
    expect(r.notes.some((n) => n.includes("more than a year ago"))).toBe(true);
  });
});

describe("FairFam windows", () => {
  const council = [
    { name: "October half term", startsOn: "2027-10-23", endsOn: "2027-10-31" },
    { name: "Christmas holidays", startsOn: "2027-12-18", endsOn: "2028-01-03" },
  ];
  it("one calendar gives its own holidays, from today on", () => {
    const w = familyWindows([council], "2027-11-01");
    expect(w.length).toBe(1);
    expect(w[0]!.startsOn).toBe("2027-12-18");
    expect(w[0]!.maxNights).toBe(16);
    expect(w[0]!.narrowed).toBe(false);
  });
  it("two schools: only the days both children are off", () => {
    // The academy's half term starts two days later.
    const academy = [{ name: "Half term", startsOn: "2027-10-25", endsOn: "2027-11-02" }];
    const w = familyWindows([council, academy], "2027-09-01");
    expect(w.length).toBe(1);
    expect(w[0]!.startsOn).toBe("2027-10-25");
    expect(w[0]!.endsOn).toBe("2027-10-31");
    expect(w[0]!.days).toBe(7);
    expect(w[0]!.maxNights).toBe(6);
    expect(w[0]!.narrowed).toBe(true);
  });
  it("no shared days, no window", () => {
    const other = [{ startsOn: "2027-11-05", endsOn: "2027-11-07" }];
    expect(familyWindows([council.slice(0, 1), other], "2027-09-01")).toEqual([]);
  });
  it("compares the family's own two quotes", () => {
    expect(quoteDifference(250000, 200000)).toEqual({ pence: 50000, percent: 25 });
    expect(quoteDifference(180000, 200000)).toEqual({ pence: -20000, percent: -10 });
    expect(quoteDifference(0, 200000)).toBe(null);
  });
});

describe("Will my bag fit?", () => {
  const easy = airlineBagsFor("easyJet holidays")!;
  const free = easy.bags.find((b) => b.kind === "underseat")!;
  it("finds the airline from a seller name", () => {
    expect(easy.airline).toBe("easyJet");
    expect(airlineBagsFor("Jet2holidays")!.airline).toBe("Jet2");
    expect(airlineBagsFor("loveholidays")).toBe(undefined);
  });
  it("compares largest side to largest side", () => {
    expect(bagFits({ dims: [20, 36, 45] }, free)).toBe("fits");
    expect(bagFits({ dims: [46, 36, 20] }, free)).toBe("too_big");
    expect(bagFits({ dims: [45, 36, 20], kg: 16 }, free)).toBe("too_heavy");
  });
  it("Wizz Air: one side up to 5cm over may be wheels", () => {
    const wizz = airlineBagsFor("Wizz Air")!.bags.find((b) => b.kind === "underseat")!;
    expect(bagFits({ dims: [44, 30, 20] }, wizz)).toBe("fits_if_wheels");
    expect(bagFits({ dims: [46, 30, 20] }, wizz)).toBe("too_big");
    expect(bagFits({ dims: [42, 32, 20] }, wizz)).toBe("too_big");
  });
  it("never answers for sizes we haven't checked", () => {
    const unchecked = { ...airlineBagsFor("British Airways")!.bags[0]!, verified: false };
    expect(bagFits({ dims: [10, 10, 10] }, unchecked)).toBe("not_checked");
    expect(airlineBagsFor("KLM")).toBe(undefined);
  });
  it("BA's handbag, from its own page: 40 x 30 x 15", () => {
    const ba = airlineBagsFor("British Airways")!.bags.find((b) => b.kind === "underseat")!;
    expect(bagFits({ dims: [40, 30, 15] }, ba)).toBe("fits");
    expect(bagFits({ dims: [40, 30, 20] }, ba)).toBe("too_big");
  });
  it("Norwegian's under-seat bag, from its own page", () => {
    const n = airlineBagsFor("Norwegian")!.bags.find((b) => b.kind === "underseat")!;
    expect(bagFits({ dims: [40, 30, 20] }, n)).toBe("fits");
    expect(bagFits({ dims: [45, 36, 20] }, n)).toBe("too_big");
  });
  it("every verified row has its source, the airline's words and a check date", () => {
    for (const a of AIRLINE_BAGS)
      for (const b of a.bags)
        if (b.verified) {
          expect(/^https:\/\//.test(b.sourceUrl)).toBe(true);
          expect(b.quote.length > 10).toBe(true);
          expect(b.dims !== null).toBe(true);
          expect(/^\d{4}-\d{2}-\d{2}$/.test(b.checkedOn)).toBe(true);
        }
  });
});

describe("seats: only what a family must pay to sit together", () => {
  const seat = (supplierName: string | undefined): FeeRule => ({
    id: `s-${supplierName}`, category: "party_extra", label: "Seats, return", unit: "per_adult",
    amount: { kind: "fixed", pence: 1400 }, confidence: 0.4, covers: "seats", supplierName,
  });
  const offer: Offer = { headlinePence: 200000, headlineBasis: "total", currency: "GBP", nights: 7 };
  const family = { adults: 2, childAges: [7, 11] };
  it("adults-only bookings: nothing counted", () => {
    const r = calculateTrueCost({ party: { adults: 2, childAges: [] }, offer, rules: [seat("Ryanair"), seat(undefined)] });
    expect(r.trueCostPence).toBe(200000);
  });
  it("Ryanair, easyJet and BA seat children with an adult for free", () => {
    const r = calculateTrueCost({ party: family, offer, rules: [seat("Ryanair"), seat("easyJet"), seat("British Airways")] });
    expect(r.trueCostPence).toBe(200000);
    expect(familySeatingFor("easyJet holidays")!.policy).toBe("free");
  });
  it("airline policy unknown: per adult, as before", () => {
    const r = calculateTrueCost({ party: family, offer, rules: [seat(undefined)] });
    expect(r.trueCostPence).toBe(200000 + 2 * 1400);
  });
  it("teenagers only: nothing counted", () => {
    const r = calculateTrueCost({ party: { adults: 2, childAges: [13, 15] }, offer, rules: [seat("TUI")] });
    expect(r.trueCostPence).toBe(200000);
  });
});

describe("infant fees", () => {
  const infant: FeeRule = { id: "inf", category: "party_extra", label: "Infant fee (under 2), return", unit: "per_child", amount: { kind: "fixed", pence: 5000 }, confidence: 0.9, minAge: 0, maxAge: 1, supplierName: "easyJet" };
  const offer: Offer = { headlinePence: 200000, headlineBasis: "total", currency: "GBP", nights: 7, supplierName: "easyJet holidays" };
  it("charges each child under 2, never older children or adults", () => {
    const rules = selectRules([infant], offer);
    expect(calculateTrueCost({ party: { adults: 2, childAges: [1, 0, 4] }, offer, rules }).trueCostPence).toBe(200000 + 2 * 5000);
    expect(calculateTrueCost({ party: { adults: 2, childAges: [2] }, offer, rules }).trueCostPence).toBe(200000);
  });
});
