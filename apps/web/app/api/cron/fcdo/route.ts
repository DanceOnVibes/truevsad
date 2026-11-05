import { NextResponse } from "next/server";
import { refreshFcdo } from "@/lib/fcdo";
import { cronRefusal } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const preferredRegion = "lhr1";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Plan B's daily refresh of the FCDO's travel advice (scheduled in vercel.json).
 * Vercel sends "Authorization: Bearer <CRON_SECRET>" with every scheduled run; anything else is refused.
 */
export async function GET(req: Request) {
  const refused = cronRefusal(req);
  if (refused) return refused;
  const result = await refreshFcdo();
  console.log("FCDO refresh:", JSON.stringify(result));
  return NextResponse.json(result, { status: "error" in result ? 500 : 200 });
}
