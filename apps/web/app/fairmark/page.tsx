import type { Metadata } from "next";
import Link from "next/link";
import { FAIRMARK_LABELS, FAIRMARK_SCALE, formatFairMarkPercent, formatGBP, REFERENCE_PARTY } from "@truevsad/true-cost";
import { FairMarkBadge } from "@/components/FairMarkBadge";
import {
  LEADERBOARD_DAYS,
  LEADERBOARD_MIN_DEALS,
  loadLeaderboard,
  loadListedDeals,
  type LeaderboardRow,
} from "@/lib/quotes";

export const runtime = "nodejs";
export const preferredRegion = "lhr1";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "FairMark — which holiday prices are honest — TrueVsAd",
  description:
    `FairMark shows how much a holiday advert leaves out in taxes and fees. Fair Price means ${FAIRMARK_SCALE.fair}% or less. See the fairest sellers this month.`,
};

type Search = Promise<{ fair?: string; sort?: string }>;

/** The leaderboard is heavy to work out, so each server keeps it for an hour (spec: at least daily). */
let cache: { at: number; data: Awaited<ReturnType<typeof loadLeaderboard>> } | null = null;
async function leaderboard() {
  if (cache && Date.now() - cache.at < 60 * 60 * 1000) return cache;
  cache = { at: Date.now(), data: await loadLeaderboard() };
  return cache;
}

function sortRows(rows: LeaderboardRow[], dir: "asc" | "desc") {
  // Fairest first by default, on the median (one odd deal can't make or break a seller).
  return [...rows].sort((a, b) =>
    dir === "asc" ? a.medianPercent - b.medianPercent || b.deals - a.deals : b.medianPercent - a.medianPercent || b.deals - a.deals,
  );
}

