import type { Metadata } from "next";
import Link from "next/link";
import { ENGINE_VERSION, FAIRMARK_MIN_CONFIDENCE, REFERENCE_PARTY } from "@truevsad/true-cost";
import { EMAILS } from "@/lib/company";
import { LEADERBOARD_DAYS, LEADERBOARD_MIN_DEALS } from "@/lib/quotes";

export const metadata: Metadata = {
  title: "How FairMark works — TrueVsAd",
  description: "The exact method behind FairMark, the Fair Price badge and the sellers' leaderboard, and how to challenge a figure.",
};

export default function FairMarkMethodPage() {
  return (
    <main>
      <h1>How FairMark works</h1>
      <p className="lead">
        FairMark is a number, worked out the same way for every deal and every seller. Nobody can pay
        for it, and anyone can challenge it.
      </p>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>The calculation</h2>
        <p>
          FairMark = (true price − advertised price) ÷ advertised price × 100. The true price comes from
          the same engine as every receipt: the advertised price for your party, plus taxes, entry
          documents and the extras a family needs, each from a published source. Anything the deal
          already includes is never counted twice.
        </p>
        <ul>
          <li><strong>FairMark Gold</strong>: 5% or less, including deals with nothing extra to pay.</li>
          <li><strong>Fair Price</strong>: more than 5%, up to 10%.</li>
          <li><strong>Higher gap</strong>: more than 10%, up to 20%.</li>
          <li><strong>High gap</strong>: more than 20%.</li>
        </ul>
        <p>
          We split the gap in two: <strong>taxes and fees the advert left out</strong> (tourist taxes,
          resort fees, entry documents) and <strong>extras your family needs</strong> (hold bags, seats
          together). Extras such as bags are legally optional for sellers to show, so a high gap does
          not mean a seller has broken any rule. It means the advertised price is far from what your
          family will pay.
        </p>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>When there is no badge</h2>
        <p>We show &ldquo;FairMark unavailable&rdquo;, and say why, when:</p>
        <ul>
          <li>there&apos;s no advertised price to compare with;</li>
          <li>some figures are placeholders rather than real, sourced prices;</li>
          <li>too many fees are rough estimates (confidence under {Math.round(FAIRMARK_MIN_CONFIDENCE * 100)}%);</li>
          <li>we don&apos;t yet have the local tax figures for that destination, so &ldquo;nothing extra&rdquo; could just mean &ldquo;we don&apos;t know&rdquo;.</li>
        </ul>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>The sellers&apos; leaderboard</h2>
        <ul>
          <li>Built from every deal families X-rayed in the last {LEADERBOARD_DAYS} days, as anonymous totals per seller.</li>
          <li>
            Every deal is re-priced with today&apos;s fees for one standard family ({REFERENCE_PARTY.adults} adults,
            children aged {REFERENCE_PARTY.childAges.join(" and ")}), so sellers are compared like for like.
          </li>
          <li>Ranked by the median gap, so one unusual deal can&apos;t make or break a seller. Best and worst deals are shown too.</li>
          <li>A seller needs at least {LEADERBOARD_MIN_DEALS} checked deals to appear.</li>
          <li>The ✓ needs 30+ deals in 5+ destinations with a median gap of 10% or less. It is earned, never bought, and lost automatically.</li>
          <li>We rank the company selling the deal, not the brand of holiday inside it.</li>
        </ul>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Challenging a figure</h2>
        <p>
          Sellers and families can challenge any figure at{" "}
          <a href={`mailto:${EMAILS.corrections}`}>{EMAILS.corrections}</a>. We reply within 14 days. If a
          fee is wrong, we correct it for everyone, and every receipt shows where each fee comes from.
        </p>
        <p className="hint">
          Every receipt is stamped with the engine version that priced it. Current engine: {ENGINE_VERSION}.
        </p>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>The law behind it</h2>
        <p>
          Since April 2025, UK law has required advertised prices to include every fee a customer must
          pay, such as mandatory taxes and booking fees. The Competition and Markets Authority enforces
          this. FairMark measures more than the law does: it also counts the optional extras a family
          will realistically need, because that is the price you actually pay.
        </p>
      </div>

      <p>
        <Link href="/fairmark">← Back to FairMark</Link> · <Link href="/how-we-earn">How we earn</Link>
      </p>
    </main>
  );
}
