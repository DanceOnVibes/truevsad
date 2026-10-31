import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { LENSES, looksUnderMapped, scorePlace, type Light } from "@truevsad/true-cost";
import { lookupPlace, placeLinks, type PlaceLookup } from "@/lib/osm";
import { allowHeaders } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const preferredRegion = "lhr1";
export const dynamic = "force-dynamic";
export const maxDuration = 45;

export const metadata: Metadata = {
  title: "Visit before you book — TrueVsAd",
  description:
    "Is this resort right for your group? Playgrounds, beaches, nightlife and essentials nearby, scored for families, couples and groups.",
};

type Search = Promise<{ q?: string }>;

const LIGHT_LABEL: Record<Light, string> = { green: "Good fit", amber: "Mixed", red: "Poor fit" };

export default async function VisitPage({ searchParams }: { searchParams: Search }) {
  const { q: rawQ } = await searchParams;
  const q = (rawQ ?? "").trim().slice(0, 120);

  let result: PlaceLookup | null = null;
  let limited = false;
  if (q) {
    result = await lookupPlace(q, false); // cache first: free and instant
    if (!result.ok && result.reason === "unavailable") {
      if (await allowHeaders(await headers(), "visit")) result = await lookupPlace(q, true);
      else limited = true;
    }
  }

  const place = result?.ok ? result.place : null;
  const scores = place ? scorePlace(place.counts) : [];
  const links = place ? placeLinks(place.lat, place.lon) : null;

  return (
    <main>
      <h1>Visit before you book</h1>
      <p className="lead">
        Is this resort right for your group? See what&apos;s nearby — playgrounds, beaches,
        nightlife, shops and pharmacies — before you pay.
      </p>

      <form className="card" method="get">
        <label htmlFor="q">Resort, town or hotel area</label>
        <input id="q" name="q" defaultValue={q} placeholder="e.g. Salou, Spain" required minLength={2} maxLength={120} />
        <button type="submit">Check this place</button>
      </form>

      {limited && <p className="error">You&apos;ve checked a lot of places. Please try again in a little while.</p>}
      {result && !result.ok && !limited && (
        <p className="error">
          {result.reason === "not_found"
            ? "We couldn't find that place. Try adding the country, e.g. “Alcudia, Mallorca”."
            : result.reason === "invalid"
              ? "Type a place name."
              : "The map service is busy right now. Please try again in a minute."}
        </p>
      )}

      {place && links && (
        <>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>{place.displayName.split(",").slice(0, 3).join(",")}</h2>
            <p className="hint">Showing: {place.displayName}. Not the right place? Add the region or country.</p>
            <iframe
              title={`Map of ${place.displayName}`}
              src={links.embed}
              loading="lazy"
              referrerPolicy="no-referrer"
              style={{ width: "100%", height: 300, border: 0, borderRadius: 8, marginTop: 12 }}
            />
            <p className="hint">
              <a href={links.streetView} target="_blank" rel="noopener noreferrer">Street View</a> ·{" "}
              <a href={links.googleMaps} target="_blank" rel="noopener noreferrer">Google Maps</a> ·{" "}
              <a href={links.osm} target="_blank" rel="noopener noreferrer">Bigger map</a>
            </p>
          </div>

          {looksUnderMapped(place.counts) && (
            <p className="warn">
              Very little is mapped around here. That usually means the map is incomplete, not that the
              place is empty, so treat the scores below with caution.
            </p>
          )}

          {scores.map((s) => (
            <div key={s.lens} className={`card status light-${s.light}`}>
              <strong>{LENSES[s.lens]}</strong> — {LIGHT_LABEL[s.light]} ({s.score}/100)
              {s.good.length > 0 && (
                <ul>
                  {s.good.map((g) => (
                    <li key={g}>{g}</li>
                  ))}
                </ul>
              )}
              {s.watch.length > 0 && (
                <ul className="watch">
                  {s.watch.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          <p className="hint">
            Scores count places mapped on OpenStreetMap around the centre of {place.displayName.split(",")[0]}
            , checked{" "}
            {new Date(place.fetchedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}.
            They&apos;re a guide, not a promise: walk the area on Street View and read recent reviews.
          </p>
          <p className="hint">
            Map data ©{" "}
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
              OpenStreetMap contributors
            </a>
            .
          </p>
        </>
      )}

      <p>
        <Link href="/xray">X-ray a deal here →</Link>
      </p>
    </main>
  );
}
