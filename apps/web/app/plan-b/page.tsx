import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { islandAt, planBFor } from "@truevsad/true-cost";
import { hospitalsFor, type HospitalLookup } from "@/lib/osm";
import { HOSPITALS_ES, nearestOfficialHospitals } from "@/lib/hospitals-es";
import { allowHeaders } from "@/lib/rate-limit";
import { PlanBCard } from "./PlanBCard";
import { HolidayScene } from "@/components/HolidayScene";

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

  let lookup: HospitalLookup | null = null;
  let limited = false;
  /** Set when the town wasn't found and we looked up the whole island instead. */
  let usedIsland: string | null = null;
  if (q) {
    // Same free OpenStreetMap services and the same per-visitor budget as Visit before you book.
    const h = await headers();
    lookup = await hospitalsFor(q, false);
    if (!lookup.ok && lookup.reason === "unavailable") {
      if (await allowHeaders(h, "visit")) lookup = await hospitalsFor(q, true);
      else limited = true;
    }
    // The town wasn't found (a typo, or a tiny place), but we know the island: look up the island
    // instead, so the family still gets the nearest hospitals.
    const island = planBFor(q)?.island;
    if (!lookup.ok && lookup.reason === "not_found" && island && !limited) {
      const islandQuery = `${island}, Spain`;
      let byIsland = await hospitalsFor(islandQuery, false);
      if (!byIsland.ok && byIsland.reason === "unavailable" && (await allowHeaders(h, "visit"))) {
        byIsland = await hospitalsFor(islandQuery, true);
      }
      if (byIsland.ok) {
        lookup = byIsland;
        usedIsland = island;
      }
    }
  }

  const found = lookup?.ok ? lookup.place : null;
  const plan = q ? planBFor(q) ?? (found ? planBFor(found.displayName) : undefined) : undefined;
  const placeName = plan?.island ?? q.split(",")[0]?.trim() ?? "";
  // On an island, only hospitals on the same island: a 40 km circle can reach across the sea
  // (Corralejo, Fuerteventura is 40 km from Lanzarote), and a family can't drive there.
  const onIsland = found ? islandAt(found.lat, found.lon)?.name : undefined;
  // First choice: Spain's official hospital register (no map servers involved). The map's own
  // hospitals only when the register has nothing nearby, or outside Spain.
  const official = found && plan?.country.country === "Spain" ? nearestOfficialHospitals(found.lat, found.lon) : [];
  const mapHospitals =
    lookup?.ok && lookup.hospitals
      ? lookup.hospitals.filter((h) => !onIsland || islandAt(h.lat, h.lon)?.name === onIsland).slice(0, 3)
      : null;
  const hospitals = official.length
    ? official.map((h) => ({
        name: h.name,
        address: `${h.address}, ${h.postcode} ${h.town}`,
        km: h.km,
        public: h.public,
        urgencias: h.urgencias,
      }))
    : mapHospitals;
  const hospitalSource = official.length ? ("register" as const) : ("map" as const);
  const distanceFrom = usedIsland ? `the centre of ${usedIsland}` : q.split(",")[0]?.trim() || placeName;

  return (
    <main>
      <div className="no-print">
        <HolidayScene photo="night" label="TRUEVSAD · 03 PLAN B" />
        <h1>Plan B</h1>
        <p className="lead">
          One page for your trip that still works when the power is out, the signal has gone and the card machine is
          dead. Make it before you fly, save it to your phone and print a copy.
        </p>

        <form className="card form-ink" method="get">
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
        {q && lookup && !lookup.ok && !limited && lookup.reason === "not_found" && (
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
          hospitals={hospitals}
          hospitalSource={hospitalSource}
          register={{ source: HOSPITALS_ES.source, url: HOSPITALS_ES.sourceUrl, asOf: HOSPITALS_ES.asOf }}
          hospitalsCheckedOn={official.length ? null : lookup?.ok && lookup.hospitals ? lookup.fetchedAt.slice(0, 10) : null}
          distanceFrom={distanceFrom}
          initialChildren={childCount}
        />
      )}

      <p className="no-print">
        <Link href="/xray">X-ray a deal →</Link> · <Link href="/fairfam">FairFam →</Link>
      </p>
    </main>
  );
}
