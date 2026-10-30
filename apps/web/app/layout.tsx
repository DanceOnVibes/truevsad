import type { Metadata } from "next";
import Link from "next/link";
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
          <Link href="/privacy">Privacy</Link>
          <div>We never take payment. Rankings ignore commission.</div>
          <div>© {new Date().getFullYear()} DanceOnVibes Limited</div>
        </footer>
      </body>
    </html>
  );
}
