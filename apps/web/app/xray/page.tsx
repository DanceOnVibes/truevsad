"use client";

import { useState } from "react";
import { INCLUSIONS, type FairMark, type Inclusion, type TrueCostResult } from "@truevsad/true-cost";
import { INCLUSION_LABELS, supplierDefaults } from "@/lib/supplier-defaults";
import { ReceiptView } from "@/components/ReceiptView";
import { FairSharePanel } from "@/components/FairSharePanel";
import { ChildCostsNote } from "@/components/ChildCostsNote";

const CURRENCIES = { GBP: "£", EUR: "€", USD: "$" } as const;
/** One tap instead of a guess: the airline decides the bag and seat fees. */
const AIRLINES = ["Jet2", "TUI", "easyJet", "Ryanair", "Wizz Air", "British Airways"] as const;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
type Currency = keyof typeof CURRENCIES;

type Step = "paste" | "confirm" | "receipt";

/**
 * Shrink a screenshot in the browser before upload (max 1600px, JPEG) so it's fast,
 * cheap to read and well under the server's size limit.
 */
async function shrinkImage(file: File): Promise<{ mimeType: string; base64: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  return { mimeType: "image/jpeg", base64: dataUrl.split(",")[1]! };
}

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
  const [currency, setCurrency] = useState<Currency>("GBP");
  const [basis, setBasis] = useState<"per_person" | "total">("per_person");
  const [excludesFees, setExcludesFees] = useState(false);
  const [freeChild, setFreeChild] = useState(false);
  const [childCosts, setChildCosts] = useState<{ age: number; pence: number }[]>([]);
  const [councils, setCouncils] = useState<string[]>([]);
  const [airline, setAirline] = useState("");
  const [departMonth, setDepartMonth] = useState("");
  const [holdBags, setHoldBags] = useState("");
  /** Fields the server wants the family to double-check. */
  const [check, setCheck] = useState<string[]>([]);
  const [advertCheck, setAdvertCheck] = useState<Record<string, number> | undefined>(undefined);
  const flag = (field: string) => (check.includes(field) ? "check-me" : undefined);
  const [nights, setNights] = useState("7");
  const [departDate, setDepartDate] = useState("");
  const [destination, setDestination] = useState("");
  const [supplier, setSupplier] = useState("");
  const [includes, setIncludes] = useState<Inclusion[]>([]);
  const [includesTouched, setIncludesTouched] = useState(false);
  const defaults = supplierDefaults(supplier);

  function changeSupplier(value: string) {
    setSupplier(value);
    // Pre-tick from the seller's usual package — but never overwrite the family's own choices.
    if (!includesTouched) setIncludes(supplierDefaults(value)?.includes ?? []);
  }

  function toggleInclude(item: Inclusion) {
    setIncludesTouched(true);
    setIncludes((cur) => (cur.includes(item) ? cur.filter((x) => x !== item) : [...cur, item]));
  }
  const [adults, setAdults] = useState("2");
  const [childAges, setChildAges] = useState("");
  const [postcode, setPostcode] = useState("");

  // Step 3 — receipt
  const [result, setResult] = useState<TrueCostResult | null>(null);
  const [fairMark, setFairMark] = useState<FairMark | null>(null);
  const [listPublicly, setListPublicly] = useState(false);
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [quoted, setQuoted] = useState<{
    offer: Record<string, unknown>;
    party: { adults: number; childAges: number[] };
  } | null>(null);

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
      const image = screenshot ? await shrinkImage(screenshot) : undefined;
      const data = await post({ step: "extract", url, text, image });
      const d = data.draft ?? {};
      if (d.headlinePence) setPrice((d.headlinePence / 100).toFixed(2));
      if (d.headlineBasis) setBasis(d.headlineBasis);
      const extraNotes: string[] = [];
      if (typeof d.currency === "string" && Object.hasOwn(CURRENCIES, d.currency)) setCurrency(d.currency as Currency);
      else if (typeof d.currency === "string" && d.currency) {
        setCurrency("GBP");
        extraNotes.push(`The advert looks priced in ${d.currency}. We can price pounds, euros or US dollars — enter the price in one of those.`);
      }
      setExcludesFees(d.excludesTaxesAndFees === true);
      setFreeChild(d.freeChildClaim === true);
      if (d.nights) setNights(String(d.nights));
      if (d.departDate) setDepartDate(d.departDate);
      if (d.destination) setDestination(d.destination);
      if (d.supplierName) changeSupplier(d.supplierName);
      const knownAirline = AIRLINES.find((a) =>
        [d.airline, d.supplierName].some((x) => typeof x === "string" && x.toLowerCase().includes(a.toLowerCase())),
      );
      setAirline(knownAirline ?? (typeof d.airline === "string" ? d.airline : ""));
      setCheck(Array.isArray(data.check) ? data.check : []);
      // What the advert itself said, kept only to check its maths and who it was priced for.
      const ac: Record<string, number> = {};
      if (d.perPersonPence) ac.perPersonPence = d.perPersonPence;
      if (d.totalPence) ac.totalPence = d.totalPence;
      if (d.adults) ac.adults = d.adults;
      if (d.adults && Array.isArray(d.childAges)) ac.children = d.childAges.length;
      setAdvertCheck(Object.keys(ac).length ? ac : undefined);
      if (d.adults) setAdults(String(d.adults));
      if (Array.isArray(d.childAges) && d.childAges.length) setChildAges(d.childAges.join(", "));
      if (Array.isArray(d.includes) && d.includes.length) {
        // The deal itself said these are included — that beats the seller's usual defaults.
        setIncludes(d.includes);
        setIncludesTouched(true);
      }
      setNotes([...(data.notes ?? []), ...extraNotes]);
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
      const offer = {
        headlinePence: Math.round(parseFloat(price) * 100),
        headlineBasis: basis,
        currency,
        nights: Number(nights),
        destination: destination || undefined,
        supplierName: supplier || undefined,
        includes,
        excludesTaxesAndFees: excludesFees,
        freeChildClaim: freeChild,
        departDate: departDate || undefined,
        departMonth: !departDate && departMonth ? Number(departMonth) : undefined,
        airline: airline || undefined,
        advertCheck,
      };
      const data = await post({
        step: "quote",
        sourceKind: text ? "text" : screenshot ? "screenshot" : "link",
        sourceUrl: url || undefined,
        party: {
          adults: Number(adults),
          childAges: ages,
          outwardPostcode: postcode,
          holdBags: holdBags.trim() === "" ? undefined : Number(holdBags),
        },
        offer,
      });
      setQuoted({ offer, party: { adults: Number(adults), childAges: ages } });
      setCheck([]);
      setResult(data.result);
      setFairMark(data.fairMark ?? null);
      setChildCosts(Array.isArray(data.childCosts) ? data.childCosts : []);
      setCouncils(Array.isArray(data.councils) ? data.councils : []);
      setQuoteId(data.quoteId ?? null);
      setShareUrl(null);
      setCopied(false);
      setStep("receipt");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onShare() {
    if (!quoteId) return;
    setBusy(true);
    setError(null);
    try {
      const data = await post({ step: "share", quoteId, listPublicly });
      const link = `${window.location.origin}${data.path}`;
      setShareUrl(link);
      if (navigator.share) {
        await navigator.share({ title: "The true price of this holiday", url: link }).catch(() => {});
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onCopy() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      setCopied(false);
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
          <p className="hint">
            Tip: crop out names and booking references first. We only read the deal details and
            never keep the screenshot.
          </p>

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
              <label htmlFor="price">Advertised price ({CURRENCIES[currency]})</label>
              <input id="price" className={flag("price")} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div>
              <label htmlFor="currency">Currency</label>
              <select id="currency" value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
                <option value="GBP">£ pounds</option>
                <option value="EUR">€ euros</option>
                <option value="USD">$ US dollars</option>
              </select>
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
              <input id="nights" className={flag("nights")} inputMode="numeric" value={nights} onChange={(e) => setNights(e.target.value)} />
            </div>
            <div>
              <label htmlFor="depart">Travel date (optional)</label>
              <input id="depart" className={flag("depart")} type="date" value={departDate} onChange={(e) => setDepartDate(e.target.value)} />
            </div>
            {!departDate && (
              <div>
                <label htmlFor="month">Or just the month</label>
                <select id="month" value={departMonth} onChange={(e) => setDepartMonth(e.target.value)}>
                  <option value="">Not sure</option>
                  {MONTHS.map((m, i) => (
                    <option key={m} value={String(i + 1)}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <label className={`check ${flag("excludes") ?? ""}`}>
            <input
              type="checkbox"
              checked={excludesFees}
              onChange={(e) => setExcludesFees(e.target.checked)}
            />{" "}
            The advert says &ldquo;plus taxes and fees&rdquo; (or similar)
          </label>
          <label className={`check ${flag("freeChild") ?? ""}`}>
            <input type="checkbox" checked={freeChild} onChange={(e) => setFreeChild(e.target.checked)} />{" "}
            The advert says children go free (&ldquo;free child places&rdquo;)
          </label>

          <div className="row">
            <div>
              <label htmlFor="dest">Destination</label>
              <input
                id="dest"
                placeholder="e.g. Tenerife"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="supplier">Holiday company or airline</label>
              <input
                id="supplier"
                placeholder="e.g. easyJet holidays"
                value={supplier}
                onChange={(e) => changeSupplier(e.target.value)}
              />
            </div>
          </div>
          <p className="hint">These help us add the right local taxes and fees.</p>

          <div className="chips" role="group" aria-label="Airline">
            <span className="hint">Airline flying you:</span>
            {AIRLINES.map((a) => (
              <button
                key={a}
                type="button"
                className={`chip ${airline === a ? "sel" : ""}`}
                aria-pressed={airline === a}
                onClick={() => setAirline(airline === a ? "" : a)}
              >
                {a}
              </button>
            ))}
            <button
              type="button"
              className={`chip ${airline === "" ? "sel" : ""}`}
              aria-pressed={airline === ""}
              onClick={() => setAirline("")}
            >
              Other / not sure
            </button>
          </div>
          <p className="hint">The airline decides the bag and seat fees. Without it we use a typical price and say so.</p>

          <fieldset className="includes">
            <legend>What does this deal already include?</legend>
            {INCLUSIONS.map((item) => (
              <label key={item} className="check">
                <input
                  type="checkbox"
                  checked={includes.includes(item)}
                  onChange={() => toggleInclude(item)}
                />{" "}
                {INCLUSION_LABELS[item]}
              </label>
            ))}
            <p className="hint">
              {defaults && !includesTouched
                ? `Pre-ticked: ${defaults.note}. Check your deal and change anything that's different.`
                : "Tick only what your deal clearly says is included. We won't charge for those."}
            </p>
          </fieldset>

          <h3>Who&apos;s going</h3>
          <div className="row">
            <div>
              <label htmlFor="adults">Adults</label>
              <input id="adults" className={flag("adults")} inputMode="numeric" value={adults} onChange={(e) => setAdults(e.target.value)} />
            </div>
            <div>
              <label htmlFor="kids">Children&apos;s ages</label>
              <input id="kids" placeholder="e.g. 7, 1" value={childAges} onChange={(e) => setChildAges(e.target.value)} />
            </div>
            <div>
              <label htmlFor="pc">Postcode (first part)</label>
              <input id="pc" placeholder="e.g. SE11" value={postcode} onChange={(e) => setPostcode(e.target.value)} />
            </div>
            <div>
              <label htmlFor="bags">Hold bags (whole party)</label>
              <input
                id="bags"
                inputMode="numeric"
                placeholder="1 per 2 people"
                value={holdBags}
                onChange={(e) => setHoldBags(e.target.value)}
              />
            </div>
          </div>
          <p className="hint">
            Bags are advisory: leave it blank and we count one per two people, as a couple often shares
            one. Put 0 if you&apos;re taking cabin bags only.
          </p>
          <p className="hint">Ages only — no dates of birth, no names. Your postcode isn&apos;t kept with the receipt.</p>
          <p className="hint">
            Why we ask: ages decide which bag rules and tourist taxes apply (many are free for younger children). Your postcode
            (optional) lets us find your council&apos;s school holidays, and in our anonymous price
            statistics we keep only its letters (e.g. SE).
          </p>

          <button onClick={onQuote} disabled={busy || !price}>
            {busy ? "Working it out…" : "Show the true price"}
          </button>{" "}
          <button className="secondary" onClick={() => setStep("paste")}>Back</button>
        </div>
      )}

      {step === "receipt" && result && (
        <div className="card">
          <ReceiptView
            {...result}
            lines={result.receipt.lines}
            includes={includes}
            excludesTaxesAndFees={excludesFees}
            fairMark={fairMark ?? undefined}
          />
          <ChildCostsNote costs={childCosts} />

          {quoteId ? (
            shareUrl ? (
              <div>
                <label htmlFor="share">Share link</label>
                <input id="share" readOnly value={shareUrl} onFocus={(e) => e.target.select()} />
                <button onClick={onCopy}>{copied ? "Copied ✓" : "Copy link"}</button>
                <p className="hint">
                  Anyone with this link can see the receipt. It shows the party size, but never
                  your postcode, ages or the deal link.
                </p>
              </div>
            ) : (
              <div>
                <label className="check">
                  <input type="checkbox" checked={listPublicly} onChange={(e) => setListPublicly(e.target.checked)} />{" "}
                  Also show this deal on the public <a href="/fairmark">FairMark board</a>
                </label>
                <p className="hint">
                  Optional. The board shows the destination, seller, nights, party size and prices, never
                  your postcode, children&apos;s ages or the deal link.
                </p>
                <button onClick={onShare} disabled={busy}>
                  {busy ? "Making link…" : "Share this receipt"}
                </button>
              </div>
            )
          ) : (
            <p className="hint">Sharing isn&apos;t available right now.</p>
          )}{" "}
          <button className="secondary" onClick={() => setStep("confirm")}>Edit details</button>

          {quoted && <FairSharePanel offer={quoted.offer} party={quoted.party} />}

          <p className="hint" style={{ marginTop: 16 }}>
            {destination && (
              <>
                <a href={`/visit?q=${encodeURIComponent(destination)}`}>Is {destination.split(",")[0]} right for your group? →</a>
                <br />
              </>
            )}
            <a
              href={`/school-window?${new URLSearchParams(
                {
                  ...(departDate ? { date: departDate } : {}),
                  nights,
                  // Only a council name we hold dates for, and only when the postcode points to one.
                  ...(councils.length === 1 ? { council: councils[0]! } : {}),
                },
              ).toString()}`}
            >
              Check these dates against your school holidays →
            </a>
          </p>
        </div>
      )}
    </main>
  );
}
