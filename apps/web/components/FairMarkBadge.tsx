import { formatGBP, type FairMark } from "@truevsad/true-cost";

/**
 * The FairMark badge: "Fair Price +7.4%". Works on server and client pages.
 * When FairMark is unavailable we say so in plain text rather than show a badge.
 */
export function FairMarkBadge({ fm, compact = false }: { fm: FairMark; compact?: boolean }) {
  if (fm.level === "unavailable") {
    return <span className="fm-none">FairMark unavailable</span>;
  }
  return (
    <span className={`fm fm-${fm.level}`} title="FairMark: taxes and fees the advert left out, plus one standard hold bag">
      {fm.label}
      {!compact && <span className="fm-pct"> {fm.display}</span>}
    </span>
  );
}

/** The one-line "why" under the badge, plus the split between required fees and family extras. */
export function FairMarkDetail({ fm }: { fm: FairMark }) {
  if (fm.level === "unavailable") {
    return <p className="hint">{fm.summary}</p>;
  }
  return (
    <>
      <p className="hint">{fm.summary}</p>
      {(fm.requiredPence > 0 || fm.standardBagPence > 0 || fm.extrasPence > 0) && (
        <p className="hint">
          Taxes and fees the advert left out: {formatGBP(fm.requiredPence)}
          {fm.standardBagPence > 0 && <> · One hold bag (our standard for every seller): {formatGBP(fm.standardBagPence)}</>}
          {" "}· Your family&apos;s extras (advisory, in your total only): {formatGBP(fm.extrasPence)}
        </p>
      )}
      <p className="hint">
        <a href="/fairmark/method">How FairMark works</a> · Fair means honest, not necessarily cheap.
      </p>
    </>
  );
}
