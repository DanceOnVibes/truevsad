import { Fragment } from "react";
import Image from "next/image";
import Link from "next/link";
import { AIRLINE_BAGS, FAIRMARK_SCALE, type FairMarkLevel } from "@truevsad/true-cost";
import { loadListedDeals, type ListedDeal } from "@/lib/quotes";
import { HolidayScene } from "@/components/HolidayScene";
import { DealScannerForm } from "@/components/DealScannerForm";
import { VerdictStamp, verdictFor } from "@/components/VerdictStamp";
import { exampleReceipts, gbp } from "@/lib/examples";
import { loadAuthorities } from "@/lib/school";

// The public-receipts strip shows real receipts families chose to list, so refresh it now and then.
export const revalidate = 300;

/** The homepage verdict for each FairMark level. A verdict on the price, never on the place. */
const VERDICT: Record<Exclude<FairMarkLevel, "unavailable">, { word: string; tone: "go" | "check" | "stop" }> = {
  gold: { word: "SAFE TO GO", tone: "go" },
  fair: { word: "SAFE TO GO", tone: "go" },
  higher: { word: "CHECK", tone: "check" },
  high: { word: "STOP", tone: "stop" },
};

/** Real listed receipts for the strip. Never examples, never made up: no receipts, no strip. */
async function publicReceipts(): Promise<ListedDeal[]> {
  try {
    const deals = await loadListedDeals(false);
    return deals.filter((d) => d.fairMark.level !== "unavailable").slice(0, 12);
  } catch {
    return [];
  }
}

function Zigzag({ flip = false }: { flip?: boolean }) {
  return <span aria-hidden="true" className={`zigzag${flip ? " zigzag-flip" : ""}`} />;
}

