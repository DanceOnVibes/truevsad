import type { Metadata } from "next";
import Link from "next/link";
import { FAIRMARK_SCALE } from "@truevsad/true-cost";
import { COMPANY, EMAILS } from "@/lib/company";

export const metadata: Metadata = {
  title: "For sellers — TrueVsAd",
  description:
    "Small hotels, guesthouses and holiday sellers whose prices are complete can join TrueVsAd as Fair Sellers. Joining is free; Gold sellers pay nothing.",
  alternates: { languages: { en: "/sellers", es: "/sellers/es" } },
};

/**
 * Seller rates, fixed by Adalbert on 6 November 2026. Change only with a published notice
 * (see "If our rates change" below) and update How we earn on the same day.
 */
const RATES = { gold: "Nothing", fair: "1% of bookings made through TrueVsAd" } as const;

export default function SellersPage() {
  return (
    <main>
      <p className="hint">
        <Link href="/sellers/es" lang="es">
          Leer en español
        </Link>
      </p>
      <h1>For sellers</h1>
      <p className="lead">
        TrueVsAd shows families what a holiday really costs. If your prices are already complete, we&apos;d like
        to show your deals to them.
      </p>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Where we are now</h2>
        <p>
          Featured deals aren&apos;t live yet. We&apos;re starting with <strong>small hotels and guesthouses</strong>,
          and talking to our first sellers now. Until featured deals open, nothing on TrueVsAd is paid for, and{" "}
          <Link href="/how-we-earn">How we earn</Link> will say so.
        </p>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Who can join</h2>
        <p>Small hotels, guesthouses and holiday companies whose advertised price is the price families pay. We check:</p>
        <ul>
          <li>
            <strong>A real business:</strong> registered and active on its country&apos;s official register (Companies
            House in the UK).
          </li>
          <li>
            <strong>Allowed to let rooms:</strong> the tourist accommodation licence or registration number, where your
            country or region requires one.
          </li>
          <li>
            <strong>Protected packages:</strong> if you sell flights with accommodation, an ATOL, checked on the
            CAA&apos;s register. A hotel selling rooms only doesn&apos;t need one.
          </li>
          <li>
            <strong>No recent action over misleading prices</strong> by the ASA or the CMA in the last 12 months.
          </li>
          <li>
            <strong>A signed agreement</strong> with our standard, including how deals are removed.
          </li>
        </ul>
        <p className="hint">We check official sources only, when you join and again every 3 months.</p>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>The Fair Seller standard</h2>
        <p>Every featured deal carries the same three-part label, so families build their own true price:</p>
        <ol>
          <li>
            <strong>Always in the price:</strong> taxes, booking and card fees, and anything a family can&apos;t
            avoid. A local tourist tax is either included, or shown with its amount and &ldquo;paid at the
            hotel&rdquo;.
          </li>
          <li>
            <strong>Optional extras, each with its exact price:</strong> breakfast or board upgrades, airport
            transfers (or &ldquo;make your own way&rdquo; with no penalty), hold bags, and similar. Nothing is ever
            pre-ticked.
          </li>
          <li>
            <strong>Not offered:</strong> for example &ldquo;no transfers&rdquo;, so nobody assumes.
          </li>
        </ol>
        <ul>
          <li>The room type is named, and the photos show that room type.</li>
          <li>
            Meals are described in your own words: what each meal includes and when it&apos;s served. A simple
            breakfast described honestly meets the standard; a promise that isn&apos;t kept doesn&apos;t.
          </li>
          <li>
            The deal must reach FairMark Gold ({FAIRMARK_SCALE.gold}% or less left out) or Fair Price (
            {FAIRMARK_SCALE.fair}% or less), worked out by the <Link href="/fairmark/method">same method</Link> as
            every receipt. Adverts that say &ldquo;plus taxes and fees&rdquo; can&apos;t be featured.
          </li>
          <li>Our engine prices every featured deal before it appears, and again every night.</li>
          <li>
            If a price changes, a fee appears that wasn&apos;t on the label, or a check fails, the deal comes off the
            same night.
          </li>
        </ul>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>What it costs</h2>
        <table className="board">
          <thead>
            <tr>
              <th>Your FairMark</th>
              <th>What you pay us</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Joining</td>
              <td>Free, always</td>
            </tr>
            <tr>
              <td>
                <strong>FairMark Gold</strong> ({FAIRMARK_SCALE.gold}% or less left out)
              </td>
              <td>{RATES.gold}</td>
            </tr>
            <tr>
              <td>
                <strong>Fair Price</strong> (more than {FAIRMARK_SCALE.gold}%, up to {FAIRMARK_SCALE.fair}%)
              </td>
              <td>{RATES.fair}</td>
            </tr>
            <tr>
              <td>More than {FAIRMARK_SCALE.fair}% left out</td>
              <td>Can&apos;t be featured</td>
            </tr>
          </tbody>
        </table>
        <p>
          <strong>We earn less when you get better.</strong> A Fair seller pays 1% and a Gold seller pays nothing.
          That&apos;s on purpose: the fairest sellers should pay least. FairMark is worked out by our engine with a
          public method, never by hand, so we can&apos;t move a seller down to earn more, and anyone can challenge a
          figure.
        </p>
        <p>
          How bookings are counted (for example a booking code or a referral link) is set out in the seller agreement.
          We never take payment from families, and we never handle the booking.
        </p>
        <p className="hint">
          <strong>If our rates change:</strong> we&apos;ll review them during 2027, once we&apos;ve seen how they
          work. Any change is published here and sent to every featured seller before it applies.
        </p>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>What money can never buy</h2>
        <ul>
          <li>Being featured: meeting the standard is the only way in.</li>
          <li>A better FairMark, a ✓ on the sellers&apos; leaderboard, or a place in a ranking.</li>
          <li>
            Hiding a family&apos;s receipt. Any family can still check any of your deals, featured or not, and see the
            verdict.
          </li>
        </ul>
        <p>Featured deals are always labelled &ldquo;Featured&rdquo;, and kept apart from the deals families check.</p>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>If families report a problem</h2>
        <ul>
          <li>Reports come to us privately with proof, and are never posted. One report alone never removes anyone.</li>
          <li>You get the facts and 14 days to answer; the deal is paused until you do.</li>
          <li>The same problem from 2 or more independent families within 12 months is a strike.</li>
          <li>3 strikes, or ignoring a report, removes you from Fair Sellers for 6 months.</li>
          <li>
            We publish only our own decision, as fact (for example &ldquo;removed for not meeting the
            room-description rule&rdquo;), never families&apos; accusations.
          </li>
        </ul>
        <p>
          Every featured seller also gets a private report on what to change to reach Gold, worked out from our
          engine&apos;s figures.
        </p>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>How to apply</h2>
        <p>
          Email <a href={`mailto:${EMAILS.partners}?subject=Fair%20Seller%20application`}>{EMAILS.partners}</a>{" "}
          (in English or Spanish) with:
        </p>
        <ul>
          <li>your business name, country and registration number;</li>
          <li>your tourist accommodation licence or registration number, if you need one;</li>
          <li>your ATOL number, if you sell flights with accommodation;</li>
          <li>your website, and one example deal with its full price and extras.</li>
        </ul>
        <p className="hint">
          Please send business details only: no guests&apos; names or booking data. We keep what you send, and our
          checks, while you&apos;re a Fair Seller and for 12 months after, or 12 months after we reply if you
          don&apos;t join. See our <Link href="/privacy">privacy page</Link>.
        </p>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Please read: what TrueVsAd is, and isn&apos;t</h2>
        <ul>
          <li>
            <strong>We&apos;re not a travel agent or booking site.</strong> We never take bookings or payment, and
            we&apos;re not part of the contract between a family and a seller. Families book directly with you.
          </li>
          <li>
            <strong>Being featured isn&apos;t a recommendation of the holiday.</strong> It means the advertised
            price met our standard when we checked it. We don&apos;t inspect hotels or guarantee rooms, service or
            safety.
          </li>
          <li>
            <strong>FairMark measures price only:</strong> how much an advert left out. It says nothing about a
            hotel&apos;s quality.
          </li>
          <li>
            <strong>You stay responsible for your own adverts</strong> and for following the law where you trade,
            including UK price rules, package travel rules, ATOL and local licences. Our reports are guidance on
            meeting our standard, not legal advice.
          </li>
          <li>
            <strong>We decide who is featured.</strong> We can decline an application, or remove a seller or a deal
            that no longer meets the standard. We give our reason, based on the published rules.
          </li>
          <li>
            <strong>Families keep all their rights</strong> against the seller they booked with, whatever TrueVsAd
            shows.
          </li>
        </ul>
        <p className="hint">
          TrueVsAd is run by {COMPANY.name}. The seller agreement sets out the full terms. Questions:{" "}
          <a href={`mailto:${EMAILS.partners}`}>{EMAILS.partners}</a>.
        </p>
      </div>

      <p>
        <Link href="/how-we-earn">How we earn</Link> · <Link href="/fairmark/method">How FairMark works</Link> ·{" "}
        <Link href="/terms">Terms</Link>
      </p>
    </main>
  );
}
