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
          We are registered with the Information Commissioner&apos;s Office (registration{" "}
          {COMPANY.ico}).
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

        <h2>Visit before you book</h2>
        <p>
          When you check a place, we send only the place name you typed to OpenStreetMap&apos;s free
          services (Nominatim and Overpass) to find it and count what&apos;s nearby. We keep that
          result, which has nothing about you in it, so the next person doesn&apos;t have to wait.
          The map on that page loads from openstreetmap.org in your browser, so OpenStreetMap sees
          your IP address, as with any website. The Street View and Google Maps links open Google
          only if you click them.
        </p>

        <h2>Anonymous price statistics</h2>
        <p>
          Each time a deal is X-rayed we also keep one anonymous line of statistics: the seller, the
          town and country, the week of travel, the number of nights, how many people and children,
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
          board shows the destination, seller, nights, number of adults and children and the prices,
          never your postcode, children&apos;s ages or the deal link.
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
          If you give the first half of your postcode (on School Window or the X-ray), we send only
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
                <td>Place checks (Visit)</td>
                <td>So the next person doesn&apos;t wait</td>
                <td>Counts of what&apos;s nearby; nothing about you</td>
                <td>90 days</td>
              </tr>
              <tr>
                <td>Scrambled visitor code</td>
                <td>Stopping automated spam</td>
                <td>Made from your IP address; never the address</td>
                <td>Under a day</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="hint">
          &ldquo;With the receipt&rdquo; means 30 days if you don&apos;t share it, 12 months if you do.
        </p>

        <h2>Why</h2>
        <p>
          To work out the true price you asked for, and to let you share the receipt if you choose
          to. Our lawful basis is legitimate interests: providing the service you requested.
        </p>

        <h2>How long we keep it</h2>
        <ul>
          <li>Receipts you don&apos;t share: deleted automatically after <strong>30 days</strong>.</li>
          <li>Receipts you share: deleted after <strong>12 months</strong>.</li>
        </ul>

        <h2>Sharing a receipt</h2>
        <p>
          When you press Share, anyone with the link can see the receipt: the prices, destination,
          nights and how many adults and children. The shared page never shows your postcode,
          children&apos;s ages or the deal link. Shared pages are hidden from search engines.
        </p>

        <h2>Stopping abuse</h2>
        <p>
          To stop automated spam we count requests per visitor. We store a scrambled code made from
          your IP address, never the address itself, and delete it within a day.
        </p>

        <h2>Cookies and tracking</h2>
        <p>We don&apos;t use advertising cookies, tracking pixels or analytics.</p>

        <h2>Where your data lives</h2>
        <p>
          Our database is hosted by Supabase in London. The website runs on Vercel, with our
          servers in London; Vercel may keep short-lived technical logs of requests. Deal reading
          runs on Google Cloud in London.
        </p>

        <h2>Your rights</h2>
        <p>
          You can ask us what we hold, or ask us to delete a receipt: email{" "}
          <a href={`mailto:${EMAILS.privacy}`}>{EMAILS.privacy}</a> with its share link. We reply
          within one month. You can also complain to the Information Commissioner&apos;s Office
          (ico.org.uk).
        </p>

        <p className="hint">Last updated 31 October 2026.</p>
      </div>
    </main>
  );
}
