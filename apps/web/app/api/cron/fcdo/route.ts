import { NextResponse } from "next/server";
import { refreshFcdo } from "@/lib/fcdo";

export const runtime = "nodejs";
export const preferredRegion = "lhr1";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Plan B's daily refresh of the FCDO's travel advice (scheduled in vercel.json).
 * Vercel sends "Authorization: Bearer <CRON_SECRET>" with every scheduled run; anything else is refused.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET isn't set" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const result = await refreshFcdo();
  console.log("FCDO refresh:", JSON.stringify(result));
  return NextResponse.json(result, { status: "error" in result ? 500 : 200 });
}
