import type { Metadata } from "next";
import Link from "next/link";
import { COMPANY, EMAILS } from "@/lib/company";

export const metadata: Metadata = {
  title: "Terms of use — TrueVsAd",
  description: "The short rules for using TrueVsAd: what our prices and verdicts are, what they aren't, and how to challenge them.",
};

/** Keep this page TRUE to what the site does, in plain words. Last changed: 5 November 2026. */
export default function TermsPage() {
  return (
    <main>
      <h1>Terms of use</h1>
      <p className="lead">Short version: we help you check a price before you pay. You still book, and decide, yourself.</p>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Who we are</h2>
        <p>
          TrueVsAd (truevsad.co.uk) is run by {COMPANY.name}, {COMPANY.type} (company number {COMPANY.number}),
          registered office {COMPANY.address}. By using the site you agree to these terms.
        </p>

        <h2>What TrueVsAd is</h2>
        <ul>
          <li>
            A free tool that works out what a holiday deal is likely to cost your family in total, from fees published by
            airlines, councils, governments and other sources shown on each receipt.
          </li>
          <li>
            We don&apos;t sell holidays, take bookings or take payment. You always book directly with the seller, on their
            terms.
          </li>
          <li>Nothing a seller pays us changes a price, a verdict or a ranking. <Link href="/how-we-earn">How we earn</Link> lists everything.</li>
        </ul>

        <h2>What our figures are, and aren&apos;t</h2>
        <ul>
          <li>
            A true price is our best estimate on the day, from the details you confirm and the fees we hold. Fees change,
            sellers&apos; prices change, and every receipt lists what it didn&apos;t check. Always confirm the final price
            with the seller before you pay.
          </li>
          <li>
            &ldquo;STOP&rdquo;, &ldquo;CHECK&rdquo;, &ldquo;SAFE TO GO&rdquo; and FairMark are our verdict on how much an
            advert left out, worked out by the method on <Link href="/fairmark/method">How FairMark works</Link>. They are
            a verdict on the price, never on the place, the hotel or the seller&apos;s service.
          </li>
          <li>
            Plan B, cabin bag sizes, school dates and Visit before you book bring together information from official and
            public sources, with links. They help you prepare; they don&apos;t replace the emergency services, your
            airline, your school or the local authorities. In an emergency, call the local emergency number.
          </li>
          <li>We aren&apos;t a financial, legal or travel adviser.</li>
        </ul>

        <h2>Using the site fairly</h2>
        <ul>
          <li>Check real deals, honestly. Don&apos;t enter made-up deals to push a seller&apos;s FairMark up or down.</li>
          <li>
            Sellers, and anyone working for them, mustn&apos;t check or list deals to boost themselves or
            harm a competitor. That&apos;s against the law on fake reviews as well as these terms.
          </li>
          <li>Don&apos;t put anyone&apos;s personal details, or anything offensive or unlawful, in the deal details.</li>
          <li>Don&apos;t copy the site or its data automatically, overload it, or try to get round its limits.</li>
        </ul>

        <h2>Sharing and listing a receipt</h2>
        <ul>
          <li>When you share a receipt, anyone with the link can see it. Only list it on the public board if you want to.</li>
          <li>
            A shared or listed receipt shows only figures and checked names: the place (never the hotel or anything
            else you typed), the seller once we&apos;ve checked its name, nights, number of adults and children, and
            the prices.
          </li>
          <li>By listing a receipt you let us show it on the FairMark board until it&apos;s deleted after 12 months.</li>
          <li>
            We may unlist or delete any receipt that breaks these terms or is reported to us. If a deal turns out to
            be made up, we delete it and FairMark is worked out again without it.
          </li>
        </ul>

        <h2>Reporting a receipt or a figure</h2>
        <p>
          If a receipt looks fake, unlawful or harmful, or a figure looks wrong, email{" "}
          <a href={`mailto:${EMAILS.corrections}`}>{EMAILS.corrections}</a> with its link. We look at
          reports of unlawful or harmful content first, and remove it as soon as we see it&apos;s a
          problem.
        </p>

        <h2>Challenging a figure</h2>
        <p>
          Families and sellers can challenge any fee, receipt or FairMark at{" "}
          <a href={`mailto:${EMAILS.corrections}`}>{EMAILS.corrections}</a>. We reply within 14 days, and if we got a fee
          wrong we correct it for everyone.
        </p>

        <h2>Our responsibility to you</h2>
        <p>
          We take care to get things right and to show where every figure comes from, but we can&apos;t promise the site
          is always available or free of mistakes. We aren&apos;t responsible for a seller&apos;s prices, terms or
          service. Nothing in these terms limits any right you have under UK consumer law, or our responsibility where
          the law doesn&apos;t allow it to be limited, including for death or personal injury caused by our
          negligence.
        </p>

        <h2>Other people&apos;s information</h2>
        <p>
          Travel advice from GOV.UK is used under the{" "}
          <a href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/" target="_blank" rel="noopener noreferrer">
            Open Government Licence v3.0
          </a>
          ; it isn&apos;t endorsed by the FCDO. Map data is ©{" "}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>
          , available under the Open Database Licence. Exchange rates are the European Central Bank&apos;s reference
          rates, which are for information only. Each receipt and card names and links its other sources.
        </p>

        <h2>Changes and law</h2>
        <p>
          We may update these terms; the date of the last change is at the bottom. They are governed by the law of England
          and Wales. If you live elsewhere in the UK, you can also use your local courts.
        </p>
        <p>
          Questions: <a href={`mailto:${EMAILS.hello}`}>{EMAILS.hello}</a>. Your data: see our{" "}
          <Link href="/privacy">privacy page</Link>.
        </p>
        <p className="hint">Last changed 5 November 2026.</p>
      </div>
    </main>
  );
}
