import type { Metadata } from "next";
import Link from "next/link";
import { ENGINE_VERSION, FAIRMARK_MIN_CONFIDENCE, FAIRMARK_SCALE, REFERENCE_PARTY } from "@truevsad/true-cost";
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
          FairMark = taxes and fees the advert left out ÷ advertised price × 100. &ldquo;Left out&rdquo;
          means charges every family on that deal must pay: tourist taxes, resort fees and entry
          documents, each from a published source. Anything the deal already includes is never
          counted.
        </p>
        <ul>
          <li><strong>FairMark Gold</strong>: {FAIRMARK_SCALE.gold}% or less, including adverts that left nothing out.</li>
          <li><strong>Fair Price</strong>: more than {FAIRMARK_SCALE.gold}%, up to {FAIRMARK_SCALE.fair}%.</li>
          <li><strong>Higher gap</strong>: more than {FAIRMARK_SCALE.fair}%, up to {FAIRMARK_SCALE.higher}%.</li>
          <li><strong>High gap</strong>: more than {FAIRMARK_SCALE.higher}%.</li>
        </ul>
        <p>
          <strong>Extras your family adds</strong> (hold bags, seats together, getting to the airport)
          are on every receipt and in your true price, marked &ldquo;advisory&rdquo;, but they are
          never counted in FairMark. How many bags a family takes is the family&apos;s choice, so a
          seller is judged only on what its own advert left out.
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
          <li>The ✓ needs 30+ deals in 5+ destinations with a median of {FAIRMARK_SCALE.fair}% or less left out. It is earned, never bought, and lost automatically.</li>
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
          this. FairMark measures what an advert still leaves out, such as local taxes paid at the hotel.
          Optional extras are shown on your receipt so you see your real total, but they never count
          against the seller.
        </p>
      </div>

      <p>
        <Link href="/fairmark">← Back to FairMark</Link> · <Link href="/how-we-earn">How we earn</Link>
      </p>
    </main>
  );
}
