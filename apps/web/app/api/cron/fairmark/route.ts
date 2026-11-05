import { NextResponse } from "next/server";
import { reindexFairMark } from "@/lib/quotes";
import { cronRefusal } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const preferredRegion = "lhr1";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * FairMark's nightly re-price (scheduled in vercel.json): every deal from the last 30 days is
 * priced again for the standard family with today's fees, so a fee change or a fixed rule
 * reaches the leaderboard by the next morning. Same CRON_SECRET as the FCDO job.
 */
export async function GET(req: Request) {
  const refused = cronRefusal(req);
  if (refused) return refused;
  const result = await reindexFairMark();
  console.log("FairMark re-index:", JSON.stringify(result));
  return NextResponse.json(result, { status: "error" in result ? 500 : 200 });
}
