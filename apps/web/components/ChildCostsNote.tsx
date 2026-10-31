import { formatGBP } from "@truevsad/true-cost";

/**
 * "Kids go free"? Shows what each child still costs in extras (bags, seats, taxes).
 * Ages are shown only to the family on their own receipt; shared receipts say "Child 1, Child 2".
 */
export function ChildCostsNote({ costs }: { costs: { age?: number; pence: number }[] }) {
  if (costs.length === 0) return null;
  const total = costs.reduce((s, c) => s + c.pence, 0);
  const name = (c: { age?: number }, i: number) => (c.age !== undefined ? `Your ${c.age}-year-old` : `Child ${i + 1}`);
  return (
    <div className="warn" style={{ marginTop: 12 }}>
      <strong>The advert says children go free.</strong>{" "}
      {total === 0
        ? "With the extras we know about, they really do cost nothing more here."
        : `They still cost ${formatGBP(total)} in extras on this receipt:`}
      {total > 0 && (
        <ul style={{ margin: "6px 0 0" }}>
          {costs.map((c, i) => (
            <li key={i}>
              {name(c, i)}: {formatGBP(c.pence)}
            </li>
          ))}
        </ul>
      )}
      <div className="hint" style={{ color: "inherit" }}>
        If the advert&apos;s price is per person, make sure a free child isn&apos;t counted in it, or switch to
        &ldquo;total for everyone&rdquo;.
      </div>
    </div>
  );
}
