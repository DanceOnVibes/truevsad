import type { Metadata } from "next";
import Link from "next/link";
import { COMPANY, EMAILS } from "@/lib/company";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://truevsad.co.uk"),
  title: "TrueVsAd — the true price of your holiday",
  description:
    "See the true all-in price for your exact family party, versus the advertised headline.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body>
        {children}
        <footer className="site-footer">
          <Link href="/">TrueVsAd</Link> · <Link href="/xray">Deal X-ray</Link> ·{" "}
          <Link href="/school-window">School Window</Link> · <Link href="/visit">Visit before you book</Link> ·{" "}
          <Link href="/fairmark">FairMark</Link> · <Link href="/how-we-earn">How we earn</Link> · <Link href="/fees">Fee tables</Link> ·{" "}
          <Link href="/privacy">Privacy</Link>
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
