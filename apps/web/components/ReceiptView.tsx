import { formatGBP, type CostCategory, type CostLine, type Inclusion } from "@truevsad/true-cost";
import { INCLUSION_LABELS } from "@/lib/supplier-defaults";

export const CATEGORY_LABELS: Record<CostCategory, string> = {
  supplier: "Flight + stay",
  party_extra: "Party extras",
  levy: "Taxes & levies",
  entry_doc: "Entry documents",
  door_to_door: "Door to door",
  payment_fx: "Payment & FX",
};

export interface ReceiptViewProps {
  advertisedPence: number;
  trueCostPence: number;
  gapPence: number;
  confidence: number;
  usedDemoRules: boolean;
  lines: CostLine[];
  /** What the deal already includes — shown so families see why no fee was added. */
  includes?: Inclusion[];
}

/** The Receipt. Used on the X-ray page and on shared /r/[slug] pages. */
export function ReceiptView(props: ReceiptViewProps) {
  const { advertisedPence, trueCostPence, gapPence, confidence, usedDemoRules, lines, includes } = props;
  const gapRatio = advertisedPence > 0 ? gapPence / advertisedPence : 0;

  return (
    <>
      {usedDemoRules && (
        <p className="warn">
          Demo figures — extras below are placeholders, not real prices yet. Do not use this to
          make a booking decision.
        </p>
      )}

      <div className="headline">
        <div>
          <div className="hint">Advertised</div>
          <div className="num">{formatGBP(advertisedPence)}</div>
        </div>
        <div className="num">→</div>
        <div>
          <div className="hint">True all-in</div>
          <div className="num">{formatGBP(trueCostPence)}</div>
        </div>
        <div>
          <div className="hint">Gap</div>
          <div className="num gap">
            {gapPence > 0 ? "+" : ""}
            {formatGBP(gapPence)} ({Math.round(gapRatio * 100)}%)
          </div>
        </div>
      </div>
      <p className="hint">Confidence: {Math.round(confidence * 100)}%</p>

      <h3>Receipt</h3>
      <table className="receipt">
        <tbody>
          {lines.map((l, i) => (
            <tr key={i}>
              <td>
                {l.label}
                <div className="working">
                  {CATEGORY_LABELS[l.category]}
                  {l.working ? ` · ${l.working}` : ""}
                </div>
              </td>
              <td className="amt">{formatGBP(l.amountPence)}</td>
            </tr>
          ))}
          <tr className="total">
            <td>True all-in price</td>
            <td className="amt">{formatGBP(trueCostPence)}</td>
          </tr>
        </tbody>
      </table>
      {includes && includes.length > 0 && (
        <p className="hint">
          Already included in the deal, so not charged again:{" "}
          {includes.map((i) => INCLUSION_LABELS[i]).join(", ")}.
        </p>
      )}
    </>
  );
}
