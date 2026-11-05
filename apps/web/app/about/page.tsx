import type { Metadata } from "next";
import Link from "next/link";
import { COMPANY, EMAILS } from "@/lib/company";

export const metadata: Metadata = {
  title: "About — TrueVsAd",
  description: "Why TrueVsAd exists, who runs it, and the rules it never breaks.",
};

export default function AboutPage() {
  return (
    <main>
      <h1>About TrueVsAd</h1>
      <p className="lead">
        The advertised price is never the price a family pays. TrueVsAd shows the difference before you book, with a
        source for every pound.
      </p>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Why it exists</h2>
        <p>
          For a family, a holiday is a need, not a luxury, and it&apos;s often the biggest thing the year&apos;s budget
          has to stretch to. Adverts show a headline price; bags, tourist taxes, travel documents and transfers arrive
          later. TrueVsAd adds them up for your exact family, says which advert left out the most, and is honest about
          what it couldn&apos;t check.
        </p>

        <h2>Who runs it</h2>
        <p>
          TrueVsAd is built and run by Adalbert Roitan at {COMPANY.name}, a small independent company in London. It
          isn&apos;t owned by, or paid by, any holiday seller.
        </p>

        <h2>The rules we don&apos;t break</h2>
        <ul>
          <li>We never take payment or bookings. You book directly with the seller.</li>
          <li>Nothing is ranked by commission, and FairMark can&apos;t be bought.</li>
          <li>We never publish a number our engine didn&apos;t work out, and every fee shows its source.</li>
          <li>Every receipt and card says what it didn&apos;t check.</li>
          <li>We don&apos;t scrape airlines or holiday sites, and we keep as little about you as we can.</li>
        </ul>

        <h2>How we use AI, openly</h2>
        <p>
          Deal X-ray can read a deal from your text or screenshot with Google&apos;s Gemini, run in London; you check
          every field before anything is priced, and the prices themselves come from our own engine, not from AI. The
          holiday scenes around the site are AI images made on HeyJess.art, and are credited where they appear.
        </p>

        <h2>Get in touch</h2>
        <ul>
          <li>
            Questions and ideas: <a href={`mailto:${EMAILS.hello}`}>{EMAILS.hello}</a>
          </li>
          <li>
            A figure looks wrong: <a href={`mailto:${EMAILS.corrections}`}>{EMAILS.corrections}</a>
          </li>
          <li>
            Holiday sellers: <a href={`mailto:${EMAILS.partners}`}>{EMAILS.partners}</a>
          </li>
        </ul>
        <p className="hint">
          See also <Link href="/how-we-earn">How we earn</Link>, <Link href="/terms">Terms</Link> and{" "}
          <Link href="/privacy">Privacy</Link>.
        </p>
      </div>
    </main>
  );
}
