import type { Metadata } from "next";
import Link from "next/link";
import { ENGINE_VERSION, FAIRMARK_MIN_CONFIDENCE, FAIRMARK_SCALE, REFERENCE_PARTY } from "@truevsad/true-cost";
import { EMAILS } from "@/lib/company";
import { LEADERBOARD_DAYS, LEADERBOARD_MIN_DEALS, LEADERBOARD_MIN_FAMILIES, LEADERBOARD_PER_FAMILY } from "@/lib/quotes";

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
          FairMark = (taxes and fees the advert left out + one hold bag) ÷ advertised price × 100.
          &ldquo;Left out&rdquo; means charges every family on that deal must pay: tourist taxes and
          entry documents, each with its source shown on the receipt so you can check it. The hold bag is
          our standard: one return hold bag per booking, at that airline&apos;s price where we have it and
          a typical price where we don&apos;t (the receipt says which), the same for every seller and
          every family size, because a holiday with no hold bag at all isn&apos;t realistic. If the deal
          already includes hold bags, nothing is added. Anything the deal includes is never counted.
        </p>
        <ul>
          <li><strong>FairMark Gold</strong>: {FAIRMARK_SCALE.gold}% or less, including adverts that left nothing out.</li>
          <li><strong>Fair Price</strong>: more than {FAIRMARK_SCALE.gold}%, up to {FAIRMARK_SCALE.fair}%.</li>
          <li><strong>Higher gap</strong>: more than {FAIRMARK_SCALE.fair}%, up to {FAIRMARK_SCALE.higher}%.</li>
          <li><strong>High gap</strong>: more than {FAIRMARK_SCALE.higher}%.</li>
        </ul>
        <p>
          <strong>Extras your family adds</strong> (your own number of bags, seats together, getting
          to the airport) are on every receipt and in your true price, marked &ldquo;advisory&rdquo;,
          but they never change the seller&apos;s FairMark. Taking three bags or none, the seller is
          judged on the same standard of one.
        </p>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>When there is no badge</h2>
        <p>We show &ldquo;FairMark unavailable&rdquo;, and say why, when:</p>
        <ul>
          <li>there&apos;s no advertised price to compare with;</li>
          <li>some figures are placeholders rather than real, sourced prices;</li>
          <li>too many fees are rough estimates (confidence under {Math.round(FAIRMARK_MIN_CONFIDENCE * 100)}%);</li>
          <li>we don&apos;t yet have the local tax figures for that destination, so &ldquo;nothing extra&rdquo; could just mean &ldquo;we don&apos;t know&rdquo;;</li>
          <li>the advert says taxes and fees are extra, so we can&apos;t know what&apos;s added at checkout.</li>
        </ul>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>The sellers&apos; leaderboard</h2>
        <ul>
          <li>
            Built from every deal families X-rayed in the last {LEADERBOARD_DAYS} days that has a FairMark and a seller
            name, as anonymous totals per seller. Deals with &ldquo;FairMark unavailable&rdquo; (above) aren&apos;t counted.
          </li>
          <li>
            Every deal is re-priced every night with that day&apos;s fees for one standard family ({REFERENCE_PARTY.adults} adults,
            children aged {REFERENCE_PARTY.childAges.join(" and ")}), so sellers are compared like for like.
            &ldquo;Total price&rdquo; adverts keep the party they were priced for.
          </li>
          <li>Ranked by the median gap, so one unusual deal can&apos;t make or break a seller. Best and worst deals are shown too.</li>
          <li>
            A seller needs at least {LEADERBOARD_MIN_DEALS} checked deals, from at least {LEADERBOARD_MIN_FAMILIES} different
            families, to appear. The same deal checked twice by one visitor counts once, and one family counts for at
            most {LEADERBOARD_PER_FAMILY} deals per seller, so it&apos;s hard for one person to push a seller up or down.
          </li>
          <li>
            Families type the seller&apos;s name, so a person checks every name before it can appear here. We tell
            families apart with a scrambled code made from their IP address, never the address itself, deleted after{" "}
            {LEADERBOARD_DAYS} days.
          </li>
          <li>The ✓ needs 30+ deals in 5+ destinations with a median of {FAIRMARK_SCALE.fair}% or less left out. It is earned, never bought, and lost automatically.</li>
          <li>We rank the company selling the deal, not the brand of holiday inside it.</li>
          <li>
            It covers only the deals families chose to check here, not every advert a seller runs. A seller&apos;s
            figure says how much those adverts left out; it says nothing about its holidays or service.
          </li>
        </ul>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Fake deals and listings</h2>
        <p>
          Every checked deal and every listed receipt counts as a review of the seller, so we treat fake ones the
          way the law on fake reviews requires:
        </p>
        <ul>
          <li>
            Checking or listing a made-up deal, or a seller doing it for itself or against a competitor, is
            banned by our <Link href="/terms">terms</Link>.
          </li>
          <li>
            Our checks: a person approves every seller name before it appears; the same deal sent twice by one
            visitor counts once; one family counts for at most {LEADERBOARD_PER_FAMILY} deals per seller; a seller
            needs deals from at least {LEADERBOARD_MIN_FAMILIES} different families. We tell families apart by a
            scrambled IP code, so someone using several networks could still pose as more than one family: that&apos;s
            why names are checked and anyone can report a figure.
          </li>
          <li>
            Anyone can report a receipt or a figure at <a href={`mailto:${EMAILS.corrections}`}>{EMAILS.corrections}</a>.
            Made-up deals are deleted, and FairMark is worked out again without them.
          </li>
          <li>
            We never pick which genuine deals count. The board shows the newest 60 listed deals, newest first, once we
            can name its place; the leaderboard counts every checked deal that has a FairMark, good or bad. Commission
            never changes either.
          </li>
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
          this. FairMark measures what an advert still leaves out, such as local taxes paid at the hotel,
          plus one hold bag, which the law treats as optional but almost every family needs. Other
          optional extras are shown on your receipt so you see your real total, but they never count
          against the seller.
        </p>
      </div>

      <p>
        <Link href="/fairmark">← Back to FairMark</Link> · <Link href="/how-we-earn">How we earn</Link>
      </p>
    </main>
  );
}
