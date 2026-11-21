import { NextResponse } from "next/server";
import { aiReaderStatus, gcpDiagnostics } from "@/lib/gcp-auth";
import { anthropicConfigured, probeModels } from "@/lib/extract-ai";
import { cronRefusal } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const preferredRegion = "lhr1";
export const dynamic = "force-dynamic";

/**
 * GET /api/health          → { aiReader: "ready" | "not_set_up" | "key_unreadable", claude: "ready" | "not_set_up" }.
 *                            aiReader is the Gemini backup (London); claude is Claude Haiku (US). Public, says nothing about either key.
 * GET /api/health?deep=1   → full diagnostics and a ping of each model. Only with
 *                            "Authorization: Bearer <CRON_SECRET>", so strangers can't learn
 *                            anything about our setup or spend our AI budget.
 *
 * Status codes per model: 200 works · 403 permission · 404 not in this region · 429 cap/quota
 */
export async function GET(req: Request) {
  const deep = new URL(req.url).searchParams.get("deep") === "1";
  if (!deep) {
    return NextResponse.json(
      { aiReader: aiReaderStatus(), claude: anthropicConfigured() ? "ready" : "not_set_up" },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const refused = cronRefusal(req);
  if (refused) return refused;
  const probe = await probeModels();
  return NextResponse.json({ config: gcpDiagnostics(), probe }, { headers: { "Cache-Control": "no-store" } });
}
