import { formatDay, parseDay } from "./school";

/**
 * FairFam — the holiday windows a whole family can actually travel in.
 *
 * Each child can follow a different calendar (the council's dates, or their own school's when it
 * is an academy). A family can only go when EVERY child is off, so we intersect the calendars.
 * Pure functions on plain dates (YYYY-MM-DD, inclusive). No network, nothing stored.
 */

export interface DaysOff {
  /** e.g. "October half term" (optional for dates a family typed in). */
  name?: string;
  startsOn: string;
  endsOn: string;
}

export interface FamilyWindow {
  startsOn: string;
  endsOn: string;
  /** Calendar days in the window, inclusive. */
  days: number;
  /** Longest trip that fits: fly out on the first day, home on the last. */
  maxNights: number;
  /** Holiday names from the calendars that make up this window. */
  names: string[];
  /** True when the window is shorter than at least one child's own holiday (the calendars differ). */
  narrowed: boolean;
}

function daySet(list: DaysOff[]): Map<number, string | undefined> {
  const out = new Map<number, string | undefined>();
  for (const h of list) {
    const s = parseDay(h.startsOn);
    const e = parseDay(h.endsOn);
    for (let d = s; d <= e; d++) if (!out.has(d)) out.set(d, h.name);
  }
  return out;
}

/**
 * Windows when every calendar is off, from `from` onwards (inclusive), oldest first.
 * One calendar → its own holidays (touching ones merged). Several → only the shared days.
 */
export function familyWindows(calendars: DaysOff[][], from: string): FamilyWindow[] {
  const sets = calendars.filter((c) => c.length > 0).map(daySet);
  if (sets.length === 0) return [];
  const start = parseDay(from);
  const shared = [...sets[0]!.keys()].filter((d) => d >= start && sets.every((s) => s.has(d))).sort((a, b) => a - b);

  const windows: FamilyWindow[] = [];
  let runStart: number | null = null;
  let prev = -Infinity;
  const flush = (end: number) => {
    if (runStart === null) return;
    const names = new Set<string>();
    let narrowed = false;
    for (const s of sets) {
      for (let d = runStart; d <= end; d++) {
        const n = s.get(d);
        if (n) names.add(n);
      }
      // A child's own holiday that runs past either edge of the shared window → it was narrowed.
      if (s.has(runStart - 1) || s.has(end + 1)) narrowed = true;
    }
    const days = end - runStart + 1;
    windows.push({
      startsOn: formatDay(runStart),
      endsOn: formatDay(end),
      days,
      maxNights: Math.max(0, days - 1),
      names: [...names],
      narrowed,
    });
  };
  for (const d of shared) {
    if (d !== prev + 1) {
      flush(prev);
      runStart = d;
    }
    prev = d;
  }
  flush(prev);
  return windows;
}

/**
 * The family's own two quotes for the same holiday: one in the school holiday, one in a nearby
 * term-time week. Only ever their own numbers, never published.
 */
export function quoteDifference(holidayPence: number, otherPence: number): { pence: number; percent: number } | null {
  if (!(Number.isInteger(holidayPence) && Number.isInteger(otherPence) && holidayPence > 0 && otherPence > 0)) return null;
  const pence = holidayPence - otherPence;
  return { pence, percent: Math.round(((pence * 1000) / otherPence)) / 10 };
}
