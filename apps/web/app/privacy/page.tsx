import type { Metadata } from "next";

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
          TrueVsAd is run by DanceOnVibes Limited, a company registered in England and Wales.
          {/* TODO(Adalbert): add company number, registered office and a contact email. */}
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
          servers in London; Vercel may keep short-lived technical logs of requests.
        </p>

        <h2>Your rights</h2>
        <p>
          You can ask us what we hold, or ask us to delete a receipt — send us its share link. You
          can also complain to the Information Commissioner&apos;s Office (ico.org.uk).
        </p>

        <p className="hint">Last updated 30 October 2026.</p>
      </div>
    </main>
  );
}
