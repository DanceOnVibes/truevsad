import type { Metadata } from "next";
import Link from "next/link";
import { ENGINE_VERSION, formatGBP, type CostCategory, type RuleUnit } from "@truevsad/true-cost";
import { EMAILS } from "@/lib/company";
import { loadPublicFeeRules, type PublicFeeRule } from "@/lib/quotes";

export const runtime = "nodejs";
export const preferredRegion = "lhr1";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Our fee tables — TrueVsAd",
  description: "Every tax, fee and extra TrueVsAd adds to a holiday price, with its source and the date we checked it.",
};

const SECTIONS: { category: CostCategory; title: string }[] = [
  { category: "levy", title: "Tourist taxes and local fees" },
  { category: "entry_doc", title: "Entry documents" },
  { category: "party_extra", title: "Bags and seats" },
  { category: "door_to_door", title: "Getting to the airport" },
  { category: "payment_fx", title: "Card and currency fees" },
];

const UNIT: Record<RuleUnit, string> = {
  per_party: "per booking",
  per_person: "per person",
  per_adult: "per adult",
  per_child: "per child",
  per_person_per_night: "per person, per night",
  per_adult_per_night: "per adult, per night",
  per_party_per_night: "per room, per night",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const isHoldBag = (r: PublicFeeRule) => r.category === "party_extra" && /hold bag|checked bag/i.test(r.label);

function amount(r: PublicFeeRule): string {
  // Bags are counted per bag: one per two people unless the family gives their own number.
  if (r.amountPence !== null && isHoldBag(r)) return `${formatGBP(r.amountPence)} per bag`;
  if (r.amountPence !== null) return `${formatGBP(r.amountPence)} ${UNIT[r.unit]}`;
  if (r.amountBp !== null) return `${(r.amountBp / 100).toFixed(2)}% of the advertised price`;
  return "";
}

function conditions(r: PublicFeeRule): string {
  const parts: string[] = [];
  if (r.minAge !== null && r.maxAge !== null) parts.push(`ages ${r.minAge}–${r.maxAge}`);
  else if (r.minAge !== null) parts.push(`aged ${r.minAge}+`);
  else if (r.maxAge !== null) parts.push(`up to age ${r.maxAge}`);
  if (r.maxNights !== null) parts.push(`first ${r.maxNights} nights only`);
  if (r.months.length > 0 && r.months.length < 12) {
    parts.push(`travel in ${r.months.map((m) => MONTHS.at(m - 1)).join(", ")}`);
  }
  if (r.supplierName) parts.push(`${r.supplierName} only`);
  return parts.join(" · ");
}

function where(r: PublicFeeRule): string {
  if (r.regions.length === 0) return r.supplierName ? "" : "Everywhere";
  const shown = r.regions.slice(0, 6).join(", ");
  return r.regions.length > 6 ? `${shown} and ${r.regions.length - 6} more` : shown;
}

export default async function FeesPage() {
  const rules = await loadPublicFeeRules();
  return (
    <main>
      <h1>Our fee tables</h1>
      <p className="lead">
        Every tax, fee and extra we add to a holiday price, with where it comes from and when we
        checked it. Nothing is hidden: this is exactly what the engine uses today.
      </p>

      {rules.length === 0 && <p className="hint">The fee tables are being updated. Please check back shortly.</p>}

      {SECTIONS.map(({ category, title }) => {
        const list = rules.filter((r) => r.category === category);
        if (list.length === 0) return null;
        return (
          <div className="card" key={category}>
            <h2 style={{ marginTop: 0 }}>{title}</h2>
            {category === "party_extra" && (
              <p className="hint">
                Advisory: these are in your true price. Hold bags are counted as one per two people aged 2
                and over unless you tell us how many you&apos;re taking. FairMark counts only one hold bag
                per booking, the same standard for every seller. Seats are counted only when the airline
                makes a family pay to sit together (Ryanair, easyJet, BA and TUI seat children with an adult
                for free), and never for adults-only bookings. Infant fees apply to children under 2.
              </p>
            )}
            <table className="receipt">
              <tbody>
                {list.map((r) => (
                  <tr key={`${r.label}-${r.validFrom}-${r.supplierName ?? ""}`}>
                    <td>
                      {r.label}
                      <div className="working">
                        {[where(r), conditions(r)].filter(Boolean).join(" · ")}
                      </div>
                      {r.sourceNote && <div className="working">{r.sourceNote}</div>}
                      <div className="working">
                        {r.sourceUrl && (
                          <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer">
                            Source
                          </a>
                        )}
                        {r.sourceUrl ? " · " : ""}
                        {Math.round(r.confidence * 100)}% sure
                        {r.validTo ? ` · until ${r.validTo}` : ""}
                      </div>
                    </td>
                    <td className="amt">{amount(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>How to read this</h2>
        <ul>
          <li>Foreign amounts are converted to pounds at the rate shown in each note.</li>
          <li>&ldquo;% sure&rdquo; is how confident we are in the figure: official published rates score high, typical prices that vary score lower.</li>
          <li>When a deal already includes something (bags, transfers, local taxes), we never add it again.</li>
          <li>
            Places we&apos;ve checked and found have no tourist tax (such as the Canary Islands outside
            Mogán, Cyprus and the Costa Blanca) don&apos;t appear here, because there&apos;s nothing to add.
          </li>
        </ul>
        <p className="hint">
          Spotted a figure that&apos;s wrong or out of date? Tell us at{" "}
          <a href={`mailto:${EMAILS.corrections}`}>{EMAILS.corrections}</a> and we&apos;ll fix it for everyone.
          Engine version {ENGINE_VERSION}.
        </p>
      </div>

      <p>
        <Link href="/fairmark/method">How FairMark works</Link> · <Link href="/how-we-earn">How we earn</Link>
      </p>
    </main>
  );
}