export default async function Home() {
  // Priced by the engine with today's rules (never typed by hand); hidden if the rules can't load.
  const [deals, ex, councils] = await Promise.all([
    publicReceipts(),
    exampleReceipts().catch(() => null),
    loadAuthorities()
      .then((a) => a.length)
      .catch(() => 0),
  ]);
  const strip = deals.length >= 3 ? deals : [];

  return (
    <main className="home-page">
      <div className="home">
        <section className="hero">
          <div className="hero-copy">
            <p className="kicker">Before you pay, X-ray it.</p>
            <h1 className="hero-title">
              <span className="t-stop">Stop.</span>
              <br />
              Or safe
              <br />
              <span className="t-go">to go.</span>
            </h1>
            <p className="lead hero-lead">
              The advertised price is never the price your family pays. Paste any holiday deal and see the true cost for
              your exact party: bags, seats, tourist taxes and travel documents, each with its source. Every receipt says
              exactly what it hasn&apos;t checked yet. A verdict on the price, never on the place.
            </p>
            <DealScannerForm>
              <label htmlFor="home-deal" className="visually-hidden">
                Deal link or text
              </label>
              <span className="scanner-prompt" aria-hidden="true">
                ›
              </span>
              <input id="home-deal" name="deal" placeholder="paste a deal link or text" autoComplete="off" />
              <span className="scanner-caret" aria-hidden="true" />
              <button type="submit">X-ray it</button>
            </DealScannerForm>
            <p className="hero-promises">
              <span>No account</span>
              <span aria-hidden="true">·</span>
              <span>No names kept</span>
              <span aria-hidden="true">·</span>
              <span>We never take payment</span>
            </p>
          </div>

          <div className="hero-visual">
            <div className="hero-photo">
              {/* Adalbert's own photo. Decorative, so it has no alt text. */}
              <Image src="/images/hero-beach.jpg" alt="" fill priority sizes="(max-width: 900px) 100vw, 560px" />
            </div>
            {ex && (
              <div className="paper hero-receipt">
                <Zigzag />
                <div className="paper-body">
                  <span className="scanline" aria-hidden="true" />
                  <div className="paper-head">
                    <span>TRUEVSAD · RECEIPT</span>
                    <span>EXAMPLE</span>
                  </div>
                  <p className="paper-title">{ex.stop.title}</p>
                  <dl className="paper-lines">
                    <dt>Advertised</dt>
                    <dd>{gbp(ex.stop.advertisedPence)}</dd>
                    {ex.stop.lines.map((l) => (
                      <Fragment key={l.label}>
                        <dt>{l.label}</dt>
                        <dd>+{gbp(l.pence)}</dd>
                      </Fragment>
                    ))}
                  </dl>
                  <p className="paper-total">
                    <span>TRUE PRICE</span>
                    <span>{gbp(ex.stop.truePence)}</span>
                  </p>
                  {ex.stop.fm.gapPence !== null && (
                    <p className={`paper-gap t-${verdictFor(ex.stop.fm)?.tone ?? "check"}`}>
                      <span>Left out</span>
                      <span>
                        +{gbp(ex.stop.fm.gapPence)} · {ex.stop.fm.display.replace(/^\+/, "")}
                      </span>
                    </p>
                  )}
                  <p className="paper-small">NOT CHECKED: UK AIRPORT TRAVEL, SPENDING MONEY, INSURANCE</p>
                  <span className="barcode" aria-hidden="true" />
                  <VerdictStamp fm={ex.stop.fm} className="hero-stamp" />
                </div>
                <Zigzag flip />
              </div>
            )}
          </div>
        </section>
      </div>

      {strip.length > 0 && (
        <div className="ticker" aria-label="Receipts families chose to make public">
          <span className="ticker-label">PUBLIC RECEIPTS</span>
          <div className="ticker-track">
            <div className="ticker-run">
              {[...strip, ...strip].map((d, i) => {
                const v = VERDICT[d.fairMark.level as Exclude<FairMarkLevel, "unavailable">];
                return (
                  <Link key={`${d.slug}-${i}`} href={`/r/${d.slug}`} aria-hidden={i >= strip.length ? true : undefined} tabIndex={i >= strip.length ? -1 : undefined}>
                    <span className={`dot dot-${v.tone}`} aria-hidden="true" /> {v.word} {d.fairMark.display}
                    {d.destination ? ` · ${d.destination.split(",")[0]}` : ""} · {d.nights} nights
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="home">
        <HolidayScene variant="band" photo="sunset" label="TRUEVSAD · THE HOLIDAY" />

        <section className="answers">
          <div className="section-head">
            <h2>Three answers. Never a guess.</h2>
            <p>Every receipt ends in one verdict on the price, and says what it couldn&apos;t check.</p>
          </div>
          <div className="answers-grid">
            {ex &&
              ([
                ["safe", "tilt-left", "Bags and transfers already in the price."],
                ["check", "tilt-right", "Ask the seller what\u2019s in the price before you book."],
              ] as const).map(([key, tilt, note]) => {
                const e = ex[key];
                return (
                  <div className={`paper ${tilt}`} key={key}>
                    <Zigzag />
                    <div className="paper-body paper-small-body">
                      <span className="paper-head">EXAMPLE · {e.title.toUpperCase()}</span>
                      <span>Advertised {gbp(e.advertisedPence)}</span>
                      {e.lines.map((l) => (
                        <span key={l.label}>
                          {l.label} +{gbp(l.pence)}
                        </span>
                      ))}
                      <span className="paper-total">TRUE {gbp(e.truePence)}</span>
                      {e.fm.gapPence !== null && (
                        <span className="paper-left">
                          Left out {gbp(e.fm.gapPence)} · {e.fm.display.replace(/^\+/, "")}
                        </span>
                      )}
                      <span className="paper-small">{note}</span>
                      <VerdictStamp fm={e.fm} />
                    </div>
                    <Zigzag flip />
                  </div>
                );
              })}

            <div className="ink-card">
              <span className="ink-label">HOW WE DECIDE</span>
              <p className="rule">
                <span className="t-go mono">✓ SAFE TO GO</span>
                <span>The advert left out {FAIRMARK_SCALE.fair}% or less (FairMark Gold:{" "}
                {FAIRMARK_SCALE.gold}% or less).</span>
              </p>
              <p className="rule">
                <span className="t-check mono">! CHECK</span>
                <span>It left out {FAIRMARK_SCALE.fair}–{FAIRMARK_SCALE.higher}%. Ask the seller
                why.</span>
              </p>
              <p className="rule">
                <span className="t-stop mono">✕ STOP</span>
                <span>It left out more than {FAIRMARK_SCALE.higher}%.</span>
              </p>
              <p className="ink-small">
                Not enough to judge? The receipt says so. Commission never changes a verdict.{" "}
                <Link href="/fairmark/method">How FairMark works →</Link>
              </p>
            </div>
          </div>
        </section>

        <section className="tools" aria-label="Tools">
          <Link href="/xray" className="tool">
            <span className="tool-n">01</span>
            <span className="tool-name">Deal X-ray</span>
            <span>Paste a holiday deal and see what it really costs.</span>
          </Link>
          <Link href="/fairfam" className="tool">
            <span className="tool-n">02</span>
            <span className="tool-name">FairFam</span>
            <span>
              Your school dates, your family, one honest price. Find the weeks every child is off, then check any deal&apos;s
              true price for your party.
            </span>
          </Link>
          <Link href="/plan-b" className="tool tool-ink">
            <span className="tool-n">03</span>
            <span className="tool-name">Plan B</span>
            <span>
              One page for wildfires, floods, storms, earthquakes and power cuts: what to do, the emergency numbers, the nearest
              hospitals, UK help and your family&apos;s meeting point. Save or print it and it works with no signal. Only the
              place name leaves your phone.
            </span>
          </Link>
          <Link href="/fairmark" className="tool">
            <span className="tool-n">04</span>
            <span className="tool-name">FairMark</span>
            <span>
              Which holiday prices are honest? See the fairest sellers this month, and deals whose adverts left out{" "}
              {FAIRMARK_SCALE.fair}% or less.
            </span>
          </Link>
          <Link href="/cabin-bags" className="tool">
            <span className="tool-n">05</span>
            <span className="tool-name">Will my bag fit?</span>
            <span>
              Every airline has its own cabin bag sizes. Measure yours and see where it flies free on {AIRLINE_BAGS.length} airlines
              that fly most UK families, from each airline&apos;s own rules.
            </span>
          </Link>
          <Link href="/school-window" className="tool">
            <span className="tool-n">06</span>
            <span className="tool-name">School Window</span>
            <span>
              {councils > 0 ? `School holidays for ${councils} councils so far, ` : "Council school holidays, "}the quieter weeks
              either side, and what a trip would miss.
            </span>
          </Link>
          <Link href="/visit" className="tool">
            <span className="tool-n">07</span>
            <span className="tool-name">Visit before you book</span>
            <span>Is the resort right for your group? Playgrounds, beaches, nightlife and essentials nearby.</span>
          </Link>
        </section>

        <p className="hint home-note">
          We never take payment and our ranking ignores commission. You always book directly with the supplier.
        </p>
      </div>
    </main>
  );
}
