import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

/**
 * Scheduled jobs (vercel.json) are called by Vercel with "Authorization: Bearer <CRON_SECRET>".
 * Returns a refusal to send back, or null when the caller is allowed. The comparison takes the
 * same time whatever was sent, so the secret can't be guessed a letter at a time.
 */
export function cronRefusal(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET isn't set" }, { status: 503 });
  const sent = createHash("sha256").update(req.headers.get("authorization") ?? "").digest();
  const expected = createHash("sha256").update(`Bearer ${secret}`).digest();
  return timingSafeEqual(sent, expected) ? null : NextResponse.json({ error: "Not allowed" }, { status: 401 });
}
