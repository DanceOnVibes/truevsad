import { AIRLINE_BAGS, LOCAL_TAX_NOTES, freshnessIssues, type FreshnessIssue } from "@truevsad/true-cost";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { checkedOnFrom } from "@/lib/quotes";
import { rateToGBP } from "@/lib/currency";
import VERIFIED from "@/lib/emergency-verified.json";

/**
 * The daily freshness check: gathers every dated fact the site relies on, works out what's
 * expiring or overdue (freshnessIssues in the engine), and saves the list to freshness_report
 * for the weekly reminder. Reads only; it never changes a fee, a date or a number by itself.
 */
export async function runFreshnessCheck(): Promise<{ issues: FreshnessIssue[] } | { error: string }> {
  const db = supabaseAdmin();
  if (!db) return { error: "Supabase isn't configured" };
  const today = new Date().toISOString().slice(0, 10);
  const staleSince = new Date(Date.now() - 3 * 86_400_000).toISOString();

  const [rulesRes, holidaysRes, fcdoRes, eur] = await Promise.all([
    db.from("fee_rule").select("label, valid_to, source_note").eq("is_active", true),
    db.from("school_holiday").select("authority, ends_on, checked_on"),
    db.from("fcdo_advice").select("slug", { count: "exact", head: true }).or(`checked_at.is.null,checked_at.lt.${staleSince}`),
    rateToGBP("EUR"),
  ]);
  if (rulesRes.error) return { error: `fee_rule read failed: ${rulesRes.error.message}` };
  if (holidaysRes.error) return { error: `school_holiday read failed: ${holidaysRes.error.message}` };

  // One line per council: its last published holiday, and the oldest date we took its dates.
  const councils = new Map<string, { authority: string; lastEndsOn: string; takenOn: string | null }>();
  for (const h of (holidaysRes.data ?? []) as { authority: string; ends_on: string; checked_on: string | null }[]) {
    const c = councils.get(h.authority) ?? { authority: h.authority, lastEndsOn: h.ends_on, takenOn: h.checked_on };
    if (h.ends_on > c.lastEndsOn) c.lastEndsOn = h.ends_on;
    if (h.checked_on && (!c.takenOn || h.checked_on < c.takenOn)) c.takenOn = h.checked_on;
    councils.set(h.authority, c);
  }

  const issues = freshnessIssues({
    today,
    rules: ((rulesRes.data ?? []) as { label: string; valid_to: string | null; source_note: string | null }[]).map((r) => ({
      label: r.label,
      validTo: r.valid_to,
      checkedOn: checkedOnFrom(r.source_note) ?? null,
      sourceNote: r.source_note,
    })),
    localTaxNotes: LOCAL_TAX_NOTES,
    emergencyChecks: (VERIFIED as { countries: { slug: string; checkedOn: string }[] }).countries.map((c) => ({
      slug: c.slug,
      checkedOn: c.checkedOn,
    })),
    airlineBags: AIRLINE_BAGS,
    councils: [...councils.values()],
    fcdoStale: fcdoRes.count ?? 0,
    eurToGbp: eur?.rate ?? null,
  });

  const { error } = await db.from("freshness_report").upsert({ id: 1, run_at: new Date().toISOString(), issues });
  if (error) return { error: `freshness_report save failed: ${error.message}` };
  return { issues };
}
