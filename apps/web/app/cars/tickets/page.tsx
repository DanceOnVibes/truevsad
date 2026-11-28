import type { Metadata } from "next";
import { LAMBETH_CHARGES, TICKET_SOURCES, TICKETS_CHECKED_ON } from "@truevsad/true-cost";
import { TicketChecker } from "./TicketChecker";
import { EMAILS } from "@/lib/company";

export const metadata: Metadata = {
  title: "Got a Lambeth parking or traffic ticket? Check it before you pay — TrueVsAd",
  description:
    "Free: tick what happened and see which official grounds may apply to your Lambeth PCN, the evidence to gather, and every date that matters, from the law and Lambeth's own pages. Nothing you tick is saved.",
  // A first test with local families; it joins the sitemap once it's been tried.
  robots: { index: false, follow: true },
};

function checked(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/**
 * Lambeth only for now. Every rule lives in packages/true-cost/src/tickets.ts with its source;
 * this page adds no facts of its own.
 */
export default function TicketsPage() {
  return (
    <main>
      <h1>Got a Lambeth ticket? Check it before you pay</h1>
      <p className="lead">
        Lots of parking and traffic tickets are cancelled when people challenge them, but only if they know the
        rules. Tick what happened, and see which official grounds may apply, the evidence to gather and every date
        that matters.
      </p>
      <p className="warn">
        For tickets from Lambeth Council only, for now. This is general information from the law and Lambeth&apos;s
        own pages, not legal advice. Checked on {checked(TICKETS_CHECKED_ON)}.
      </p>

      <TicketChecker />

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Ticket from a private car park?</h2>
        <p>
          Supermarket, hospital and retail park tickets come from private companies, not the council. They&apos;re
          &ldquo;parking charges&rdquo;, not penalty charge notices, and the rules and appeal routes above don&apos;t
          apply to them. The government plans a new Private Parking Code of Practice for these companies, and
          we&apos;ll cover it once it&apos;s in force.
        </p>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Lambeth&apos;s charges</h2>
        <table className="receipt">
          <tbody>
            {LAMBETH_CHARGES.map((c) => (
              <tr key={c.what}>
                <td>{c.what}</td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  £{c.full}
                  <div className="working">£{c.half} if paid in time</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="hint">
          From 7 April 2025.{" "}
          <a href={TICKET_SOURCES.lambethCharges.url} target="_blank" rel="noopener noreferrer">
            Lambeth&apos;s charges page
          </a>
        </p>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Before you challenge</h2>
        <ul>
          <li>Take photos of the signs and lines as soon as you can. They can change.</li>
          <li>For a camera ticket, ask to see the council&apos;s photos or video before you decide.</li>
          <li>Keep it short and true: what happened, which ground, and the proof. Never add anything that isn&apos;t so.</li>
          <li>Don&apos;t pay if you want to challenge: paying closes the case.</li>
        </ul>
        <p>
          <a href={TICKET_SOURCES.lambethInformal.url} target="_blank" rel="noopener noreferrer">
            Lambeth: informal challenge
          </a>{" "}
          ·{" "}
          <a href={TICKET_SOURCES.lambethFormal.url} target="_blank" rel="noopener noreferrer">
            Lambeth: formal challenge
          </a>{" "}
          ·{" "}
          <a href={TICKET_SOURCES.tribunal.url} target="_blank" rel="noopener noreferrer">
            London Tribunals
          </a>
        </p>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Where every rule comes from</h2>
        <ul>
          {Object.values(TICKET_SOURCES).map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noopener noreferrer">
                {s.label}
              </a>
            </li>
          ))}
        </ul>
        <p className="hint">
          Bus lane tickets follow a similar process, but their grounds aren&apos;t covered here yet: check the back of
          your notice. Seen something wrong? Tell us at <a href={`mailto:${EMAILS.corrections}`}>{EMAILS.corrections}</a>.
        </p>
      </div>
    </main>
  );
}
