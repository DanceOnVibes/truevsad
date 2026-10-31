"use client";

import { useState } from "react";
import { formatGBP } from "@truevsad/true-cost";

interface FamilyInput {
  adults: string;
  ages: string;
}

interface Share {
  adults: number;
  children: number;
  people: number;
  trueCostPence: number;
  perPersonPence: number;
}

/**
 * Fair Share: two or more families on one deal. Each family pays for its own people
 * (price, bags, taxes); whole-party costs are split equally. Nothing is saved.
 */
export function FairSharePanel(props: {
  offer: Record<string, unknown>;
  party: { adults: number; childAges: number[] };
}) {
  const [open, setOpen] = useState(false);
  const [families, setFamilies] = useState<FamilyInput[]>([
    { adults: String(props.party.adults), ages: props.party.childAges.join(", ") },
    { adults: "2", ages: "" },
  ]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ groupTrueCostPence: number; shares: Share[] } | null>(null);

  function update(i: number, patch: Partial<FamilyInput>) {
    setFamilies((cur) => cur.map((f, j) => (j === i ? { ...f, ...patch } : f)));
    setResult(null);
  }

  async function onSplit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/xray", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "split",
          offer: props.offer,
          families: families.map((f) => ({
            adults: Number(f.adults),
            childAges: f.ages
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
              .map(Number),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not split this deal.");
      setResult(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button className="secondary" onClick={() => setOpen(true)}>
        Going with another family? Split it fairly
      </button>
    );
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Fair Share</h3>
      <p className="hint">
        Each family pays for its own people: the per-person price, bags and taxes. Costs for the
        whole group, like a fee per room, are split equally. Nothing here is saved.
      </p>
      {families.map((f, i) => (
        <div className="row" key={i}>
          <div>
            <label htmlFor={`fa${i}`}>Family {i + 1}: adults</label>
            <input id={`fa${i}`} inputMode="numeric" value={f.adults} onChange={(e) => update(i, { adults: e.target.value })} />
          </div>
          <div>
            <label htmlFor={`fk${i}`}>Children&apos;s ages</label>
            <input id={`fk${i}`} placeholder="e.g. 7, 1" value={f.ages} onChange={(e) => update(i, { ages: e.target.value })} />
          </div>
        </div>
      ))}
      {families.length < 6 && (
        <button className="secondary" onClick={() => setFamilies((c) => [...c, { adults: "2", ages: "" }])}>
          Add a family
        </button>
      )}{" "}
      {families.length > 2 && (
        <button className="secondary" onClick={() => setFamilies((c) => c.slice(0, -1))}>
          Remove last
        </button>
      )}{" "}
      <button onClick={onSplit} disabled={busy}>
        {busy ? "Working it out…" : "Work out the split"}
      </button>
      {error && <p className="error">{error}</p>}
      {result && (
        <table className="receipt" style={{ marginTop: 16 }}>
          <tbody>
            {result.shares.map((s, i) => (
              <tr key={i}>
                <td>
                  Family {i + 1}
                  <div className="working">
                    {s.adults} adult{s.adults === 1 ? "" : "s"}
                    {s.children ? `, ${s.children} child${s.children === 1 ? "" : "ren"}` : ""} ·{" "}
                    {formatGBP(s.perPersonPence)} per person
                  </div>
                </td>
                <td className="amt">{formatGBP(s.trueCostPence)}</td>
              </tr>
            ))}
            <tr className="total">
              <td>Whole group, true price</td>
              <td className="amt">{formatGBP(result.groupTrueCostPence)}</td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}
