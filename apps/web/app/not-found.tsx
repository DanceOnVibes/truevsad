import Link from "next/link";
import { HolidayScene } from "@/components/HolidayScene";

export default function NotFound() {
  return (
    <main>
      <HolidayScene mood="dusk" focus="center" label="TRUEVSAD · 404 · OFF THE MAP" />
      <h1>Page not found</h1>
      <p className="lead">
        We couldn&apos;t find that page. It may have moved, or the link may have a typo.
      </p>
      <div className="card">
        <p style={{ marginTop: 0 }}>Where to next:</p>
        <ul>
          <li>
            <Link href="/xray">Deal X-ray</Link>: paste a deal and see its true price
          </li>
          <li>
            <Link href="/fairfam">FairFam</Link>: your school dates, your family, one honest price
          </li>
          <li>
            <Link href="/">Home</Link>
          </li>
        </ul>
      </div>
    </main>
  );
}
