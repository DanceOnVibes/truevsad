import { describe, expect, it } from "vitest";
import { daysLeft, lastDay, reasonsFor, ticketSteps, ticketVerdict, DISCRETION_REASON } from "./tickets";

describe("Tickets: dates", () => {
  it("counts 'within 14 days beginning with' the notice date", () => {
    expect(lastDay("2026-11-24", 14)).toBe("2026-12-07");
    expect(lastDay("2026-11-24", 28)).toBe("2026-12-21");
  });

  it("crosses months and years", () => {
    expect(lastDay("2026-12-20", 14)).toBe("2027-01-02");
    expect(lastDay("2027-02-15", 28)).toBe("2027-03-14");
  });

  it("counts days left, today as 0", () => {
    expect(daysLeft("2026-11-24", "2026-11-24")).toBe(0);
    expect(daysLeft("2026-11-24", "2026-12-07")).toBe(13);
    expect(daysLeft("2026-12-08", "2026-12-07")).toBe(-1);
  });

  it("gives camera parking tickets 21 days at half price, others 14", () => {
    expect(ticketSteps("camera_parking", "2026-11-24")[0]!.by).toBe("2026-12-14");
    expect(ticketSteps("street", "2026-11-24")[0]!.by).toBe("2026-12-07");
    expect(ticketSteps("moving", "2026-11-24")[0]!.by).toBe("2026-12-07");
  });

  it("offers an informal challenge only for tickets left on the car", () => {
    expect(ticketSteps("street", "2026-11-24").some((s) => s.title === "Informal challenge")).toBe(true);
    expect(ticketSteps("moving", "2026-11-24").some((s) => s.title === "Informal challenge")).toBe(false);
    expect(ticketSteps("camera_parking", "2026-11-24").some((s) => s.title === "Informal challenge")).toBe(false);
  });

  it("refuses a date it can't read", () => {
    expect(() => lastDay("24/11/2026", 14)).toThrow();
  });
});

describe("Tickets: grounds", () => {
  it("keeps parking-only grounds off moving traffic tickets", () => {
    const moving = reasonsFor("moving").map((r) => r.id);
    expect(moving).not.toContain("grace");
    expect(moving).not.toContain("process");
    expect(reasonsFor("street").map((r) => r.id)).toContain("grace");
  });

  it("never treats asking for discretion as a legal ground", () => {
    expect(DISCRETION_REASON.ground).toBeNull();
    expect(ticketVerdict(["discretion"], "street")).toBe("discretion_only");
    expect(ticketVerdict(["signs", "discretion"], "street")).toBe("grounds");
    expect(ticketVerdict([], "moving")).toBe("none");
  });

  it("offers the camera-only ground just for posted camera parking tickets", () => {
    expect(reasonsFor("camera_parking").map((r) => r.id)).toContain("camera_not_allowed");
    expect(reasonsFor("street").map((r) => r.id)).not.toContain("camera_not_allowed");
    expect(reasonsFor("moving").map((r) => r.id)).not.toContain("camera_not_allowed");
    expect(ticketVerdict(["camera_not_allowed"], "camera_parking")).toBe("grounds");
  });

  it("ignores a parking reason ticked on a moving traffic ticket", () => {
    expect(ticketVerdict(["grace"], "moving")).toBe("none");
  });

  it("links every reason to an official source", () => {
    for (const kind of ["street", "camera_parking", "moving"] as const) {
      for (const r of reasonsFor(kind)) {
        expect(r.source.url).toMatch(/^https:\/\/(www\.)?(legislation\.gov\.uk|gov\.uk|lambeth\.gov\.uk|londoncouncils\.gov\.uk|londontribunals\.gov\.uk)\//);
        expect(r.evidence.length).toBeGreaterThan(0);
      }
    }
  });
});
