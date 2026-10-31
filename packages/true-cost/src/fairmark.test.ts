import { describe, expect, it } from "vitest";
import { fairMark, fairMarkLevel, formatFairMarkPercent, isFairPrice } from "./index";

const base = { confidence: 0.9 };

describe("FairMark", () => {
  it("computes the exact percentage", () => {
    const f = fairMark({ ...base, advertisedPence: 100000, trueCostPence: 107400 });
    expect(f.percent).toBe(7.4);
    expect(f.display).toBe("+7.4%");
    expect(f.label).toBe("Fair Price");
  });
  it("uses the exact thresholds", () => {
    expect(fairMarkLevel(5)).toBe("gold");
    expect(fairMarkLevel(5.0001)).toBe("fair");
    expect(fairMarkLevel(10)).toBe("fair");
    expect(fairMarkLevel(10.0001)).toBe("higher");
    expect(fairMarkLevel(20)).toBe("higher");
    expect(fairMarkLevel(20.0001)).toBe("high");
  });
  it("treats zero and negative gaps as Gold", () => {
    expect(fairMark({ ...base, advertisedPence: 50000, trueCostPence: 50000 }).level).toBe("gold");
    const neg = fairMark({ ...base, advertisedPence: 50000, trueCostPence: 49000 });
    expect(neg.level).toBe("gold");
    expect(neg.display).toBe("-2.0%");
  });
  it("is unavailable without a price, with low confidence, or with demo figures", () => {
    expect(fairMark({ ...base, advertisedPence: 0, trueCostPence: 100 }).level).toBe("unavailable");
    expect(fairMark({ advertisedPence: 100, trueCostPence: 110, confidence: 0.5 }).level).toBe("unavailable");
    const demo = fairMark({ ...base, advertisedPence: 100, trueCostPence: 101, usedDemoRules: true });
    expect(demo.level).toBe("unavailable");
    expect(demo.label).toBe("FairMark unavailable");
    expect(demo.display).toBe("");
  });
  it("rounds for display only", () => {
    expect(formatFairMarkPercent(21.66)).toBe("+21.7%");
    expect(formatFairMarkPercent(-0.04)).toBe("0.0%");
  });
  it("counts Gold and Fair Price as fair", () => {
    expect(isFairPrice("gold")).toBe(true);
    expect(isFairPrice("fair")).toBe(true);
    expect(isFairPrice("higher")).toBe(false);
    expect(isFairPrice("unavailable")).toBe(false);
  });
});

describe("FairMark hardening", () => {
  it("never calls a deal fair when we have no tax data for the place", () => {
    const f = fairMark({ advertisedPence: 100000, trueCostPence: 100000, confidence: 0.9, taxCoverage: false });
    expect(f.level).toBe("unavailable");
    expect(f.reason).toBe("no_tax_data");
    expect(f.summary.length > 0).toBe(true);
  });
  it("splits required fees from family extras and names the biggest extra", () => {
    const f = fairMark({
      advertisedPence: 100000,
      trueCostPence: 112000,
      confidence: 0.8,
      taxCoverage: true,
      lines: [
        { category: "supplier", label: "Advertised price", amountPence: 100000, source: "extracted", confidence: 0.9 },
        { category: "levy", label: "Tourist tax", amountPence: 2000, source: "rule", confidence: 0.8 },
        { category: "party_extra", label: "Hold bags", amountPence: 10000, source: "rule", confidence: 0.5 },
      ],
    });
    expect(f.level).toBe("higher");
    expect(f.gapPence).toBe(12000);
    expect(f.requiredPence).toBe(2000);
    expect(f.extrasPence).toBe(10000);
    expect(f.summary).toContain("2.0% over the Fair Price line");
    expect(f.summary).toContain("Hold bags");
  });
});
