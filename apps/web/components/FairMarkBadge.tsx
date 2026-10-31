import type { FairMark } from "@truevsad/true-cost";

/**
 * The FairMark badge: "Fair Price +7.4%". Works on server and client pages.
 * When FairMark is unavailable we say so in plain text rather than show a badge.
 */
export function FairMarkBadge({ fm, compact = false }: { fm: FairMark; compact?: boolean }) {
  if (fm.level === "unavailable") {
    return <span className="fm-none">FairMark unavailable</span>;
  }
  return (
    <span className={`fm fm-${fm.level}`} title="FairMark: how far the true price is above the advertised price">
      {fm.label}
      {!compact && <span className="fm-pct"> {fm.display}</span>}
    </span>
  );
}
