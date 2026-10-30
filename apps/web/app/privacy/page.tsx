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
          <li>The deal details you confirm: price, nights, destination, supplier.</li>
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
          references before uploading a screenshot.
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
