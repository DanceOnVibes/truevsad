import Link from "next/link";

/** The site's top bar: the wordmark with its two signal lights, the main tools, and the X-ray button. */
export function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="wordmark" aria-label="TrueVsAd home">
        <span className="signal" aria-hidden="true">
          <span className="signal-stop" />
          <span className="signal-go" />
        </span>
        TrueVsAd
      </Link>
      <nav aria-label="Main">
        <Link href="/xray">Deal X-ray</Link>
        <Link href="/fairfam">FairFam</Link>
        <Link href="/plan-b">Plan B</Link>
        <Link href="/fairmark">FairMark</Link>
        <Link href="/xray" className="nav-cta">
          X-ray a deal
        </Link>
      </nav>
    </header>
  );
}
