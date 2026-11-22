import type { Metadata } from "next";
import Link from "next/link";
import { FAIRMARK_SCALE } from "@truevsad/true-cost";
import { COMPANY, EMAILS } from "@/lib/company";

export const metadata: Metadata = {
  title: "Questions — TrueVsAd",
  description:
    "Common questions about TrueVsAd: what the Deal X-ray adds, what SAFE, CHECK and STOP mean, how FairMark works, what we keep about you and how we earn.",
};

/**
 * Answers here repeat what other pages already promise; they add no new facts or figures.
 * When About, Privacy, How we earn, Terms or How FairMark works changes, check this page the same
 * day. Add questions families actually email us, in their words.
 */
export default function QuestionsPage() {
  return (
    <main>
      <h1>Questions</h1>
      <p className="lead">Short answers to what families ask most. Each links to the full page.</p>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>About TrueVsAd</h2>

        <h3>What does TrueVsAd do?</h3>
        <p>
          You bring a holiday deal you&apos;ve found. We add up what the advert left out for your exact family
          (tourist taxes, travel documents, and the bags and seats airlines charge for), each with its source, and
          give one verdict on the price.
        </p>

        <h3>Is it free?</h3>
        <p>Yes. There&apos;s no account to make, and we never take payment.</p>

        <h3>Can I book a holiday here?</h3>
        <p>
          No. We don&apos;t sell holidays or take bookings. You always book directly with the seller.{" "}
          <Link href="/terms">Terms</Link>
        </p>

        <h3>How do you make money?</h3>
        <p>
          Today, we earn nothing. If featured deals open, FairMark Gold sellers will pay nothing and Fair Price
          sellers 1% of bookings made through us. Paying never changes a verdict, a FairMark or the order of
          anything. <Link href="/how-we-earn">How we earn</Link>
        </p>

        <h3>Who runs it?</h3>
        <p>
          {COMPANY.name}, a small independent company in London. It isn&apos;t owned by, or paid by, any holiday
          seller. <Link href="/about">About</Link>
        </p>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>The Deal X-ray</h2>

        <h3>What can I paste?</h3>
        <p>
          The deal&apos;s text, a screenshot, or a link. From a link we read only the words in the address: we
          never open it. Text and screenshots are read by AI to fill in the form, and you check every field before
          anything is priced.
        </p>

        <h3>Does AI work out the price?</h3>
        <p>
          No. AI only reads the advert into the form. The price comes from our own engine and fee tables, and
          every amount on the receipt shows its source.
        </p>

        <h3>What isn&apos;t in the true price?</h3>
        <p>
          Getting to and from the UK airport, meals beyond the board basis, spending money and travel insurance,
          and the flight tickets if the advertised price doesn&apos;t include them. Every receipt lists what it
          didn&apos;t check.
        </p>

        <h3>Why does it add a hold bag I might not take?</h3>
        <p>
          Bags are advisory: we count one per two people aged 2 and over, as a couple often shares one. Type your own number, or 0
          if you&apos;re taking cabin bags only.
        </p>

        <h3>What do SAFE TO GO, CHECK and STOP mean?</h3>
        <ul>
          <li>
            <strong>SAFE TO GO</strong>: the advert left out {FAIRMARK_SCALE.fair}% or less.
          </li>
          <li>
            <strong>CHECK</strong>: it left out {FAIRMARK_SCALE.fair}–{FAIRMARK_SCALE.higher}%. Ask the seller why.
          </li>
          <li>
            <strong>STOP</strong>: it left out more than {FAIRMARK_SCALE.higher}%.
          </li>
        </ul>
        <p>It&apos;s a verdict on the price, never on the place.</p>

        <h3>What is FairMark?</h3>
        <p>
          How much of the true price the advert left out: Gold is {FAIRMARK_SCALE.gold}% or less, Fair Price up to{" "}
          {FAIRMARK_SCALE.fair}%. It means the advert was nearly complete, not that the holiday is cheap. If an
          advert says &ldquo;plus taxes and fees&rdquo;, we show &ldquo;FairMark unavailable&rdquo;, because we
          can&apos;t know what&apos;s added at checkout. <Link href="/fairmark/method">How FairMark works</Link>
        </p>

        <h3>How accurate is it?</h3>
        <p>
          It&apos;s our best estimate on the day, from the details you confirm and the fees we hold. Every fee
          shows where it comes from and when we checked it. Seen a wrong figure? Tell us at{" "}
          <a href={`mailto:${EMAILS.corrections}`}>{EMAILS.corrections}</a> and we&apos;ll fix it for everyone.{" "}
          <Link href="/fees">Fee tables</Link>
        </p>

        <h3>The deal is in euros. What rate do you use?</h3>
        <p>
          The latest European Central Bank rate, with its date shown on the receipt. Your card or bank may use a
          different rate, and the receipt explains card fees abroad.
        </p>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Your data</h2>

        <h3>What do you keep about me?</h3>
        <p>
          With your receipt: the deal details you confirm and your party&apos;s ages. We never ask for names, email
          addresses, passport or payment details. A receipt you don&apos;t share is deleted after 30 days; a shared
          one after 12 months. We also keep anonymous price statistics that can&apos;t be linked back to you. We set
          no cookies and use no tracking or advertising. <Link href="/privacy">Everything we keep, and for how long</Link>
        </p>

        <h3>Do you keep my screenshot?</h3>
        <p>
          No. It&apos;s read once to fill in the form, then not kept. Please crop out names and booking references
          first. <Link href="/privacy">Who reads it, and where</Link>
        </p>

        <h3>Can I see or delete what you hold?</h3>
        <p>
          Yes: email <a href={`mailto:${EMAILS.privacy}`}>{EMAILS.privacy}</a>.
        </p>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>The other tools</h2>
        <ul>
          <li>
            <Link href="/fairfam">FairFam</Link>: the weeks your whole family can travel, from your council&apos;s
            school holidays.
          </li>
          <li>
            <Link href="/school-window">School Window</Link>: how many school days a trip would miss.
          </li>
          <li>
            <Link href="/cabin-bags">Will my bag fit?</Link>: your bag against each airline&apos;s sizes.
          </li>
          <li>
            <Link href="/visit">Visit before you book</Link>: what&apos;s near a resort, counted from
            OpenStreetMap. A guide, not a promise: walk the area on Street View too.
          </li>
          <li>
            <Link href="/plan-b">Plan B</Link>: one page with 112, the nearest hospitals and UK help, that works
            with no signal.
          </li>
        </ul>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Something else</h2>

        <h3>Something went wrong at my hotel.</h3>
        <p>
          <Link href="/hotel-problems">Hotel problems</Link> covers the common ones and who has to put them right.
          It&apos;s general information, not legal advice.
        </p>

        <h3>I run a hotel or sell holidays.</h3>
        <p>
          See <Link href="/sellers">For sellers</Link>, or email{" "}
          <a href={`mailto:${EMAILS.partners}`}>{EMAILS.partners}</a>.
        </p>

        <h3>My question isn&apos;t here.</h3>
        <p>
          Email <a href={`mailto:${EMAILS.hello}`}>{EMAILS.hello}</a>. Questions we&apos;re asked often get
          added to this page.
        </p>
      </div>
    </main>
  );
}
