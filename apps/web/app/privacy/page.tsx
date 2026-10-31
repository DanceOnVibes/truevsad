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
          <li>The <strong>first half</strong> of your postcode only (e.g. SE11), if you give it.</li>
          <li>The deal details you confirm: price, nights, travel date (if you give it), destination, supplier.</li>
          <li>The link to the deal, if you paste one. We never open it ourselves.</li>
          <li>The price breakdown we worked out.</li>
        </ul>
        <p>
          We do <strong>not</strong> ask for or store names, email addresses, full postcodes,
          passport details or payment details. We never take payment.
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
          and the price per person before and after extras. It has no link to your receipt and holds
          no ages, postcode, deal link or exact dates (only the week). We keep it for 2 years to
          measure how prices change in school holidays and how fair each seller is over time.
        </p>

        <h2>FairMark board and leaderboard</h2>
        <p>
          The FairMark leaderboard is built from anonymous totals per holiday seller across all the
          deals checked in the last 30 days: it never shows a single family&apos;s deal. A shared
          receipt appears on the public FairMark board only if you tick the box when you share it. The
          board shows the destination, seller, nights, number of adults and children and the prices,
          never your postcode, children&apos;s ages or the deal link.
        </p>

        <h2>School Window and splitting a price</h2>
        <p>
          Checking a date against your council&apos;s school holidays, or splitting a price between
          families, is worked out on the spot. We don&apos;t save which council you chose, your dates
          or the split.
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

        <p className="hint">Last updated 30 October 2026.</p>
      </div>
    </main>
  );
}
