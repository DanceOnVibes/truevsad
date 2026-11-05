import { describe, expect, it } from "vitest";
import { expiredRuleNotes, freshnessIssues, type FreshnessInput } from "./freshness";
import type { FeeRule } from "./types";

const rule = (over: Partial<FeeRule>): FeeRule => ({
  id: "r",
  category: "levy",
  label: "Barcelona tourist tax (regional + city surcharge, 4-star hotel)",
  unit: "per_person_per_night",
  amount: { kind: "fixed", pence: 770 },
  confidence: 0.9,
  regions: ["Barcelona"],
  exclusiveGroup: "catalonia_tax",
  validTo: "2027-03-31",
  ...over,
});

describe("freshness: a rule that ran out is never silently dropped", () => {
  const offer = { destination: "Hotel Arts, Barcelona, Spain" };
  it("says so on the receipt when nothing replaces it", () => {
    const notes = expiredRuleNotes([rule({})], [], offer);
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatch(/^Barcelona tourist tax: the rate we hold ran out on 31 Mar 2027/);
    expect(notes[0]).toMatch(/isn't in this price/);
  });
  it("says nothing once a newer rule for the same tax is in place", () => {
    const newer = rule({ id: "r2", validTo: "2028-03-31" });
    expect(expiredRuleNotes([rule({})], [newer], offer)).toEqual([]);
  });
  it("only for deals the rule applied to", () => {
    expect(expiredRuleNotes([rule({})], [], { destination: "Benidorm, Spain" })).toEqual([]);
  });
});

const base: FreshnessInput = {
  today: "2027-03-01",
  rules: [],
  localTaxNotes: [],
  emergencyChecks: [],
  airlineBags: [],
  councils: [],
  fcdoStale: 0,
  eurToGbp: null,
};

describe("freshness: the weekly list", () => {
  it("flags a rule ending within 45 days as soon, and an ended one as now", () => {
    const soon = freshnessIssues({ ...base, rules: [{ label: "Barcelona tax", validTo: "2027-03-31", checkedOn: "2027-01-01" }] });
    expect(soon[0]).toMatchObject({ level: "soon", area: "Fee rule", due: "2027-03-31" });
    const now = freshnessIssues({ ...base, today: "2027-04-02", rules: [{ label: "Barcelona tax", validTo: "2027-03-31", checkedOn: "2027-01-01" }] });
    expect(now[0]!.level).toBe("now");
  });
  it("asks for a re-check after 180 days", () => {
    const r = freshnessIssues({ ...base, rules: [{ label: "Old rule", checkedOn: "2026-08-01" }] });
    expect(r).toHaveLength(1);
    expect(r[0]!.level).toBe("recheck");
  });
  it("flags euro fees when the rate moves more than 3%", () => {
    const rules = [{ label: "A", checkedOn: "2027-02-01", sourceNote: "EUR 9.24 at ECB 0.8338. checked 1 Feb 2027" }];
    expect(freshnessIssues({ ...base, rules, eurToGbp: 0.85 })).toEqual([]);
    const moved = freshnessIssues({ ...base, rules, eurToGbp: 0.88 });
    expect(moved[0]!.area).toBe("Exchange rate");
    expect(moved[0]!.text).toMatch(/\+5\.5%/);
  });
  it("puts what needs doing now first", () => {
    const r = freshnessIssues({
      ...base,
      rules: [{ label: "Old rule", checkedOn: "2026-01-01" }],
      fcdoStale: 3,
    });
    expect(r.map((x) => x.level)).toEqual(["now", "recheck"]);
  });
  it("lists councils whose published dates are running out", () => {
    const r = freshnessIssues({ ...base, councils: [{ authority: "Lambeth", lastEndsOn: "2027-09-01", takenOn: "2026-11-02" }] });
    expect(r[0]).toMatchObject({ level: "soon", area: "Term dates" });
  });
});
