import Link from "next/link";
import { FAIRMARK_SCALE } from "@truevsad/true-cost";

export default function Home() {
  return (
    <main>
      <h1>TrueVsAd</h1>
      <p className="lead">
        The advertised price is never the price your family pays. We show the true cost for your exact
        party — bags, seats, tourist taxes and travel documents — next to the headline, and every
        receipt says exactly what it hasn&apos;t checked yet.
      </p>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Deal X-ray</h2>
        <p>Paste a holiday deal and see what it really costs.</p>
        <Link href="/xray">Open Deal X-ray →</Link>
      </div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>FairFam</h2>
        <p>
          Your school dates, your family, one honest price. Find the weeks every child is off, then check
          any deal&apos;s true price for your party.
        </p>
        <Link href="/fairfam">Open FairFam →</Link>
      </div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>School Window</h2>
        <p>See your council&apos;s school holidays, the quieter weeks either side, and what a trip would miss.</p>
        <Link href="/school-window">Open School Window →</Link>
      </div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Visit before you book</h2>
        <p>Is the resort right for your group? Playgrounds, beaches, nightlife and essentials nearby.</p>
        <Link href="/visit">Check a place →</Link>
      </div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>FairMark</h2>
        <p>Which holiday prices are honest? See the fairest sellers this month, and deals whose adverts left out {FAIRMARK_SCALE.fair}% or less.</p>
        <Link href="/fairmark">See FairMark →</Link>
      </div>
      <p className="hint">
        We never take payment and our ranking ignores commission. You always book directly with the
        supplier.
      </p>
    </main>
  );
}
