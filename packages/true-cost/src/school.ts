/**
 * School Window — where does a trip fall against a council's school holidays?
 *
 * Pure functions on plain dates (YYYY-MM-DD, inclusive). No time zones: UK school dates are
 * calendar days, so we do all date maths in UTC to avoid clocks-change off-by-one errors.
 */

export interface SchoolHoliday {
  /** Council / education authority, e.g. "Lambeth". */
  authority: string;
  /** e.g. "October half term", "Summer holidays". */
  name: string;
  /** First day off school (inclusive). */
  startsOn: string;
  /** Last day off school (inclusive). */
  endsOn: string;
}

export type SchoolStatus = "school_holiday" | "shoulder" | "term_time";

export interface TripWindow {
  status: SchoolStatus;
  /** The holiday the trip overlaps or sits next to. */
  holiday?: SchoolHoliday;
  /** Trip days (nights + 1) that fall inside school holidays. */
  daysInHoliday: number;
  /** Trip days that fall in term time — days a child would miss school. */
  schoolDaysMissed: number;
  /** Plain-English summary for the family. */
  summary: string;
}

/** How close (in days) a term-time trip must be to a holiday to count as "shoulder". */
export const SHOULDER_DAYS = 7;

const DAY = 86_400_000;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseDay(s: string): number {
  const m = DATE.exec(s);
  if (!m) throw new Error(`Not a date: ${s}`);
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(t);
  if (d.getUTCMonth() !== Number(m[2]) - 1 || d.getUTCDate() !== Number(m[3])) {
    throw new Error(`Not a real date: ${s}`);
  }
  return t / DAY;
}

export function formatDay(day: number): string {
  return new Date(day * DAY).toISOString().slice(0, 10);
}

/** Saturday or Sunday. */
function isWeekend(day: number): boolean {
  const wd = new Date(day * DAY).getUTCDay();
  return wd === 0 || wd === 6;
}

/**
 * Classify a trip (first day + nights) against a council's holidays.
 * - school_holiday: at least one weekday of the trip is inside a school holiday and none are term-time weekdays
 * - shoulder: the trip misses school, but only within SHOULDER_DAYS of a holiday (often cheaper, little school missed)
 * - term_time: the trip misses school away from any holiday
 * Weekends never count as missed school.
 */
export function classifyTrip(departDate: string, nights: number, holidays: SchoolHoliday[]): TripWindow {
  const start = parseDay(departDate);
  const end = start + Math.max(0, nights); // the day you fly home
  const ranges = holidays.map((h) => ({ h, s: parseDay(h.startsOn), e: parseDay(h.endsOn) }));
  const inHoliday = (d: number) => ranges.find((r) => d >= r.s && d <= r.e);

  let daysInHoliday = 0;
  let schoolDaysMissed = 0;
  let overlapped: SchoolHoliday | undefined;
  for (let d = start; d <= end; d++) {
    const r = inHoliday(d);
    if (r) {
      daysInHoliday++;
      overlapped ??= r.h;
    } else if (!isWeekend(d)) {
      schoolDaysMissed++;
    }
  }

  if (schoolDaysMissed === 0) {
    return {
      status: overlapped ? "school_holiday" : "term_time",
      holiday: overlapped,
      daysInHoliday,
      schoolDaysMissed,
      summary: overlapped
        ? `Falls in ${overlapped.name}: no school missed, but this is usually the priciest time to go.`
        : "Weekend trip: no school missed.",
    };
  }

  // Misses some school. Is it right next to a holiday?
  const near = ranges
    .map((r) => ({ r, gap: end < r.s ? r.s - end : start > r.e ? start - r.e : 0 }))
    .sort((a, b) => a.gap - b.gap)[0];
  const school = `${schoolDaysMissed} school day${schoolDaysMissed === 1 ? "" : "s"}`;

  if (near && near.gap <= SHOULDER_DAYS) {
    return {
      status: "shoulder",
      holiday: near.r.h,
      daysInHoliday,
      schoolDaysMissed,
      summary: `Shoulder dates next to ${near.r.h.name}: misses ${school}. Often cheaper than the holiday itself. Term-time absence needs your school's agreement.`,
    };
  }
  return {
    status: "term_time",
    holiday: overlapped,
    daysInHoliday,
    schoolDaysMissed,
    summary: `Term time: misses ${school}. Term-time absence needs your school's agreement.`,
  };
}

/**
 * The week before and after each holiday: the "shoulder" dates worth checking for lower prices.
 */
export function shoulderWeeks(holiday: SchoolHoliday): { before: [string, string]; after: [string, string] } {
  const s = parseDay(holiday.startsOn);
  const e = parseDay(holiday.endsOn);
  return {
    before: [formatDay(s - SHOULDER_DAYS), formatDay(s - 1)],
    after: [formatDay(e + 1), formatDay(e + SHOULDER_DAYS)],
  };
}
