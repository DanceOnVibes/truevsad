import { ADVISORY_CATEGORIES, airlineBagsFor, CARD_FEES_CHECKED_ON, cardFeeNote, dropOffFor, formatGBP, localTaxNoteFor, NO_FEE_CARDS, SURCHARGE_BAN_URL, transferFor, receiptScope, type CostCategory, type CostLine, type FairMark, type Inclusion } from "@truevsad/true-cost";
import { FairMarkBadge, FairMarkDetail } from "./FairMarkBadge";
import { EMAILS } from "@/lib/company";
import { INCLUSION_LABELS } from "@/lib/supplier-defaults";

export const CATEGORY_LABELS: Record<CostCategory, string> = {
  supplier: "Advertised deal",
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
  /** The advert said its price is "plus taxes and fees" (or similar). */
  excludesTaxesAndFees?: boolean;
  /** Assumptions the engine made, e.g. summer rates without a travel date. */
  notes?: string[];
  /** FairMark for this receipt (badge + exact %), shown next to the true price. */
  fairMark?: FairMark;
  /** Airline (or seller) name, to show its cabin bag sizes. */
  airline?: string | null;
  /** UK airport the family flies from, to show what being dropped off there costs. */
  departAirport?: string | null;
  /** Where the holiday is, to show official public transfer fares when transfers aren't included. */
  destination?: string | null;
  /** Currency the advert was priced in ("EUR", "USD"); a card-fee note shows for anything but pounds. */
  advertisedCurrency?: string | null;
}

function checkedLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/** Confidence as something the family can act on, not a mood. */
function nextStep(lines: CostLine[], notes: string[] | undefined): string | null {
  if (notes?.some((n) => n.startsWith("No travel date"))) return "Add your travel date or month to make it more exact.";
  if (lines.some((l) => /airline not stated/i.test(l.label))) return "Choose the airline to make it more exact.";
  if (lines.some((l) => l.category !== "supplier" && l.confidence < 0.5)) return "Some fees are typical prices rather than this seller's own.";
  return null;
}

