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
