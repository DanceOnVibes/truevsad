import Link from "next/link";

export default function Home() {
  return (
    <main>
      <h1>TrueVsAd</h1>
      <p className="lead">
        The advertised price is never the price your family pays. We show the true all-in cost for
        your exact party — bags, seats, tourist taxes, travel documents, getting to the airport and
        card fees — next to the headline.
      </p>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Deal X-ray</h2>
        <p>Paste a holiday deal and see what it really costs.</p>
        <Link href="/xray">Open Deal X-ray →</Link>
      </div>
      <p className="hint">
        We never take payment and our ranking ignores commission. You always book directly with the
        supplier.
      </p>
    </main>
  );
}
