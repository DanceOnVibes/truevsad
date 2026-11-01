import type { Metadata } from "next";
import Link from "next/link";
import { AIRLINE_BAGS, BAGS_NOT_CHECKED, type BagAllowance } from "@truevsad/true-cost";
import { BagChecker } from "./BagChecker";

export const metadata: Metadata = {
  title: "Cabin bag sizes by airline, and will my bag fit? — TrueVsAd",
  description:
    "Free under-seat and cabin bag sizes for Ryanair, easyJet, Jet2, TUI, BA, Wizz Air, Norwegian and more, from each airline's own page with the date we checked. Measure your bag and see where it flies free.",
};

const PRICE: Record<BagAllowance["price"], string> = {
  free: "Free on every fare",
  paid: "Paid extra",
  some_fares: "Included on some fares",
};

function size(b: BagAllowance): string {
  if (!b.dims || !b.verified) return "Not checked yet";
  const kg = b.maxKg ? `, up to ${b.maxKg}kg` : "";
  return `${b.dims.join(" × ")} cm${kg}`;
}

function wheels(b: BagAllowance): string {
  if (b.wheelsCount === "yes") return "Wheels and handles count";
  if (b.wheelsCount === "no") return `Wheels and handles don't count (up to ${b.wheelExtraCm ?? 0}cm extra)`;
  return "Airline doesn't say if wheels count";
}

function checked(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export default function CabinBagsPage() {
  return (
    <main>
      <h1>Cabin bags: will yours fit?</h1>
      <p className="lead">
        Every airline has its own sizes, and a bag that&apos;s too big at the gate costs money. Measure
        your bag, wheels and handles included, and see where it flies free.
      </p>

      <BagChecker />

      <h2>Sizes by airline</h2>
      {AIRLINE_BAGS.map((a) => (
        <div className="card" key={a.airline}>
          <h3 style={{ marginTop: 0 }}>{a.airline}</h3>
          <table className="receipt">
            <tbody>
              {a.bags.map((b) => (
                <tr key={b.kind}>
                  <td>
                    {b.kind === "underseat" ? "Under-seat bag" : "Cabin bag (overhead locker)"}
                    <div className="working">
                      {PRICE[b.price]}
                      {b.priceNote ? ` · ${b.priceNote}` : ""}
                      {b.priority ? " · includes priority boarding" : ""}
                      {b.dims && b.verified ? ` · ${wheels(b)}` : ""}
                      {b.price !== "free" && b.buyPrice ? ` · to add it: ${b.buyPrice}` : ""}
                      {b.gateFee ? ` · too big at the gate: ${b.gateFee}` : ""}
                    </div>
                    <div className="working">
                      <a href={b.sourceUrl} target="_blank" rel="noopener noreferrer">
                        {a.airline}&apos;s page
                      </a>
                      {b.verified && b.quote ? <> · &ldquo;{b.quote}&rdquo;</> : ""} · checked {checked(b.checkedOn)}
                      {b.feeSourceUrl ? (
                        <>
                          {" · "}
                          <a href={b.feeSourceUrl} target="_blank" rel="noopener noreferrer">
                            fees page
                          </a>
                        </>
                      ) : null}
                    </div>
                  </td>
                  <td className="amt">{size(b)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {a.notes.map((n) => (
            <p className="hint" key={n}>
              {n}
            </p>
          ))}
        </div>
      ))}

      <p className="hint">
        Not on this list yet: {BAGS_NOT_CHECKED.join(", ")}. We add an airline only once we can check its
        own page.
      </p>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Rules changing in October 2027</h2>
        <p>
          New EU rules (Regulation (EU) 2026/2202) apply from 23 October 2027 to flights leaving EU
          airports, so the flight home from most European holidays. Every passenger gets one free
          personal item, and airlines must show fares that include a cabin bag by default. A wheeled
          cabin bag doesn&apos;t become free. Until then, each airline&apos;s own rules above apply.
        </p>
      </div>

      <p className="hint">
        Sizes are copied from each airline&apos;s own page and checked on the date shown. Airlines
        change them, so check your booking before you fly. Spotted a change? Tell us and we&apos;ll update
        it for everyone. <Link href="/fees">Fee tables</Link> · <Link href="/xray">Deal X-ray</Link>
      </p>
    </main>
  );
}
