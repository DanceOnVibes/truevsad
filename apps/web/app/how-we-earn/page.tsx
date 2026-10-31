import type { Metadata } from "next";
import Link from "next/link";
import { COMPANY } from "@/lib/company";

export const metadata: Metadata = {
  title: "How we earn — TrueVsAd",
  description: "How TrueVsAd makes money, and why it never changes what we show you.",
};

/**
 * Public commission list. Every affiliate programme we join is added to PROGRAMMES with its rate,
 * the day it starts. Empty = we earn nothing from sellers yet.
 */
const PROGRAMMES: { seller: string; network: string; rate: string; since: string }[] = [];

export default function HowWeEarnPage() {
  return (
    <main>
      <h1>How we earn</h1>
      <p className="lead">
        We tell you exactly what we earn from each seller, because a site that judges prices should be
        open about its own.
      </p>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>What we earn today</h2>
        {PROGRAMMES.length === 0 ? (
          <p>
            Nothing. TrueVsAd has no paid links and no deals with any holiday seller yet. When that
            changes, every seller and rate will be listed here on the day it starts.
          </p>
        ) : (
          <table className="board">
            <thead>
              <tr>
                <th>Seller</th>
                <th>Paid through</th>
                <th>What we earn</th>
                <th>Since</th>
              </tr>
            </thead>
            <tbody>
              {PROGRAMMES.map((p) => (
                <tr key={p.seller}>
                  <td>{p.seller}</td>
                  <td>{p.network}</td>
                  <td>{p.rate}</td>
                  <td>{p.since}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>What never changes</h2>
        <ul>
          <li>Deals are ordered by true price and how sure we are of it, never by what a seller pays us.</li>
          <li>FairMark, the Fair Price badge and the ✓ on the sellers&apos; leaderboard can&apos;t be bought.</li>
          <li>Paid links will always be labelled.</li>
          <li>We never take payment for a holiday, and we never sell anything about you.</li>
        </ul>
      </div>

      <p className="hint">
        {COMPANY.name} · <Link href="/fairmark/method">How FairMark works</Link>
      </p>
    </main>
  );
}
