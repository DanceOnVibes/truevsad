import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrueVsAd — the true price of your holiday",
  description:
    "See the true all-in price for your exact family party, versus the advertised headline.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}