/** The Receipt. Used on the X-ray page and on shared /r/[slug] pages. */
export function ReceiptView(props: ReceiptViewProps) {
  const { advertisedPence, trueCostPence, gapPence, confidence, usedDemoRules, lines, includes, excludesTaxesAndFees, notes, fairMark } =
    props;
  const bags = airlineBagsFor(props.airline ?? undefined);
  const dropOff = dropOffFor(props.departAirport);
  const transfer = includes?.includes("transfers") ? undefined : transferFor(props.destination);
  const cardFee = cardFeeNote(props.advertisedCurrency, advertisedPence);
  const localTax = includes?.includes("local_taxes") ? undefined : localTaxNoteFor(props.destination);
  const today = new Date().toISOString().slice(0, 10);
  const underseat = bags?.bags.find((b) => b.kind === "underseat" && b.verified && b.dims);
  const cabin = bags?.bags.find((b) => b.kind === "cabin" && b.verified && b.dims);
  const gapRatio = advertisedPence > 0 ? gapPence / advertisedPence : 0;
  const scope = receiptScope({ includes }, { receipt: { lines, subtotals: {} as never } });

  return (
    <>
      {usedDemoRules && (
        <p className="warn">
          Demo figures — extras below are placeholders, not real prices yet. Do not use this to
          make a booking decision.
        </p>
      )}

      {excludesTaxesAndFees && (
        <p className="warn">
          The advert says its price is &ldquo;plus taxes and fees&rdquo;. We&apos;ve added the
          ones we know about, but the seller may add more at checkout, so the true price could be
          higher than shown here.
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
          {fairMark && (
            <div className="fm-row">
              <FairMarkBadge fm={fairMark} />
            </div>
          )}
        </div>
        <div>
          <div className="hint">Gap</div>
          <div className="num gap">
            {gapPence > 0 ? "+" : ""}
            {formatGBP(gapPence)} ({Math.round(gapRatio * 100)}%)
          </div>
        </div>
      </div>
      {fairMark && <FairMarkDetail fm={fairMark} />}
      <p className="hint">
        Confidence: {Math.round(confidence * 100)}%
        {(() => {
          const step = nextStep(lines, notes);
          return step ? ` · ${step}` : "";
        })()}
      </p>
      {notes?.map((n) => (
        <p key={n} className="hint">
          {n}
        </p>
      ))}

      <h3>Receipt</h3>
      <table className="receipt">
        <tbody>
          {lines.map((l, i) => (
            <tr key={i}>
              <td>
                {l.label}
                <div className="working">
                  {CATEGORY_LABELS[l.category]}
                  {(l.advisory || ADVISORY_CATEGORIES.includes(l.category)) && (
                    <span className="advisory-tag"> · advisory</span>
                  )}
                  {l.working ? ` · ${l.working}` : ""}
                  {l.sourceUrl && (
                    <>
                      {" · "}
                      <a href={l.sourceUrl} target="_blank" rel="noopener noreferrer">
                        source
                      </a>
                    </>
                  )}
                  {l.checkedOn && checkedLabel(l.checkedOn) ? ` · checked ${checkedLabel(l.checkedOn)}` : ""}
                  {l.category !== "supplier" && (
                    <>
                      {" · "}
                      <a
                        href={`mailto:${EMAILS.corrections}?subject=${encodeURIComponent(`Wrong fee: ${l.label}`)}`}
                      >
                        wrong fee?
                      </a>
                    </>
                  )}
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
      <div className="scope">
        {scope.counted.length > 0 && (
          <>
            <h4>How we counted</h4>
            <ul>
              {scope.counted.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </>
        )}
        <h4>Not checked on this receipt</h4>
        <ul>
          {scope.notChecked.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <p className="hint">
          The true price above covers everything else listed on the receipt, each with its source.
        </p>
        {bags && (underseat || cabin) && (
          <>
            <h4>Cabin bags on {bags.airline}</h4>
            <ul>
              {underseat && (
                <li>
                  Free under-seat bag: {underseat.dims!.join(" × ")} cm
                  {underseat.maxKg ? `, up to ${underseat.maxKg}kg` : ""}.
                </li>
              )}
              {cabin && (
                <li>
                  Cabin bag: {cabin.dims!.join(" × ")} cm{cabin.maxKg ? `, up to ${cabin.maxKg}kg` : ""},{" "}
                  {cabin.price === "free" ? "free on every fare" : cabin.price === "paid" ? "paid extra" : "included on some fares only"}.
                  {cabin.price !== "free" && cabin.buyPrice ? ` To add it: ${cabin.buyPrice}.` : ""}
                  {cabin.gateFee ? ` Too big at the gate: ${cabin.gateFee}.` : ""}
                </li>
              )}
            </ul>
            <p className="hint">
              Sizes include wheels and handles unless the airline says otherwise.{" "}
              <a href="/cabin-bags">Check your bag →</a>
            </p>
          </>
        )}
        {localTax && (
          <>
            <h4>{localTax.name}: not in this total</h4>
            <p className="hint">
              {localTax.text}{" "}
              {localTax.temporary && today <= localTax.temporary.until && (
                <>
                  {localTax.temporary.text}{" "}
                  <a href={localTax.temporary.sourceUrl} target="_blank" rel="noopener noreferrer">Source</a>.{" "}
                </>
              )}
              We can&apos;t work it out from a package price, so it isn&apos;t added.{" "}
              <a href={localTax.sourceUrl} target="_blank" rel="noopener noreferrer">Official rules</a>, checked{" "}
              {checkedLabel(localTax.checkedOn)}.
            </p>
          </>
        )}
        {cardFee && (
          <>
            <h4>Paying in {props.advertisedCurrency === "USD" ? "dollars" : "euros"} with a UK card</h4>
            <ul>
              <li>
                Most standard UK debit cards add {cardFee.lowPercent}–{cardFee.highPercent} for paying in another
                currency: about {formatGBP(cardFee.lowPence)}–{formatGBP(cardFee.highPence)} on this price.
              </li>
              <li>Some cards charge nothing for this, for example {NO_FEE_CARDS.map((c) => c.provider).join(", ")}.</li>
              <li>
                A UK seller can&apos;t add a fee for paying by a personal card (
                <a href={SURCHARGE_BAN_URL} target="_blank" rel="noopener noreferrer">Payment Surcharges Regulations, reg 6A</a>).
              </li>
            </ul>
            <p className="hint">
              Not added to your true price: it depends on your card. Rates from each bank&apos;s own page, checked{" "}
              {checkedLabel(CARD_FEES_CHECKED_ON)}.
            </p>
          </>
        )}
        {transfer && (
          <>
            <h4>Getting from {transfer.airport} without a transfer</h4>
            <ul>
              {transfer.options.map((o) => (
                <li key={o.mode + o.fare}>
                  {o.mode === "bus" ? "Public bus" : "Taxi"}: {o.fare}.{" "}
                  <a href={o.sourceUrl} target="_blank" rel="noopener noreferrer">Source</a>
                </li>
              ))}
            </ul>
            <p className="hint">
              Not added to your true price: it depends on where you stay and how you travel. Official
              published fares, checked {checkedLabel(transfer.checkedOn)}.
            </p>
          </>
        )}
        {dropOff && (
          <>
            <h4>Being dropped off at {dropOff.airport}</h4>
            <ul>
              <li>Drop-off zone: {dropOff.charge}.{dropOff.payBy ? ` Pay by ${dropOff.payBy}.` : ""}</li>
              {dropOff.free && <li>Free option: {dropOff.free}.</li>}
            </ul>
            <p className="hint">
              Not added to your true price: many families park, take the train or use the free option.
              From the airport&apos;s own page, checked {checkedLabel(dropOff.checkedOn)}.{" "}
              <a href={dropOff.sourceUrl} target="_blank" rel="noopener noreferrer">Source</a>
            </p>
          </>
        )}
        <h4>Good to know</h4>
        <p className="hint">
          If this is a package (flights and stay booked together), the price can only go up after you
          book if the contract allows it, and only for fuel, taxes or exchange rates, with at least 20
          days&apos; notice before you travel. If it goes up by more than 8%, you can cancel without a fee
          and get a full refund within 14 days (Package Travel Regulations 2018). General information,
          not legal advice.
        </p>
      </div>
      <p className="hint">
        Spotted a figure that&apos;s wrong? Tell us at{" "}
        <a href={`mailto:${EMAILS.corrections}`}>{EMAILS.corrections}</a> and we&apos;ll fix it
        for everyone.
      </p>
    </>
  );
}
