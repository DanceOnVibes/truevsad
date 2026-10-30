"use client";

import { useState } from "react";
import { formatGBP, type CostCategory, type TrueCostResult } from "@truevsad/true-cost";

type Step = "paste" | "confirm" | "receipt";

const CATEGORY_LABELS: Record<CostCategory, string> = {
  supplier: "Flight + stay",
  party_extra: "Party extras",
  levy: "Taxes & levies",
  entry_doc: "Entry documents",
  door_to_door: "Door to door",
  payment_fx: "Payment & FX",
};

export default function XrayPage() {
  const [step, setStep] = useState<Step>("paste");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<string[]>([]);

  // Step 1 — paste
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);

  // Step 2 — confirm (all editable)
  const [price, setPrice] = useState("");
  const [basis, setBasis] = useState<"per_person" | "total">("per_person");
  const [nights, setNights] = useState("7");
  const [destination, setDestination] = useState("");
  const [adults, setAdults] = useState("2");
  const [childAges, setChildAges] = useState("");
  const [postcode, setPostcode] = useState("");

  // Step 3 — receipt
  const [result, setResult] = useState<TrueCostResult | null>(null);

  async function post(payload: unknown) {
    const res = await fetch("/api/xray", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
    return data;
  }

  async function onExtract() {
    setBusy(true);
    setError(null);
    try {
      const data = await post({ step: "extract", url, text, hasScreenshot: !!screenshot });
      const d = data.draft ?? {};
      if (d.headlinePence) setPrice((d.headlinePence / 100).toFixed(2));
      if (d.headlineBasis) setBasis(d.headlineBasis);
      if (d.nights) setNights(String(d.nights));
      if (d.destination) setDestination(d.destination);
      setNotes(data.notes ?? []);
      setStep("confirm");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onQuote() {
    setBusy(true);
    setError(null);
    try {
      const ages = childAges
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map(Number);
      const data = await post({
        step: "quote",
        party: { adults: Number(adults), childAges: ages, outwardPostcode: postcode },
        offer: {
          headlinePence: Math.round(parseFloat(price) * 100),
          headlineBasis: basis,
          currency: "GBP",
          nights: Number(nights),
          destination: destination || undefined,
        },
      });
      setResult(data.result);
      setStep("receipt");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <h1>Deal X-ray</h1>
      <p className="lead">Paste a holiday deal. We&apos;ll show what it really costs your family.</p>

      {error && <p className="error">{error}</p>}

      {step === "paste" && (
        <div className="card">
          <label htmlFor="url">Link to the deal</label>
          <input
            id="url"
            type="url"
            placeholder="https://…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <p className="hint">We keep the link for reference only — we never open it ourselves.</p>

          <label htmlFor="text">Deal text</label>
          <textarea
            id="text"
            placeholder="e.g. 7 nights in Tenerife, 4★ all inclusive, from £499pp"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <label htmlFor="shot">Or a screenshot</label>
          <input
            id="shot"
            type="file"
            accept="image/*"
            onChange={(e) => setScreenshot(e.target.files?.[0] ?? null)}
          />

          <button onClick={onExtract} disabled={busy || (!url && !text && !screenshot)}>
            {busy ? "Reading…" : "Read the deal"}
          </button>
        </div>
      )}

      {step === "confirm" && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Check the details</h2>
          {notes.map((n) => (
            <p key={n} className="hint">• {n}</p>
          ))}

          <div className="row">
            <div>
              <label htmlFor="price">Advertised price (£)</label>
              <input id="price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div>
              <label htmlFor="basis">Price is</label>
              <select id="basis" value={basis} onChange={(e) => setBasis(e.target.value as typeof basis)}>
                <option value="per_person">per person</option>
                <option value="total">total for everyone</option>
              </select>
            </div>
            <div>
              <label htmlFor="nights">Nights</label>
              <input id="nights" inputMode="numeric" value={nights} onChange={(e) => setNights(e.target.value)} />
            </div>
          </div>

          <label htmlFor="dest">Destination</label>
          <input id="dest" value={destination} onChange={(e) => setDestination(e.target.value)} />

          <h3>Who&apos;s going</h3>
          <div className="row">
            <div>
              <label htmlFor="adults">Adults</label>
              <input id="adults" inputMode="numeric" value={adults} onChange={(e) => setAdults(e.target.value)} />
            </div>
            <div>
              <label htmlFor="kids">Children&apos;s ages</label>
              <input id="kids" placeholder="e.g. 7, 1" value={childAges} onChange={(e) => setChildAges(e.target.value)} />
            </div>
            <div>
              <label htmlFor="pc">Postcode (first part)</label>
              <input id="pc" placeholder="e.g. SE11" value={postcode} onChange={(e) => setPostcode(e.target.value)} />
            </div>
          </div>
          <p className="hint">Ages only — no dates of birth, no names. We keep only the first half of your postcode.</p>

          <button onClick={onQuote} disabled={busy || !price}>
            {busy ? "Working it out…" : "Show the true price"}
          </button>{" "}
          <button className="secondary" onClick={() => setStep("paste")}>Back</button>
        </div>
      )}

      {step === "receipt" && result && (
        <div className="card">
          {result.usedDemoRules && (
            <p className="warn">
              Demo figures — extras below are placeholders, not real prices yet. Do not use this to
              make a booking decision.
            </p>
          )}

          <div className="headline">
            <div>
              <div className="hint">Advertised</div>
              <div className="num">{formatGBP(result.advertisedPence)}</div>
            </div>
            <div className="num">→</div>
            <div>
              <div className="hint">True all-in</div>
              <div className="num">{formatGBP(result.trueCostPence)}</div>
            </div>
            <div>
              <div className="hint">Gap</div>
              <div className="num gap">
                {result.gapPence > 0 ? "+" : ""}
                {formatGBP(result.gapPence)} ({Math.round(result.gapRatio * 100)}%)
              </div>
            </div>
          </div>
          <p className="hint">Confidence: {Math.round(result.confidence * 100)}%</p>

          <h3>Receipt</h3>
          <table className="receipt">
            <tbody>
              {result.receipt.lines.map((l, i) => (
                <tr key={i}>
                  <td>
                    {l.label}
                    <div className="working">
                      {CATEGORY_LABELS[l.category]}
                      {l.working ? ` · ${l.working}` : ""}
                    </div>
                  </td>
                  <td className="amt">{formatGBP(l.amountPence)}</td>
                </tr>
              ))}
              <tr className="total">
                <td>True all-in price</td>
                <td className="amt">{formatGBP(result.trueCostPence)}</td>
              </tr>
            </tbody>
          </table>

          <p className="hint">Shareable receipt link coming soon.</p>
          <button className="secondary" onClick={() => setStep("confirm")}>Edit details</button>
        </div>
      )}
    </main>
  );
}
