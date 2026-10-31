"use client";

import { useState } from "react";
import { AIRLINE_BAGS, bagFits, type BagAllowance, type FitResult } from "@truevsad/true-cost";

const LABEL: Record<FitResult, string> = {
  fits: "Fits",
  fits_if_wheels: "Fits only if the extra is wheels",
  too_heavy: "Too heavy",
  too_big: "Too big",
  not_checked: "Not checked yet",
};

/** "Will my bag fit?" — worked out on the device, nothing sent or saved. */
export function BagChecker() {
  const [l, setL] = useState("");
  const [w, setW] = useState("");
  const [h, setH] = useState("");
  const [kg, setKg] = useState("");
  const dims = [l, w, h].map((v) => parseFloat(v));
  const ready = dims.every((d) => Number.isFinite(d) && d > 0 && d < 200);
  const weight = parseFloat(kg);
  const bag = ready ? { dims: dims as [number, number, number], kg: Number.isFinite(weight) && weight > 0 ? weight : undefined } : null;

  function cell(b: BagAllowance | undefined) {
    if (!bag || !b) return null;
    const r = bagFits(bag, b);
    return <span className={`fit fit-${r}`}>{LABEL[r]}</span>;
  }

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Will my bag fit?</h2>
      <div className="row">
        <div>
          <label htmlFor="bag-l">Height (cm)</label>
          <input id="bag-l" inputMode="decimal" value={l} onChange={(e) => setL(e.target.value)} />
        </div>
        <div>
          <label htmlFor="bag-w">Width (cm)</label>
          <input id="bag-w" inputMode="decimal" value={w} onChange={(e) => setW(e.target.value)} />
        </div>
        <div>
          <label htmlFor="bag-h">Depth (cm)</label>
          <input id="bag-h" inputMode="decimal" value={h} onChange={(e) => setH(e.target.value)} />
        </div>
        <div>
          <label htmlFor="bag-kg">Weight (kg, optional)</label>
          <input id="bag-kg" inputMode="decimal" value={kg} onChange={(e) => setKg(e.target.value)} />
        </div>
      </div>
      <p className="hint">
        Measure the outside of the bag with wheels, handles and pockets, the way the airport sizer does.
        Worked out on your phone; nothing is sent or saved.
      </p>
      {bag && (
        <div className="table-wrap">
          <table className="receipt data-table">
            <thead>
              <tr>
                <th>Airline</th>
                <th>Free under-seat bag</th>
                <th>Cabin bag</th>
              </tr>
            </thead>
            <tbody>
              {AIRLINE_BAGS.map((a) => {
                const under = a.bags.find((b) => b.kind === "underseat");
                const cabin = a.bags.find((b) => b.kind === "cabin");
                return (
                  <tr key={a.airline}>
                    <td>{a.airline}</td>
                    <td>{cell(under)}</td>
                    <td>
                      {cell(cabin)}
                      {cabin && cabin.price !== "free" && (
                        <div className="working">{cabin.price === "paid" ? "paid extra" : "some fares only"}</div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
