import type { Metadata } from "next";
import { COMPANY, EMAILS } from "@/lib/company";

export const metadata: Metadata = {
  title: "Privacy — TrueVsAd",
  description: "What TrueVsAd stores, why, and for how long.",
};

/**
 * Keep this page TRUE to what the code does. If you change what we store or how
 * long we keep it, update this page in the same commit.
 */
export default function PrivacyPage() {
  return (
    <main>
      <h1>Privacy</h1>
      <p className="lead">Short version: we store as little as we can, and never anything that names you.</p>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Who we are</h2>
        <p>
          TrueVsAd is operated by {COMPANY.name}, {COMPANY.type} (company number {COMPANY.number}).
          We are registered with the Information Commission, the UK&apos;s data protection regulator
          (the ICO; registration {COMPANY.ico}).
        </p>
        <p>Registered office: {COMPANY.address}.</p>
        <p>
          Questions about your data: <a href={`mailto:${EMAILS.privacy}`}>{EMAILS.privacy}</a>
        </p>

        <h2>What we store when you X-ray a deal</h2>
        <ul>
          <li>Number of adults and the <strong>ages</strong> of any children (never dates of birth).</li>
          <li>The deal details you confirm: price, nights, travel date or month (if you give it), destination, seller and airline.</li>
          <li>How many hold bags you&apos;re taking, if you tell us.</li>
          <li>The link to the deal, if you paste one. We never open it ourselves.</li>
          <li>The price breakdown we worked out.</li>
        </ul>
        <p>
          We do <strong>not</strong> ask for or store names, email addresses, passport details or
          payment details, and your postcode is not stored with the receipt. If you give the first half
          (e.g. SE11), we use it at that moment to find your council and keep only its letters (SE) in
          anonymous statistics. We never take payment.
        </p>

        <h2>Reading your deal</h2>
        <p>
          When you paste deal text or a screenshot, it is sent to Google Cloud (Gemini on Agent
          Platform, run in London) only to pull out the deal details: price, nights, destination,
          seller and what&apos;s included. We don&apos;t keep the text or the screenshot — only the
          details you confirm on the next screen are saved. Please crop out names and booking
          references before uploading a screenshot. If you paste a link, we also pass on the place
          words from its address (e.g. &ldquo;spain tarragona&rdquo;) to help read the destination;
          we still never open the link.
        </p>
        <p>
          Google doesn&apos;t use what you send to train its AI. To answer quickly it may hold it in
          memory, in the UK, for up to 24 hours, and under its cloud terms it may log requests to
          detect abuse. The price itself is worked out by our own engine, never by AI, and nothing
          about you is decided automatically.
        </p>

        <h2>Visit before you book</h2>
        <p>
          When you check a place, we send only the place name you typed to OpenStreetMap&apos;s free
          place search (Nominatim) and to public Overpass map servers run by independent volunteers,
          to find it and count what&apos;s nearby. If they&apos;re busy, the same place name goes to a
          backup that uses the same map data: Photon (run by komoot) or another public Overpass server. We keep that result, which has nothing about you in it, so the next
          person doesn&apos;t have to wait.
          The map on that page loads from openstreetmap.org in your browser, so OpenStreetMap sees
          your IP address, as with any website. The Street View and Google Maps links open Google
          only if you click them.
        </p>

        <h2>Plan B</h2>
        <p>
          To make a Plan B card, only the place name you type leaves your phone. We use it to find the
          place and its nearest hospitals with the same map services as Visit before you book (and
          Spain&apos;s official hospital register, which is a file on our own server). We keep that
          result, which has nothing about you in it, for up to 90 days.
        </p>
        <p>
          Everything else you put on the card (your hotel, meeting point, phone numbers, passport notes
          and the children&apos;s details) stays in your browser. We never receive it. &ldquo;Save an
          offline copy&rdquo; saves the card as a file on your phone, and printing happens on your own
          printer. The emergency numbers, warnings and hazards for countries outside Spain come from
          GOV.UK&apos;s travel advice, which we copy each day; nothing about you is sent to GOV.UK.
        </p>

        <h2>Anonymous price statistics</h2>
        <p>
          Each time a deal is X-rayed we also keep one anonymous line of statistics: the seller and
          the destination as you confirmed them, the week of travel, the number of nights, how many people and children,
          and the price per person before and after extras, the currency the deal was advertised in,
          and the <strong>letters</strong> of your postcode only (e.g. SE from SE11) — an area of
          tens of thousands of homes. It has no link to your receipt and holds no ages, full postcode
          district, deal link or exact dates (only the week). We keep it for 2 years to measure how
          prices change in school holidays, by home region, and how fair each seller is over time.
        </p>

        <h2>FairMark board and leaderboard</h2>
        <p>
          The FairMark leaderboard is built from anonymous totals per holiday seller across all the
          deals checked in the last 30 days: it never shows a single family&apos;s deal. A shared
          receipt appears on the public FairMark board only if you tick the box when you share it. The
          board shows the place (never the hotel), the seller once we&apos;ve checked its name, nights,
          number of adults and children and the prices, never your postcode, children&apos;s exact
          ages or the deal link.
        </p>

        <h2>FairFam, School Window and splitting a price</h2>
        <p>
          Checking a date against your council&apos;s school holidays, finding the weeks your whole family
          can travel, comparing your own two quotes, or splitting a price between families is worked
          out on the spot. We don&apos;t save which council you chose, your school&apos;s dates, your party
          or the split. When you go from FairFam to Deal X-ray, your party, date and nights are passed
          to the next page inside your own browser tab and deleted as soon as it opens.
        </p>
        <p>
          If you give the first half of your postcode (on FairFam, School Window or the X-ray), we send only
          that (e.g. SE11) to postcodes.io, a free service built on Office for National Statistics
          data, to find your council. Nothing about you goes with it, and we don&apos;t keep the
          answer against you.
        </p>

        <h2>Prices in euros or dollars</h2>
        <p>
          If a deal is priced in euros or US dollars, we convert it to pounds at the European
          Central Bank&apos;s daily rate, fetched from Frankfurter (a free exchange-rate service). We
          send only the currency codes, never anything about you or the deal. The receipt shows the
          original price, the rate and its date.
        </p>

        <h2>Everything we keep, at a glance</h2>
        <div className="table-wrap">
          <table className="receipt data-table">
            <thead>
              <tr>
                <th>What</th>
                <th>Why we need it</th>
                <th>How much detail</th>
                <th>How long</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Adults, children&apos;s ages and hold bags</td>
                <td>Bag rules and tourist taxes depend on age</td>
                <td>Ages only, never dates of birth or names; bags only if you give a number</td>
                <td>With the receipt</td>
              </tr>
              <tr>
                <td>Postcode</td>
                <td>Finding your council&apos;s school holidays</td>
                <td>Used at that moment only; letters only in statistics (SE)</td>
                <td>Not kept with the receipt; statistics 2 years</td>
              </tr>
              <tr>
                <td>Deal details you confirm</td>
                <td>Working out the true price</td>
                <td>Price, currency, nights, travel date or month, destination, seller, airline</td>
                <td>With the receipt</td>
              </tr>
              <tr>
                <td>Deal link</td>
                <td>So you can find the deal again</td>
                <td>Kept as written; we never open it</td>
                <td>With the receipt</td>
              </tr>
              <tr>
                <td>Exchange rate used</td>
                <td>Showing how a euro or dollar price became pounds</td>
                <td>Original price, rate and date</td>
                <td>With the receipt</td>
              </tr>
              <tr>
                <td>Price statistics</td>
                <td>Measuring school-holiday prices and seller fairness</td>
                <td>Anonymous line, week-level dates, not linked to you</td>
                <td>2 years</td>
              </tr>
              <tr>
                <td>Place checks (Visit, Plan B hospitals)</td>
                <td>So the next person doesn&apos;t wait</td>
                <td>Counts of what&apos;s nearby; nothing about you</td>
                <td>90 days</td>
              </tr>
              <tr>
                <td>Scrambled visitor code</td>
                <td>Stopping automated spam</td>
                <td>Made from your IP address; never the address</td>
                <td>Deleted 1 to 2 days after your last visit</td>
              </tr>
              <tr>
                <td>Seller and place names as typed</td>
                <td>A person checks a name before it can ever be shown</td>
                <td>The name only, with no link to you or your receipt</td>
                <td>Deleted after 90 days unless approved</td>
              </tr>
              <tr>
                <td>FairMark family code</td>
                <td>Counting different families, so one person can&apos;t sway a seller&apos;s FairMark</td>
                <td>A second scrambled code made from your IP address; never the address</td>
                <td>30 days, then removed from the receipt</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="hint">
          &ldquo;With the receipt&rdquo; means 30 days if you don&apos;t share it, 12 months from when you
          priced it if you do.
        </p>

        <h2>Why, and on what legal basis</h2>
        <p>Everything we keep is under &ldquo;legitimate interests&rdquo; (UK GDPR Article 6(1)(f)):</p>
        <ul>
          <li>working out the true price you asked for, and letting you share or list the receipt if you choose;</li>
          <li>keeping the site safe and working: the spam counter, and the family code that stops one person swaying FairMark;</li>
          <li>the anonymous price statistics, to show how prices change and how fair each seller is.</li>
        </ul>
        <p>
          We ask for children&apos;s ages only because bag rules and tourist taxes depend on them. The
          site is for parents and other adults, not for children to use. You can object to any of
          this at any time (see &ldquo;Your rights&rdquo;).
        </p>

        <h2>How long we keep it</h2>
        <ul>
          <li>Receipts you don&apos;t share: deleted automatically after <strong>30 days</strong>.</li>
          <li>Receipts you share: deleted <strong>12 months</strong> after you priced them.</li>
        </ul>

        <h2>Sharing a receipt</h2>
        <p>
          When you press Share, anyone with the link can see the receipt: the prices, the place (never
          the hotel or anything else you typed), nights, how many adults and children, and each fee
          line with its working. The shared page never shows your postcode, children&apos;s exact ages
          or the deal link, though a fee line can show how many people are in an age band (for
          example &ldquo;3 people aged 16+&rdquo;). Shared pages are hidden from search engines.
        </p>

        <h2>Stopping abuse</h2>
        <p>
          To stop automated spam we count requests per visitor. We store a scrambled code made from
          your IP address, never the address itself, and delete it 1 to 2 days after your last visit. FairMark keeps a second,
          different scrambled code with each receipt for 30 days, so the sellers&apos; leaderboard counts
          different families rather than clicks. Neither code contains your address, and we never try
          to work it out from them.
        </p>

        <h2>Cookies and tracking</h2>
        <p>
          We don&apos;t set any cookies, and we don&apos;t use tracking pixels, analytics or advertising.
          The only things we put in your browser are short hand-over notes: the deal you paste on
          the homepage, and your party, date and nights when you go from FairFam to Deal X-ray, so the
          next page can fill them in. They stay in that tab and are deleted as soon as the page opens. A Plan B card you save is a file on your own
          phone. The OpenStreetMap map on Visit before you book is loaded from openstreetmap.org, which
          has its own <a href="https://osmfoundation.org/wiki/Privacy_Policy" target="_blank" rel="noopener noreferrer">privacy policy</a>.
        </p>

        <h2>Who else handles it, and where</h2>
        <ul>
          <li>Supabase (our database), in London.</li>
          <li>
            Vercel (our website), with our servers in London. Like any web host it keeps short-lived
            logs of requests, which include your IP address and the page address. A page address can
            include a place name, postcode district, number of children or travel date you entered
            (never a deal you paste on the homepage, which we pass to the next page inside your browser).
          </li>
          <li>Google Cloud (reading deals), in London.</li>
          <li>Cloudflare (our domain and email forwarding) and Microsoft (our mailbox), if you email us.</li>
        </ul>
        <p>
          Each works for us under a data processing agreement and may only use your data to provide
          their service to us. They are US companies, so staff abroad could in rare cases access it;
          that&apos;s covered by the UK&apos;s US data bridge or the UK&apos;s standard contract clauses.
          We never sell your data or share it with anyone else, unless the law requires it.
          When we delete data it can stay in our database provider&apos;s backups for a short time,
          until they roll over.
        </p>
        <p>
          The place-name and postcode services above (OpenStreetMap, Photon, postcodes.io) and the
          exchange-rate service only ever receive a place name, a postcode district or a currency
          code from our server, never anything about you.
        </p>

        <h2>If you email us</h2>
        <p>
          Your email reaches us through Cloudflare&apos;s email forwarding into our Microsoft
          mailbox. We use it only to reply to you, and delete it within 12 months of the matter being
          closed.
        </p>

        <h2>Your rights</h2>
        <p>
          You can ask us for a copy of what we hold about you, to correct it, to delete it, to limit
          how we use it, and you can object to us using it. Email{" "}
          <a href={`mailto:${EMAILS.privacy}`}>{EMAILS.privacy}</a>; for a shared receipt, include its
          link. We reply within one month. A receipt you never shared has no link and nothing that
          names you, so we can&apos;t find it to show you; it is deleted after 30 days anyway.
        </p>

        <h2>Complaints</h2>
        <p>
          If you&apos;re unhappy with how we&apos;ve handled your data, tell us first at{" "}
          <a href={`mailto:${EMAILS.privacy}`}>{EMAILS.privacy}</a> (or any way you can reach us). We
          acknowledge every complaint within 30 days, look into it, keep you updated and tell you the
          outcome. You can also complain to the Information Commission (the ICO) at any time:{" "}
          <a href="https://ico.org.uk/make-a-complaint/" target="_blank" rel="noopener noreferrer">ico.org.uk/make-a-complaint</a>.
        </p>

        <p className="hint">Last updated 5 November 2026.</p>
      </div>
    </main>
  );
}
