import { NextResponse } from "next/server";
import { gcpDiagnostics } from "@/lib/gcp-auth";
import { probeModels } from "@/lib/extract-ai";
import { allowRequest } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const preferredRegion = "lhr1";
export const dynamic = "force-dynamic";

/**
 * GET /api/health          → is the AI reader configured? (no secrets, no Google calls)
 * GET /api/health?deep=1   → also gets a Google token and pings each model (rate-limited)
 *
 * Status codes per model: 200 works · 403 permission · 404 not in this region · 429 cap/quota
 */
export async function GET(req: Request) {
  const config = gcpDiagnostics();
  const deep = new URL(req.url).searchParams.get("deep") === "1";
  if (!deep) return NextResponse.json({ config }, { headers: { "Cache-Control": "no-store" } });

  if (!(await allowRequest(req, "extract"))) {
    return NextResponse.json({ error: "Too many checks. Try again later." }, { status: 429 });
  }
  const probe = await probeModels();
  return NextResponse.json({ config, probe }, { headers: { "Cache-Control": "no-store" } });
}
