"use client";

import { useMemo, useState } from "react";
import { familyWindows, quoteDifference, formatGBP, type DaysOff, type FamilyWindow } from "@truevsad/true-cost";

/**
 * FairFam: your school dates, your family, one honest price.
 *
 * 1. Who's going (ages only)  2. Your school holidays (council, plus any school with its own dates)
 * 3. The windows when EVERY child is off  4. Search the sellers yourself, then X-ray the deal
 * 5. Optional: compare your own two quotes (holiday week vs a week either side).
 *
 * Nothing on this page is saved. The only hand-over is to Deal X-ray, in this browser tab only.
 */

/** Holiday sellers' own sites, in alphabetical order. We're not paid by any of them. */
const SELLERS = [
  { name: "easyJet holidays", url: "https://www.easyjet.com/en/holidays" },
  { name: "Jet2holidays", url: "https://www.jet2holidays.com/" },
  { name: "loveholidays", url: "https://www.loveholidays.com/" },
  { name: "On the Beach", url: "https://www.onthebeach.co.uk/" },
  { name: "TUI", url: "https://www.tui.co.uk/" },
];

interface Holiday extends DaysOff {
  sourceUrl?: string;
  checkedOn?: string | null;
}

interface OwnSchool {
  label: string;
  rows: { name: string; startsOn: string; endsOn: string }[];
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function nice(d: string, withYear = true): string {
  return new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  });
}

