import type { Metadata } from "next";
import Link from "next/link";
import { classifyTrip, shoulderWeeks, type TripWindow } from "@truevsad/true-cost";
import { loadAuthorities, loadHolidays, type HolidayRow } from "@/lib/school";
import { EMAILS } from "@/lib/company";

export const runtime = "nodejs";
export const preferredRegion = "lhr1";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "School Window — TrueVsAd",
  description:
    "See your council's school holidays, the shoulder weeks either side, and how many school days a trip would miss.",
};

type Search = Promise<{ council?: string; date?: string; nights?: string }>;

const STATUS_LABEL: Record<TripWindow["status"], string> = {
  school_holiday: "School holiday",
  shoulder: "Shoulder dates",
  term_time: "Term time",
};

function nice(d: string): string {
  return new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function short(d: string): string {
  return new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

export default async function SchoolWindowPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const authorities = await loadAuthorities();
  const council = authorities.find((a) => a.authority === sp.council)?.authority ?? "";
  const holidays = council ? await loadHolidays(council) : [];

  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : "";
  const nightsNum = Number(sp.nights ?? 7);
  const nights = Number.isInteger(nightsNum) && nightsNum >= 0 && nightsNum <= 60 ? nightsNum : 7;

  let trip: TripWindow | null = null;
  if (council && date && holidays.length) {
    try {
      trip = classifyTrip(date, nights, holidays);
    } catch {
      trip = null;
    }
  }

  const byYear = new Map<string, HolidayRow[]>();
  for (const h of holidays) byYear.set(h.schoolYear, [...(byYear.get(h.schoolYear) ?? []), h]);

  return (
    <main>
      <h1>School Window</h1>
      <p className="lead">
        Your council&apos;s school holidays, the quieter &ldquo;shoulder&rdquo; weeks either side, and
        how many school days a trip would miss.
      </p>

      {authorities.length === 0 ? (
        <div className="card">
          <p style={{ marginTop: 0 }}>
            We&apos;re adding council term dates now, each one checked against the council&apos;s own
            website. This page will fill in as they arrive.
          </p>
          <p className="hint">
            Want your council first? Tell us at <a href={`mailto:${EMAILS.hello}`}>{EMAILS.hello}</a>.
          </p>
        </div>
      ) : (
        <form className="card" method="get">
          <label htmlFor="council">Your council</label>
          <select id="council" name="council" defaultValue={council}>
            <option value="">Choose…</option>
            {authorities.map((a) => (
              <option key={a.authority} value={a.authority}>
                {a.authority}
              </option>
            ))}
          </select>
          <div className="row">
            <div>
              <label htmlFor="date">Check a trip (optional)</label>
              <input id="date" name="date" type="date" defaultValue={date} />
            </div>
            <div>
              <label htmlFor="nights">Nights</label>
              <input id="nights" name="nights" inputMode="numeric" defaultValue={String(nights)} />
            </div>
          </div>
          <button type="submit">Show</button>
        </form>
      )}

      {trip && (
        <div className={`card status status-${trip.status}`}>
          <strong>{STATUS_LABEL[trip.status]}</strong>
          <p style={{ margin: "4px 0 0" }}>{trip.summary}</p>
          <p className="hint">
            {nice(date)} for {nights} night{nights === 1 ? "" : "s"}.
          </p>
        </div>
      )}

      {[...byYear.entries()].map(([year, list]) => (
        <div className="card" key={year}>
          <h2 style={{ marginTop: 0 }}>{council} · {year}</h2>
          <table className="receipt">
            <tbody>
              {list.map((h) => {
                const s = shoulderWeeks(h);
                return (
                  <tr key={h.name + h.startsOn}>
                    <td>
                      {h.name}
                      <div className="working">
                        Shoulder weeks: {short(s.before[0])}–{short(s.before[1])} and {short(s.after[0])}–
                        {short(s.after[1])}
                      </div>
                    </td>
                    <td className="amt">
                      {short(h.startsOn)} – {short(h.endsOn)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="hint">
            Dates are the first and last day off school. Source:{" "}
            <a href={list[0]!.sourceUrl} rel="noopener noreferrer" target="_blank">
              {council} council
            </a>
            . Academies and faith schools can differ, so check with your school.
          </p>
        </div>
      ))}

      <p className="hint">
        Taking a child out of school in term time needs the head teacher&apos;s agreement, and councils
        can fine for unauthorised absence. Shoulder weeks are shown so you can compare prices, not as
        advice to miss school.
      </p>
      <p>
        <Link href="/xray">X-ray a deal for these dates →</Link>
      </p>
    </main>
  );
}
