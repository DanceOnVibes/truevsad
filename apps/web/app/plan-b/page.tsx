import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { planBFor } from "@truevsad/true-cost";
import { lookupPlace, nearbyHospitals, type HospitalLookup, type PlaceLookup } from "@/lib/osm";
import { allowHeaders } from "@/lib/rate-limit";
import { PlanBCard } from "./PlanBCard";

export const runtime = "nodejs";
export const preferredRegion = "lhr1";
export const dynamic = "force-dynamic";
export const maxDuration = 45;

export const metadata: Metadata = {
  title: "Plan B — TrueVsAd",
  description:
    "One page for your trip that works with no signal: 112, the nearest hospitals, UK help and your family's meeting point. Nothing you type leaves your phone.",
};

type Search = Promise<{ q?: string; children?: string }>;

export default async function PlanBPage({ searchParams }: { searchParams: Search }) {
  const { q: rawQ, children: rawChildren } = await searchParams;
  const q = (rawQ ?? "").trim().slice(0, 120);
  const childCount = Math.min(6, Math.max(0, Number.parseInt(rawChildren ?? "", 10) || 0));

  let place: PlaceLookup | null = null;
  let hospitals: HospitalLookup | null = null;
  let limited = false;
  /** Set when the town wasn't found and we looked up the whole island instead. */
  let usedIsland: string | null = null;
  if (q) {
    // Same free OpenStreetMap services and the same per-visitor budget as Visit before you book.
    place = await lookupPlace(q, false);
    if (!place.ok && place.reason === "unavailable") {
      if (await allowHeaders(await headers(), "visit")) place = await lookupPlace(q, true);
      else limited = true;
    }
    // The town wasn't found (a typo, or a tiny place), but we know the island: look up the island
    // instead, so the family still gets the nearest hospitals.
    const island = planBFor(q)?.island;
    if (!place.ok && place.reason === "not_found" && island && !limited) {
      const islandQuery = `${island}, Spain`;
      const fromCache = await lookupPlace(islandQuery, false);
      if (fromCache.ok) place = fromCache;
      else if (await allowHeaders(await headers(), "visit")) place = await lookupPlace(islandQuery, true);
      if (place.ok) usedIsland = island;
    }
    if (place.ok) {
      hospitals = await nearbyHospitals(place.place, false);
      if (!hospitals.ok && !limited && (await allowHeaders(await headers(), "visit"))) {
        hospitals = await nearbyHospitals(place.place, true);
      }
    }
  }

  const found = place?.ok ? place.place : null;
  const plan = q ? planBFor(q) ?? (found ? planBFor(found.displayName) : undefined) : undefined;
  const placeName = plan?.island ?? q.split(",")[0]?.trim() ?? "";

  return (
    <main>
      <div className="no-print">
        <h1>Plan B</h1>
        <p className="lead">
          One page for your trip that still works when the power is out, the signal has gone and the card machine is
          dead. Make it before you fly, save it to your phone and print a copy.
        </p>

        <form className="card" method="get">
          <label htmlFor="q">Where are you going?</label>
          <input id="q" name="q" defaultValue={q} placeholder="e.g. Costa Adeje, Tenerife" required minLength={2} maxLength={120} />
          {childCount > 0 && <input type="hidden" name="children" value={childCount} />}
          <button type="submit">Make my Plan B card</button>
          <p className="hint">
            We only look up the place name, to find the nearest hospitals on the map. Everything else you type on this page
            stays on your phone.
          </p>
        </form>

        {limited && <p className="error">You&apos;ve looked up a lot of places. Please try again in a little while.</p>}
        {usedIsland && (
          <p className="hint">
            We couldn&apos;t find &ldquo;{q}&rdquo; on the map, so the hospitals below are the nearest to the centre of {usedIsland}.
            Check the spelling to get the closest ones to your hotel.
          </p>
        )}
        {q && place && !place.ok && !limited && place.reason === "not_found" && (
          <p className="error">We couldn&apos;t find that place on the map. Try adding the island or country, e.g. &ldquo;Corralejo, Fuerteventura&rdquo;.</p>
        )}
        {q && !plan && (
          <p className="warn">
            Plan B covers Spain, including the Canary and Balearic Islands, for now: we only show facts we&apos;ve checked on
            official pages, one country at a time. You can still make a card with your own details below, and{" "}
            <a href="https://www.gov.uk/foreign-travel-advice" target="_blank" rel="noopener noreferrer">
              GOV.UK&apos;s travel advice
            </a>{" "}
            has the emergency numbers for every country.
          </p>
        )}
      </div>

      {q && (
        <PlanBCard
          placeName={placeName}
          plan={plan ?? null}
          hospitals={hospitals?.ok ? hospitals.hospitals : null}
          hospitalsCheckedOn={hospitals?.ok ? hospitals.fetchedAt.slice(0, 10) : null}
          initialChildren={childCount}
        />
      )}

      <p className="no-print">
        <Link href="/xray">X-ray a deal →</Link> · <Link href="/fairfam">FairFam →</Link>
      </p>
    </main>
  );
}
