import type { FairMark } from "@truevsad/true-cost";

export type VerdictTone = "go" | "check" | "stop";

/**
 * The receipt's verdict, straight from its FairMark level: a verdict on the price, never on the place.
 * Gold or Fair Price → SAFE TO GO · Higher gap → CHECK · High gap → STOP · unavailable → no stamp.
 */
export function verdictFor(fm: FairMark | undefined | null): { word: string; small: string; tone: VerdictTone } | null {
  if (!fm) return null;
  switch (fm.level) {
    case "gold":
      return { word: "SAFE TO GO", small: "FAIRMARK GOLD", tone: "go" };
    case "fair":
      return { word: "SAFE TO GO", small: "FAIR PRICE", tone: "go" };
    case "higher":
      return { word: "CHECK", small: "HIGHER GAP", tone: "check" };
    case "high":
      return { word: "STOP", small: "HIGH GAP", tone: "stop" };
    default:
      return null;
  }
}

/** The round rubber stamp. Always a word plus the FairMark label, never colour alone. */
export function VerdictStamp({ fm, className = "" }: { fm: FairMark | undefined | null; className?: string }) {
  const v = verdictFor(fm);
  if (!v) return null;
  const [first, ...rest] = v.word.split(" ");
  return (
    <span className={`stamp stamp-${v.tone} ${className}`} role="img" aria-label={`Verdict: ${v.word.toLowerCase()}, ${v.small.toLowerCase()}`}>
      <strong>
        {first}
        {rest.length > 0 && (
          <>
            <br />
            {rest.join(" ")}
          </>
        )}
      </strong>
      <small>{v.small}</small>
    </span>
  );
}
