import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { TICKETS_CHECKED_ON } from "@truevsad/true-cost";

export const metadata: Metadata = {
  title: "TrueVsAd Cars — what the rules say, before you pay",
  description:
    "Parking tickets and other driving costs, checked against the law and official sources. Free, and nothing you type is saved.",
  // Being tried with local drivers first; it joins search once it's been tested.
  robots: { index: false, follow: true },
};

function checked(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/**
 * Home of cars.truevsad.co.uk (rewritten to /cars in next.config.ts). Lists only tools that exist;
 * anything still being researched is named as such, with no figures until they're checked.
 */
export default async function CarsPage() {
  const host = (await headers()).get("host") ?? "";
  // On cars.truevsad.co.uk the checker lives at /tickets; on previews, at /cars/tickets.
  const ticketsHref = host.startsWith("cars.") ? "/tickets" : "/cars/tickets";

  return (
    <main>
      <h1>Cars: what the rules say, before you pay</h1>
      <p className="lead">
        The same idea as TrueVsAd for holidays: what you&apos;re told you owe, against what the rules actually say.
        Every rule links to the law or an official page. Free, and nothing you type is saved.
      </p>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Got a parking or traffic ticket from Lambeth?</h2>
        <p>
          Tick what happened and see which official grounds may apply, the evidence to gather, and every date that
          matters, including the last day for the half price.
        </p>
        <p>
          <Link href={ticketsHref}>Check your ticket →</Link>
        </p>
        <p className="hint">Lambeth Council tickets only, for now. Rules checked on {checked(TICKETS_CHECKED_ON)}.</p>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Being researched</h2>
        <p>
          Car insurance: what the regulator&apos;s rules say about renewal prices, cancelling a policy and claims. It
          will only appear here once every figure has been checked against official sources.
        </p>
      </div>

      <p className="hint">
        TrueVsAd Cars is run by the same team as <a href="https://truevsad.co.uk">TrueVsAd</a>. It&apos;s general
        information, not legal advice.
      </p>
    </main>
  );
}
