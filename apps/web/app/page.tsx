import Image from "next/image";
import Link from "next/link";
import { FAIRMARK_SCALE, type FairMarkLevel } from "@truevsad/true-cost";
import { loadListedDeals, type ListedDeal } from "@/lib/quotes";

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
  const deals = await publicReceipts();
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
            <form className="scanner" action="/xray" method="get">
              <label htmlFor="home-deal" className="visually-hidden">
                Deal link or text
              </label>
              <span className="scanner-prompt" aria-hidden="true">
                ›
              </span>
              <input id="home-deal" name="deal" placeholder="paste a deal link or text" autoComplete="off" />
              <span className="scanner-caret" aria-hidden="true" />
              <button type="submit">X-ray it</button>
            </form>
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
            <div className="paper hero-receipt">
              <Zigzag />
              <div className="paper-body">
                <span className="scanline" aria-hidden="true" />
                <div className="paper-head">
                  <span>TRUEVSAD · RECEIPT</span>
                  <span>EXAMPLE</span>
                </div>
                <p className="paper-title">Tenerife · 7 nights · 2 adults, 2 children</p>
                <dl className="paper-lines">
                  <dt>Advertised</dt>
                  <dd>£1,596</dd>
                  <dt>Hold bags</dt>
                  <dd>+£180</dd>
                  <dt>Seats together</dt>
                  <dd>+£96</dd>
                  <dt>Transfers</dt>
                  <dd>+£64</dd>
                  <dt>Card fee</dt>
                  <dd>+£46</dd>
                </dl>
                <p className="paper-total">
                  <span>TRUE PRICE</span>
                  <span>£1,982</span>
                </p>
                <p className="paper-gap t-stop">
                  <span>Left out</span>
                  <span>+£386 · 24%</span>
                </p>
                <p className="paper-small">NOT CHECKED: UK AIRPORT TRAVEL, SPENDING MONEY, INSURANCE</p>
                <span className="barcode" aria-hidden="true" />
                <span className="stamp stamp-stop hero-stamp" role="img" aria-label="Verdict: stop, high gap. Ask the seller.">
                  <strong>STOP</strong>
                  <small>HIGH GAP</small>
                </span>
              </div>
              <Zigzag flip />
            </div>
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
        <section className="answers">
          <div className="section-head">
            <h2>Three answers. Never a guess.</h2>
            <p>Every receipt ends in one verdict on the price, and says what it couldn&apos;t check.</p>
          </div>
          <div className="answers-grid">
            <div className="paper tilt-left">
              <Zigzag />
              <div className="paper-body paper-small-body">
                <span className="paper-head">EXAMPLE · LANZAROTE · 7 NIGHTS</span>
                <span>Advertised £2,140</span>
                <span>Tourist tax +£70</span>
                <span className="paper-total">TRUE £2,210 · +3%</span>
                <span className="paper-small">Bags, seats and transfers already in the price.</span>
                <span className="stamp stamp-go" role="img" aria-label="Verdict: safe to go, FairMark Gold">
                  <strong>
                    SAFE
                    <br />
                    TO GO
                  </strong>
                  <small>FAIRMARK GOLD</small>
                </span>
              </div>
              <Zigzag flip />
            </div>

            <div className="paper tilt-right">
              <Zigzag />
              <div className="paper-body paper-small-body">
                <span className="paper-head">EXAMPLE · MALLORCA · 10 NIGHTS</span>
                <span>Advertised £1,288</span>
                <span>Tourist tax and bags +£224</span>
                <span className="paper-total">TRUE £1,512 · +17%</span>
                <span className="paper-small">Ask the seller what&apos;s in the price before you book.</span>
                <span className="stamp stamp-check" role="img" aria-label="Verdict: check, higher gap">
                  <strong>CHECK</strong>
                  <small>HIGHER GAP</small>
                </span>
              </div>
              <Zigzag flip />
            </div>

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
              One page for your trip that works when the power and signal don&apos;t: 112, the nearest hospitals, UK help and
              your family&apos;s meeting point. Nothing you type leaves your phone.
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
            <span>Every airline has its own cabin bag sizes. Measure yours and see where it flies free, from each airline&apos;s own rules.</span>
          </Link>
          <Link href="/school-window" className="tool">
            <span className="tool-n">06</span>
            <span className="tool-name">School Window</span>
            <span>See your council&apos;s school holidays, the quieter weeks either side, and what a trip would miss.</span>
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
