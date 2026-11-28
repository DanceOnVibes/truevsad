"use client";

import { useMemo, useState } from "react";
import {
  daysLeft,
  DISCRETION_REASON,
  reasonsFor,
  ticketSteps,
  ticketVerdict,
  type TicketKind,
  type TicketReason,
} from "@truevsad/true-cost";

const KINDS: { kind: TicketKind; label: string; hint: string }[] = [
  { kind: "street", label: "Left on my car or handed to me", hint: "A parking ticket from a parking officer" },
  { kind: "camera_parking", label: "Came by post, for parking", hint: "Caught parked by a camera" },
  { kind: "moving", label: "Came by post, for driving", hint: "A school street, no entry, banned turn or yellow box" },
];

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function nice(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

function left(n: number): string {
  if (n < 0) return "passed";
  if (n === 0) return "today";
  return n === 1 ? "1 day left" : `${n} days left`;
}

/** Lambeth ticket checker: worked out on the phone, nothing is sent or saved. */
export function TicketChecker() {
  const [kind, setKind] = useState<TicketKind | null>(null);
  const [date, setDate] = useState("");
  const [ticked, setTicked] = useState<string[]>([]);
  const today = todayIso();
  const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= today;

  const reasons = kind ? reasonsFor(kind) : [];
  const all: readonly TicketReason[] = kind ? [...reasons, DISCRETION_REASON] : [];
  const chosen = all.filter((r) => ticked.includes(r.id));
  const verdict = kind ? ticketVerdict(ticked, kind) : "none";
  const steps = useMemo(() => (kind && dateOk ? ticketSteps(kind, date) : []), [kind, date, dateOk]);

  function toggle(id: string) {
    setTicked((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]));
  }

  return (
    <>
      <div className="card form-ink">
        <fieldset className="includes" style={{ marginTop: 0 }}>
          <legend>1. How did you get the ticket?</legend>
          {KINDS.map((k) => (
            <label key={k.kind} className="check" style={{ alignItems: "flex-start" }}>
              <input
                type="radio"
                name="kind"
                style={{ marginTop: 4, flex: "0 0 auto" }}
                checked={kind === k.kind}
                onChange={() => {
                  setKind(k.kind);
                  setTicked([]);
                }}
              />
              <span>
                <strong>{k.label}</strong>
                <span className="hint" style={{ display: "block" }}>
                  {k.hint}
                </span>
              </span>
            </label>
          ))}
        </fieldset>

        <label htmlFor="pcn-date" style={{ marginTop: 16 }}>
          2. The date on the ticket
        </label>
        <input id="pcn-date" type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} />
        {date && !dateOk && <p className="error">That date is in the future. Use the date printed on the ticket.</p>}

        {kind && (
          <fieldset className="includes">
            <legend>3. Which of these is true? Tick all that apply</legend>
            {all.map((r) => (
              <label key={r.id} className="check" style={{ alignItems: "flex-start" }}>
                <input
                  type="checkbox"
                  style={{ marginTop: 4, flex: "0 0 auto" }}
                  checked={ticked.includes(r.id)}
                  onChange={() => toggle(r.id)}
                />
                <span>{r.ask}</span>
              </label>
            ))}
          </fieldset>
        )}
        <p className="hint">Worked out on your phone. Nothing you tick or type is sent or saved.</p>
      </div>

      {kind && ticked.length > 0 && (
        <div className="card" aria-live="polite">
          {verdict === "grounds" && (
            <h2 style={{ marginTop: 0 }} className="t-go">
              Worth challenging: {chosen.filter((r) => r.ground).length === 1 ? "a ground" : "grounds"} in the rules may apply
            </h2>
          )}
          {verdict === "discretion_only" && (
            <h2 style={{ marginTop: 0 }} className="t-check">
              No legal ground ticked, but you can still ask Lambeth to cancel it
            </h2>
          )}
          <p className="hint">
            This shows which rules may help, not whether you&apos;ll win. Lambeth, and then an independent adjudicator,
            decide each case on its evidence.
          </p>
          {chosen.map((r) => (
            <div key={r.id} style={{ borderTop: "1px solid var(--line)", paddingTop: 10, marginTop: 12 }}>
              <h3 style={{ margin: "0 0 4px" }}>{r.ground ?? "Ask Lambeth to use its discretion"}</h3>
              <p style={{ margin: "0 0 6px" }}>{r.why}</p>
              <p style={{ margin: "0 0 2px" }}>
                <strong>Evidence to gather:</strong>
              </p>
              <ul style={{ margin: "0 0 6px" }}>
                {r.evidence.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
              <p className="hint">
                Source:{" "}
                <a href={r.source.url} target="_blank" rel="noopener noreferrer">
                  {r.source.label}
                </a>
              </p>
            </div>
          ))}
        </div>
      )}

      {steps.length > 0 && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Your dates</h2>
          <p className="hint">Counted from {nice(date)}, the date on your ticket.</p>
          <table className="receipt">
            <tbody>
              {steps.map((s) => {
                const n = s.by ? daysLeft(today, s.by) : null;
                return (
                  <tr key={s.title}>
                    <td>
                      <strong>{s.title}</strong>
                      {s.by && (
                        <div>
                          By {nice(s.by)}{" "}
                          <span className={n !== null && n < 0 ? "t-stop" : n !== null && n <= 3 ? "t-check" : "t-go"}>
                            ({n !== null ? left(n) : ""})
                          </span>
                        </div>
                      )}
                      <div className="working">
                        {s.detail}{" "}
                        <a href={s.source.url} target="_blank" rel="noopener noreferrer">
                          Source
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
