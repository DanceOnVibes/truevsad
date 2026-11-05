import { NextResponse } from "next/server";
import { runFreshnessCheck } from "@/lib/freshness";
import { cronRefusal } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const preferredRegion = "lhr1";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * The daily freshness check (scheduled in vercel.json, after the FCDO job): what's expiring,
 * overdue for a re-check, or moved, saved to freshness_report. Same CRON_SECRET as the other jobs.
 */
export async function GET(req: Request) {
  const refused = cronRefusal(req);
  if (refused) return refused;
  const result = await runFreshnessCheck();
  console.log("Freshness check:", JSON.stringify("error" in result ? result : { issues: result.issues.length }));
  return NextResponse.json(result, { status: "error" in result ? 500 : 200 });
}