export default async function FairMarkPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const fairOnly = sp.fair === "1";
  const dir = sp.sort === "desc" ? "desc" : "asc";
  const [{ data: board, at }, deals] = await Promise.all([leaderboard(), loadListedDeals(fairOnly)]);
  const rows = sortRows(board.rows, dir);
  const qs = (p: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    const merged = { fair: fairOnly ? "1" : undefined, sort: dir === "desc" ? "desc" : undefined, ...p };
    for (const [k, v] of Object.entries(merged)) if (v) u.set(k, v);
    const s = u.toString();
    return s ? `/fairmark?${s}` : "/fairmark";
  };
  const ref = `${REFERENCE_PARTY.adults} adults and children aged ${REFERENCE_PARTY.childAges.join(" and ")}`;

  return (
    <main>
      <h1>FairMark</h1>
      <p className="lead">
        How much a holiday advert leaves out: the taxes and fees every family on that deal must pay,
        plus one hold bag as our standard. Fair Price means {FAIRMARK_SCALE.fair}% or less. Other extras
        your family chooses are on your receipt but never counted against the seller.
      </p>

      <div className="card">
        <table className="board">
          <tbody>
            <tr><td><span className="fm fm-gold">{FAIRMARK_LABELS.gold}</span></td><td>{FAIRMARK_SCALE.gold}% or less, including adverts that left nothing out</td></tr>
            <tr><td><span className="fm fm-fair">{FAIRMARK_LABELS.fair}</span></td><td>More than {FAIRMARK_SCALE.gold}%, up to {FAIRMARK_SCALE.fair}%</td></tr>
            <tr><td><span className="fm fm-higher">{FAIRMARK_LABELS.higher}</span></td><td>More than {FAIRMARK_SCALE.fair}%, up to {FAIRMARK_SCALE.higher}%</td></tr>
            <tr><td><span className="fm fm-high">{FAIRMARK_LABELS.high}</span></td><td>More than {FAIRMARK_SCALE.higher}%</td></tr>
          </tbody>
        </table>
        <p className="hint">
          FairMark is worked out by the same engine as every receipt, with sourced fees, and nothing
          the deal already includes is counted twice. It never changes the order of results, and no
          seller can pay for it. When we can&apos;t be confident, we show &ldquo;FairMark
          unavailable&rdquo; and say why. Fair means the advertised price is honest, not that the
          holiday is cheap. <Link href="/fairmark/method">How FairMark works</Link>.
        </p>
      </div>

      <h2>Fairest sellers this month</h2>
      {rows.length === 0 ? (
        <div className="card">
          <p style={{ marginTop: 0 }}>
            Not enough deals checked yet. A seller appears here once families have X-rayed at least{" "}
            {LEADERBOARD_MIN_DEALS} of its deals in the last {LEADERBOARD_DAYS} days.
          </p>
          <Link href="/xray">X-ray a deal →</Link>
        </div>
      ) : (
        <div className="card">
          <table className="board">
            <thead>
              <tr>
                <th>Seller</th>
                <th className="num">
                  <Link href={qs({ sort: dir === "asc" ? "desc" : undefined })}>
                    Median gap {dir === "asc" ? "↑" : "↓"}
                  </Link>
                </th>
                <th className="num wide">Average</th>
                <th className="num wide">Best to worst</th>
                <th className="num">Deals</th>
                <th className="wide">FairMark</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.seller}>
                  <td>
                    {r.seller}
                    {r.verified && <span title={`30+ deals in 5+ destinations, median ${FAIRMARK_SCALE.fair}% or less left out`}> ✓</span>}
                  </td>
                  <td className="num">{formatFairMarkPercent(r.medianPercent)}</td>
                  <td className="num wide">{formatFairMarkPercent(r.averagePercent)}</td>
                  <td className="num wide">
                    {formatFairMarkPercent(r.bestPercent)} to {formatFairMarkPercent(r.worstPercent)}
                  </td>
                  <td className="num">{r.deals}</td>
                  <td className="wide">
                    <span className={`fm fm-${r.level}`}>{FAIRMARK_LABELS[r.level]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="hint">
            Every deal families X-rayed in the last {LEADERBOARD_DAYS} days ({board.dealsCounted} in all), priced
            with today&apos;s fees for one standard family ({ref}) so sellers are compared like for like.
            &ldquo;Total price&rdquo; adverts keep their own party. Sellers need {LEADERBOARD_MIN_DEALS}+ deals to
            appear; ✓ means 30+ deals in 5+ destinations with a median of {FAIRMARK_SCALE.fair}% or less left out, and is never
            for sale. A seller is the company selling the deal, not the brand of holiday inside it. Sellers can
            challenge any figure: see <Link href="/fairmark/method">how FairMark works</Link>. Updated{" "}
            {new Date(at).toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short", timeZone: "Europe/London" })}.
          </p>
        </div>
      )}

      <h2>Deals families shared</h2>
      <form method="get" className="card">
        {dir === "desc" && <input type="hidden" name="sort" value="desc" />}
        <label className="check toggle">
          <input type="checkbox" name="fair" value="1" defaultChecked={fairOnly} /> Show only Fair Price deals ({FAIRMARK_SCALE.fair}% or
          less left out)
        </label>
        <button type="submit">Apply</button>{" "}
        {fairOnly && (
          <Link href={qs({ fair: undefined })} className="hint">
            Show all deals
          </Link>
        )}
      </form>

      {deals.length === 0 ? (
        <p className="hint">
          {fairOnly
            ? "No Fair Price deals listed yet."
            : "No deals listed yet. When you share a receipt, you can choose to show it here."}
        </p>
      ) : (
        deals.map((d) => (
          <Link key={d.slug} href={`/r/${d.slug}`} className="card deal-card" style={{ textDecoration: "none", color: "inherit", display: "flex" }}>
            <div>
              <strong>{d.destination ?? "Holiday"}</strong>
              <div className="hint">
                {d.supplierName ? `${d.supplierName} · ` : ""}
                {d.nights} night{d.nights === 1 ? "" : "s"} · {d.adults} adult{d.adults === 1 ? "" : "s"}
                {d.children ? `, ${d.children} child${d.children === 1 ? "" : "ren"}` : ""}
              </div>
            </div>
            <div className="price">
              <div className="hint">
                Advertised {formatGBP(d.advertisedPence)}
              </div>
              <div className="true">{formatGBP(d.trueCostPence)}</div>
              <FairMarkBadge fm={d.fairMark} />
            </div>
          </Link>
        ))
      )}
      <p className="hint">
        Newest first. FairMark never changes the order. Prices are recalculated with today&apos;s fees
        each time you open this page; the advertised price is what the family saw on the day.
      </p>
    </main>
  );
}