function addDays(d: string, n: number): string {
  const t = Date.parse(`${d}T00:00:00Z`) + n * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

async function post(payload: unknown) {
  const res = await fetch("/api/fairfam", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
  return data;
}

export function FairFamClient({ councils }: { councils: string[] }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // 1. Who's going
  const [adults, setAdults] = useState("2");
  const [childAges, setChildAges] = useState("");

  // 2. School holidays
  const [postcode, setPostcode] = useState("");
  const [lookup, setLookup] = useState<{ outcode: string; found: string[]; councils: string[] } | null>(null);
  const [council, setCouncil] = useState("");
  const [nation, setNation] = useState("");
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [allSameDates, setAllSameDates] = useState<"yes" | "no" | "">("");
  const [ownSchools, setOwnSchools] = useState<OwnSchool[]>([]);

  // 3–5
  const [picked, setPicked] = useState<FamilyWindow | null>(null);
  const [departDate, setDepartDate] = useState("");
  const [nights, setNights] = useState("7");
  const [copied, setCopied] = useState(false);
  const [holidayQuote, setHolidayQuote] = useState("");
  const [otherQuote, setOtherQuote] = useState("");

  const ages = childAges
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number)
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 17);
  const adultsNum = Number(adults);

  async function findCouncil() {
    setBusy(true);
    setError(null);
    try {
      const data = await post({ step: "council", postcode });
      setLookup(data);
      if (data.councils.length === 1) await chooseCouncil(data.councils[0]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function chooseCouncil(name: string) {
    setCouncil(name);
    setPicked(null);
    setHolidays([]);
    if (!name) return;
    setBusy(true);
    setError(null);
    try {
      const data = await post({ step: "holidays", council: name });
      setNation(data.nation ?? "");
      setHolidays(data.holidays ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // Each calendar: the council's (if chosen), plus every school with its own dates.
  const calendars: DaysOff[][] = useMemo(() => {
    const own = ownSchools
      .map((s) => s.rows.filter((r) => DATE.test(r.startsOn) && DATE.test(r.endsOn) && r.endsOn >= r.startsOn))
      .filter((rows) => rows.length > 0);
    const list: DaysOff[][] = [];
    if (council && holidays.length) list.push(holidays);
    if (allSameDates === "no" || !council) list.push(...own);
    return list;
  }, [council, holidays, ownSchools, allSameDates]);

  const today = new Date().toISOString().slice(0, 10);
  const windows = useMemo(() => familyWindows(calendars, today), [calendars, today]);

  const nightsNum = Number(nights);
  const returnDate = departDate && Number.isInteger(nightsNum) ? addDays(departDate, nightsNum) : "";
  const tripFits =
    picked && departDate && returnDate && departDate >= picked.startsOn && returnDate <= picked.endsOn && nightsNum >= 1;

  const who = [
    `${adultsNum} adult${adultsNum === 1 ? "" : "s"}`,
    ages.length ? `children aged ${ages.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join(", ");
  const summary = tripFits
    ? `${who} · out ${nice(departDate)} · ${nightsNum} night${nightsNum === 1 ? "" : "s"} · back ${nice(returnDate)}`
    : "";

  function pickWindow(w: FamilyWindow) {
    setPicked(w);
    setDepartDate(w.startsOn);
    setNights(String(Math.min(7, Math.max(1, w.maxNights))));
    setCopied(false);
  }

  function toXray() {
    // One-time hand-over in this tab only; Deal X-ray reads it once and deletes it.
    try {
      sessionStorage.setItem(
        "truevsad-fairfam",
        JSON.stringify({ adults: adultsNum, childAges: ages, departDate, nights: nightsNum }),
      );
    } catch {
      /* the X-ray still works, the family just types the details */
    }
    window.location.href = "/xray";
  }

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const diff = quoteDifference(Math.round(parseFloat(holidayQuote) * 100), Math.round(parseFloat(otherQuote) * 100));
  const source = holidays[0];

  return (
    <main>
      <h1>FairFam</h1>
      <p className="lead">
        Your school dates. Your family. One honest price. Find the weeks your whole family can travel,
        then check any deal&apos;s true price for your exact party.
      </p>
      {error && <p className="error">{error}</p>}

      {/* 1. Who's going */}
      <div className="card">
        <h2 style={{ marginTop: 0 }}>1. Who&apos;s going</h2>
        <div className="row">
          <div>
            <label htmlFor="ff-adults">Adults</label>
            <input id="ff-adults" inputMode="numeric" value={adults} onChange={(e) => setAdults(e.target.value)} />
          </div>
          <div>
            <label htmlFor="ff-kids">Children&apos;s ages</label>
            <input id="ff-kids" placeholder="e.g. 7, 11" value={childAges} onChange={(e) => setChildAges(e.target.value)} />
          </div>
        </div>
        <p className="hint">Ages only. Nothing on this page is saved.</p>
      </div>

      {/* 2. School holidays */}
      <div className="card">
        <h2 style={{ marginTop: 0 }}>2. Your school holidays</h2>
        <div className="row">
          <div>
            <label htmlFor="ff-pc">First half of your postcode</label>
            <input id="ff-pc" placeholder="e.g. SE11" value={postcode} onChange={(e) => setPostcode(e.target.value)} />
          </div>
          <div>
            <label htmlFor="ff-council">Or choose your council</label>
            <select id="ff-council" value={council} onChange={(e) => chooseCouncil(e.target.value)}>
              <option value="">Choose…</option>
              {councils.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button type="button" onClick={findCouncil} disabled={busy || !postcode.trim()}>
          {busy ? "Looking…" : "Find my council"}
        </button>
        {lookup && (
          <p className="hint">
            {lookup.councils.length === 1
              ? `${lookup.outcode} is in ${lookup.councils[0]}.`
              : lookup.councils.length > 1
                ? `${lookup.outcode} covers parts of ${lookup.councils.join(" and ")}. Choose the council your child's school is in.`
                : lookup.found.length
                  ? `${lookup.outcode} is in ${lookup.found.join(" / ")}. We don't hold term dates for it yet, so add your school's dates below.`
                  : `We couldn't find ${lookup.outcode}. Choose your council, or add your school's dates below.`}
          </p>
        )}
        {source?.sourceUrl && (
          <p className="hint">
            {council} dates from the{" "}
            <a href={source.sourceUrl} target="_blank" rel="noopener noreferrer">
              council&apos;s own page
            </a>
            {source.checkedOn ? `, checked ${nice(source.checkedOn)}` : ""}.
          </p>
        )}

        {council && (
          <fieldset className="includes">
            <legend>Does every child&apos;s school use {council}&apos;s dates?</legend>
            <label className="check">
              <input type="radio" name="same" checked={allSameDates === "yes"} onChange={() => setAllSameDates("yes")} /> Yes
            </label>
            <label className="check">
              <input
                type="radio"
                name="same"
                checked={allSameDates === "no"}
                onChange={() => {
                  setAllSameDates("no");
                  if (ownSchools.length === 0) setOwnSchools([{ label: "School 1", rows: [{ name: "", startsOn: "", endsOn: "" }] }]);
                }}
              />{" "}
              No, or not sure
            </label>
            <p className="hint">
              Academies and many faith schools set their own dates: about half of schools in England, and
              most secondary schools. Check your school&apos;s website, and remember INSET days.
            </p>
          </fieldset>
        )}

        {(allSameDates === "no" || (!council && (lookup || ownSchools.length > 0))) && (
          <div>
            <h3>Schools with their own dates</h3>
            {ownSchools.map((s, si) => (
              <div key={si} className="own-school">
                <label htmlFor={`ff-school-${si}`}>Which school (for you only)</label>
                <input
                  id={`ff-school-${si}`}
                  value={s.label}
                  onChange={(e) =>
                    setOwnSchools((cur) => cur.map((x, i) => (i === si ? { ...x, label: e.target.value } : x)))
                  }
                />
                {s.rows.map((r, ri) => (
                  <div className="row" key={ri}>
                    <div>
                      <label htmlFor={`ff-h-${si}-${ri}`}>Holiday</label>
                      <input
                        id={`ff-h-${si}-${ri}`}
                        placeholder="e.g. October half term"
                        value={r.name}
                        onChange={(e) => editRow(si, ri, { name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label htmlFor={`ff-s-${si}-${ri}`}>First day off</label>
                      <input id={`ff-s-${si}-${ri}`} type="date" value={r.startsOn} onChange={(e) => editRow(si, ri, { startsOn: e.target.value })} />
                    </div>
                    <div>
                      <label htmlFor={`ff-e-${si}-${ri}`}>Last day off</label>
                      <input id={`ff-e-${si}-${ri}`} type="date" value={r.endsOn} onChange={(e) => editRow(si, ri, { endsOn: e.target.value })} />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    setOwnSchools((cur) =>
                      cur.map((x, i) => (i === si ? { ...x, rows: [...x.rows, { name: "", startsOn: "", endsOn: "" }] } : x)),
                    )
                  }
                >
                  Add another holiday
                </button>
              </div>
            ))}
            <button
              type="button"
              className="secondary"
              onClick={() =>
                setOwnSchools((cur) => [
                  ...cur,
                  { label: `School ${cur.length + 1}`, rows: [{ name: "", startsOn: "", endsOn: "" }] },
                ])
              }
            >
              Add another school
            </button>
            <p className="hint">
              Children at different schools? We show only the days they are all off.
            </p>
          </div>
        )}
      </div>

      {/* 3. Windows */}
      {calendars.length > 0 && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>3. When your whole family can go</h2>
          {windows.length === 0 ? (
            <p>No days when every child is off. Check the dates you entered.</p>
          ) : (
            <table className="receipt">
              <tbody>
                {windows.slice(0, 12).map((w) => (
                  <tr key={w.startsOn}>
                    <td>
                      {w.names.length ? w.names.join(" / ") : "Days off"}
                      <div className="working">
                        {nice(w.startsOn)} to {nice(w.endsOn)} · {w.days} days · up to {w.maxNights} nights
                        {w.narrowed ? " · shorter because the schools' dates differ" : ""}
                      </div>
                    </td>
                    <td className="amt">
                      <button
                        type="button"
                        className={picked?.startsOn === w.startsOn ? "chip sel" : "chip"}
                        onClick={() => pickWindow(w)}
                      >
                        {picked?.startsOn === w.startsOn ? "Chosen" : "Choose"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="hint">
            {nation === "England" || nation === ""
              ? "Taking children out of school in term time needs the head teacher's agreement. In England, councils can fine £80 per parent for each child (£160 if paid late). We show school holidays only."
              : "Taking children out of school in term time needs the school's agreement, and the rules differ outside England. We show school holidays only."}
          </p>
        </div>
      )}

      {/* 4. Search the sellers */}
      {picked && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>4. Search, then check the true price</h2>
          <div className="row">
            <div>
              <label htmlFor="ff-depart">Fly out</label>
              <input
                id="ff-depart"
                type="date"
                min={picked.startsOn}
                max={picked.endsOn}
                value={departDate}
                onChange={(e) => setDepartDate(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="ff-nights">Nights</label>
              <input id="ff-nights" inputMode="numeric" value={nights} onChange={(e) => setNights(e.target.value)} />
            </div>
          </div>
          {!tripFits && departDate && (
            <p className="warn">
              That trip runs outside the window ({nice(picked.startsOn)} to {nice(picked.endsOn)}). Pick an
              earlier date or fewer nights.
            </p>
          )}
          {tripFits && (
            <>
              <p className="summary-line">
                <strong>{summary}</strong>
              </p>
              <button type="button" className="secondary" onClick={copySummary}>
                {copied ? "Copied ✓" : "Copy these details"}
              </button>
              <p className="hint">
                Search with these details on any seller&apos;s own site. Their prices are live; ours come
                only from the deal you bring back.
              </p>
              <ul className="seller-links">
                {SELLERS.map((s) => (
                  <li key={s.name}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer">
                      {s.name} ↗
                    </a>
                  </li>
                ))}
              </ul>
              <p className="hint">
                In alphabetical order. We&apos;re not paid by any of these sellers, and you can check any
                other seller&apos;s deal the same way.
              </p>
              <button type="button" onClick={toXray}>
                Found a deal? Check its true price →
              </button>
              <p className="hint">
                Opens Deal X-ray with your party, date and nights filled in. Paste the deal or a
                screenshot there.
              </p>
            </>
          )}
        </div>
      )}

      {/* 5. Your own half-term check */}
      {picked && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>5. Is the school holiday costing you more?</h2>
          <p className="hint">
            Price the same holiday twice: same hotel, room, board, airport and party. Once on your dates,
            once a week before or after.
          </p>
          <div className="row">
            <div>
              <label htmlFor="ff-q1">Price on your holiday dates (£)</label>
              <input id="ff-q1" inputMode="decimal" value={holidayQuote} onChange={(e) => setHolidayQuote(e.target.value)} />
            </div>
            <div>
              <label htmlFor="ff-q2">Price for the other week (£)</label>
              <input id="ff-q2" inputMode="decimal" value={otherQuote} onChange={(e) => setOtherQuote(e.target.value)} />
            </div>
          </div>
          {diff && (
            <p>
              {diff.pence > 0
                ? `Your holiday dates cost ${formatGBP(diff.pence)} (${diff.percent}%) more for the same holiday.`
                : diff.pence < 0
                  ? `Your holiday dates are ${formatGBP(-diff.pence)} (${-diff.percent}%) cheaper for the same holiday.`
                  : "Both weeks cost the same."}
            </p>
          )}
          <p className="hint">
            Worked out on your device from your own two prices. We don&apos;t save it, and it&apos;s only as
            good as the two quotes being for the same holiday.
          </p>
        </div>
      )}
    </main>
  );

  function editRow(si: number, ri: number, patch: Partial<OwnSchool["rows"][number]>) {
    setOwnSchools((cur) =>
      cur.map((x, i) => (i === si ? { ...x, rows: x.rows.map((r, j) => (j === ri ? { ...r, ...patch } : r)) } : x)),
    );
  }
}
