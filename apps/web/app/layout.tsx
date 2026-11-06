import type { Metadata } from "next";
import Link from "next/link";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import { COMPANY, EMAILS } from "@/lib/company";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://truevsad.co.uk"),
  title: "TrueVsAd — the true price of your holiday",
  description:
    "See the true all-in price for your exact family party, versus the advertised headline.",
};

// Served from our own domain at build time: visitors' browsers never contact Google.
const display = Space_Grotesk({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "700"], variable: "--font-display-loaded", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "600"], variable: "--font-mono-loaded", display: "swap" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${display.variable} ${mono.variable}`}>
      <body>
        <div className="sky-gulls" aria-hidden="true">
          <span className="gull g1" />
          <span className="gull g2" />
          <span className="gull g3" />
          <span className="gull g4" />
          <span className="gull g5" />
        </div>
        <SiteHeader />
        {children}
        <footer className="site-footer">
          <Link href="/">TrueVsAd</Link> · <Link href="/xray">Deal X-ray</Link> · <Link href="/fairfam">FairFam</Link> · <Link href="/cabin-bags">Cabin bags</Link> ·{" "}
          <Link href="/school-window">School Window</Link> · <Link href="/visit">Visit before you book</Link> · <Link href="/plan-b">Plan B</Link> · <Link href="/hotel-problems">Hotel problems</Link> ·{" "}
          <Link href="/fairmark">FairMark</Link> · <Link href="/how-we-earn">How we earn</Link> · <Link href="/sellers">For sellers</Link> · <Link href="/fees">Fee tables</Link> ·{" "}
          <Link href="/about">About</Link> · <Link href="/terms">Terms</Link> · <Link href="/privacy">Privacy</Link>
          <div>We never take payment. Rankings ignore commission.</div>
          <div>
            Contact: <a href={`mailto:${EMAILS.hello}`}>{EMAILS.hello}</a>
          </div>
          <div>
            © {new Date().getFullYear()} {COMPANY.name} · Registered in England and Wales, company
            no. {COMPANY.number} · {COMPANY.address}
          </div>
        </footer>
      </body>
    </html>
  );
}
