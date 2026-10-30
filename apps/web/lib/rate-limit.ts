import { createHmac } from "node:crypto";
import { supabaseAdmin } from "./supabase-admin";

export type RateAction = "extract" | "quote" | "share";

/** Requests allowed per visitor per hour. Generous for real families, tight for bots. */
const LIMITS: Record<RateAction, number> = {
  extract: 60,
  quote: 30,
  share: 30,
};
const WINDOW_SECONDS = 60 * 60;

/** Best-effort client IP. On Vercel the first x-forwarded-for entry is the visitor. */
function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Hash the IP with a server secret so the database never holds a raw IP
 * and the hash can't be reversed by guessing IPs.
 */
function visitorKey(ip: string): string | null {
  const secret = process.env.RATE_LIMIT_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) return null;
  return createHmac("sha256", secret).update(ip).digest("hex").slice(0, 32);
}

/**
 * Returns true if the request may go ahead.
 * Fails OPEN: if the database is unreachable, real users are never blocked.
 */
export async function allowRequest(req: Request, action: RateAction): Promise<boolean> {
  const db = supabaseAdmin();
  const key = visitorKey(clientIp(req));
  if (!db || !key) return true;

  const { data, error } = await db.rpc("hit_rate_limit", {
    p_bucket: `${action}:${key}`,
    p_max: LIMITS[action],
    p_window_seconds: WINDOW_SECONDS,
  });
  if (error) {
    console.error("rate limit check failed:", error.message);
    return true;
  }
  return data === true;
}
