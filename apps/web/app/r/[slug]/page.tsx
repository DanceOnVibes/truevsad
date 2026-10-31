import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatGBP } from "@truevsad/true-cost";
import { ReceiptView } from "@/components/ReceiptView";
import { loadPublicReceipt } from "@/lib/quotes";

export const runtime = "nodejs";
export const preferredRegion = "lhr1";
export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const r = await loadPublicReceipt(slug);
  if (!r) return { title: "Receipt not found — TrueVsAd", robots: { index: false } };
  return {
    title: `Advertised ${formatGBP(r.advertisedPence)} → really ${formatGBP(r.trueCostPence)} — TrueVsAd`,
    // Shared receipts are for the people they're sent to, not for search engines.
    robots: { index: false, follow: false },
  };
}

export default async function SharedReceiptPage({ params }: { params: Params }) {
  const { slug } = await params;
  const r = await loadPublicReceipt(slug);
  if (!r) notFound();

  const who = [
    `${r.adults} adult${r.adults === 1 ? "" : "s"}`,
    r.children ? `${r.children} child${r.children === 1 ? "" : "ren"}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <main>
      <h1>True price receipt</h1>
      <p className="lead">
        {r.destination ? `${r.destination} · ` : ""}
        {r.nights} night{r.nights === 1 ? "" : "s"} · {who} · priced{" "}
        {new Date(r.createdAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </p>
      {!r.usedDemoRules && r.todayTrueCostPence !== null && Math.abs(r.todayTrueCostPence - r.trueCostPence) >= 100 && (
        <p className="warn">
          Taxes or fees have changed since this was priced. With today&apos;s figures the same deal
          comes to <strong>{formatGBP(r.todayTrueCostPence)}</strong> (was {formatGBP(r.trueCostPence)}).
          The advertised price itself may have changed too, so check the deal.
        </p>
      )}
      <div className="card">
        <ReceiptView {...r} />
      </div>
      <p>
        <Link href="/xray">X-ray your own deal →</Link>
      </p>
      <p className="hint">
        Prices change. This receipt shows what the deal cost on the day it was priced.
      </p>
    </main>
  );
}
