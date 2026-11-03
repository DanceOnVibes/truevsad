"use client";

import { useRef, useState } from "react";
import {
  CARD_PHRASES,
  CONSULAR_HELP,
  FCDO_LONDON,
  PLAN_B_ADVICE,
  PLAN_B_NOT_CHECKED,
  type PlanB,
} from "@truevsad/true-cost";
/** A hospital line on the card, from Spain's official register or from the map. */
export interface CardHospital {
  name: string;
  address: string | null;
  km: number;
  /** From the official register; unknown for map results. */
  public?: boolean;
  /** Emergency department confirmed on the regional health service's own pages. */
  urgencias?: { open24h: boolean; children: boolean; sourceUrl: string; checkedOn: string };
}

/**
 * The Plan B card. Everything the family types stays in this browser tab: nothing is sent to us,
 * nothing is stored. The card is a plain "paper" sheet (the same on screen, in print and in the
 * offline copy), so it reads well in the dark on a dim phone.
 */

export const CARD_CSS = `
.planb-sheet{background:#fff;color:#16181d;border:2px solid #16181d;border-radius:12px;padding:20px;margin:16px 0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;line-height:1.45}
.planb-sheet h2{font-size:1.35rem;margin:0 0 2px;letter-spacing:-0.01em}
.planb-sheet .planb-sub{color:#5d6470;font-size:.85rem;margin:0 0 12px}
.planb-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;align-items:start}
.planb-box{border:1px solid #d8d8d0;border-radius:10px;padding:12px 14px;break-inside:avoid}
.planb-box h3{font-size:.8rem;text-transform:uppercase;letter-spacing:.06em;color:#5d6470;margin:0 0 6px}
.planb-box p{margin:4px 0}
.planb-box ul{margin:4px 0;padding-left:18px}
.planb-sos{border:2px solid #b42318}
.planb-sos .planb-big{font-size:2.6rem;font-weight:800;color:#b42318;line-height:1;margin:2px 0 6px}
.planb-advice{background:#f4f7f2}
.planb-es{font-style:italic;color:#0b6e4f}
.planb-blank{color:#8a909a}
.planb-small{font-size:.75rem;color:#5d6470}
.planb-hazard{border-color:#16181d;border-width:1.5px}
.planb-hazard h3{color:#16181d}
.planb-ok{font-size:.8rem;font-weight:600;color:#0b6e4f}
.planb-children{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin-top:12px}
.planb-child{border:2px dashed #16181d;border-radius:10px;padding:12px 14px;break-inside:avoid}
.planb-child strong,.planb-child .planb-es{display:block}
.planb-sources{margin-top:12px;font-size:.72rem;color:#5d6470}
.planb-sources a{color:#0b6e4f}
@media print{.planb-sheet{border:0;padding:0;margin:0;font-size:11px}.planb-hazard ul{margin:0;padding-left:16px}.planb-hazard li{margin:0;line-height:1.3}.planb-grid,.planb-children{grid-template-columns:1fr 1fr;gap:6px}.planb-box,.planb-child{padding:7px 9px}.planb-sos .planb-big{font-size:1.9rem}.planb-sheet .planb-sub{margin-bottom:6px}.planb-children{break-before:auto}}
@page{margin:10mm}
`;

interface Props {
  placeName: string;
  plan: PlanB | null;
  hospitals: CardHospital[] | null;
  /** "register" = Spain's official hospital catalogue; "map" = OpenStreetMap. */
  hospitalSource: "register" | "map";
  register: { source: string; url: string; asOf: string };
  hospitalsCheckedOn: string | null;
  /** What the distances are measured from, e.g. "Corralejo". */
  distanceFrom: string;
  initialChildren: number;
}

function dateLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\d?\./, "");
  } catch {
    return url;
  }
}

/** "Give legal advice" → "give legal advice", keeping names like "HM Passport Office". */
function lower(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

export function PlanBCard({ placeName, plan, hospitals, hospitalSource, register, hospitalsCheckedOn, distanceFrom, initialChildren }: Props) {
  const [hotel, setHotel] = useState("");
  const [address, setAddress] = useState("");
  const [meeting, setMeeting] = useState("");
  const [phone, setPhone] = useState("");
  const [passports, setPassports] = useState("");
  const [cash, setCash] = useState("");
  const [children, setChildren] = useState(initialChildren);
  const [saved, setSaved] = useState<string | null>(null);
  const sheet = useRef<HTMLDivElement>(null);

  const country = plan?.country ?? null;
  const en = CARD_PHRASES.en!;
  const local = country ? CARD_PHRASES[country.language] : undefined;
  const made = new Date().toISOString().slice(0, 10);
  const blank = (v: string, fallback: string) => (v.trim() ? v : <span className="planb-blank">{fallback}</span>);

  function saveOffline() {
    if (!sheet.current) return;
    const title = `Plan B card${placeName ? ` – ${placeName}` : ""}`;
    const html =
      `<!doctype html><html lang="en-GB"><head><meta charset="utf-8">` +
      `<meta name="viewport" content="width=device-width, initial-scale=1">` +
      `<title>${escapeHtml(title)}</title><style>body{margin:0;padding:12px;background:#fff}${CARD_CSS}</style></head>` +
      `<body>${sheet.current.outerHTML}</body></html>`;
    const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `plan-b-card${placeName ? `-${placeName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : ""}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    setSaved("Saved to your downloads. It opens with no signal: keep it on your phone.");
  }

  const sources: { name: string; url: string; checkedOn: string }[] = [];
  if (country) {
    sources.push({ name: country.emergency.sourceName, url: country.emergency.sourceUrl, checkedOn: country.emergency.checkedOn });
    sources.push({ name: country.emergencyNoSignal.sourceName, url: country.emergencyNoSignal.sourceUrl, checkedOn: country.emergencyNoSignal.checkedOn });
    sources.push({ name: country.alerts.sourceName, url: country.alerts.sourceUrl, checkedOn: country.alerts.checkedOn });
    sources.push({ name: "AEMET", url: country.warnings.sourceUrl, checkedOn: country.warnings.checkedOn });
    for (const h of country.hazards)
      for (const x of h.sources)
        if (!sources.some((s) => s.url === x.url)) sources.push({ name: `${x.name}: ${h.title.toLowerCase()}`, url: x.url, checkedOn: h.checkedOn });
  }
  if (hospitalSource === "register" && hospitals?.length)
    sources.push({ name: "Ministerio de Sanidad, hospital catalogue", url: register.url, checkedOn: "2026-11-03" });
  const scs = hospitals?.find((h) => h.urgencias)?.urgencias;
  if (scs) sources.push({ name: "Servicio Canario de la Salud", url: scs.sourceUrl, checkedOn: scs.checkedOn });
  if (plan?.consulate) sources.push({ name: "GOV.UK", url: plan.consulate.sourceUrl, checkedOn: plan.consulate.checkedOn });
  sources.push({ name: "GOV.UK (FCDO)", url: FCDO_LONDON.sourceUrl, checkedOn: FCDO_LONDON.checkedOn });

  return (
    <>
      <style>{CARD_CSS}</style>

      <div className="card no-print">
        <h2 style={{ marginTop: 0 }}>Your details</h2>
        <p className="hint">
          These go on the card only. Nothing you type here is sent to us or kept: if you close this page without saving or
          printing, it&apos;s gone.
        </p>
        <div className="row">
          <div>
            <label htmlFor="pb-hotel">Where you&apos;re staying</label>
            <input id="pb-hotel" value={hotel} onChange={(e) => setHotel(e.target.value)} placeholder="Hotel or apartment name" maxLength={120} />
          </div>
          <div>
            <label htmlFor="pb-phone">A parent&apos;s mobile</label>
            <input id="pb-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+44 7…" inputMode="tel" maxLength={40} />
          </div>
        </div>
        <label htmlFor="pb-address">Its address</label>
        <input id="pb-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, town (as on your booking)" maxLength={200} />
        <label htmlFor="pb-meet">Meeting point if you get separated and phones are dead</label>
        <input id="pb-meet" value={meeting} onChange={(e) => setMeeting(e.target.value)} placeholder="e.g. Hotel reception" maxLength={120} />
        <div className="row">
          <div>
            <label htmlFor="pb-passports">Who holds the passports</label>
            <input id="pb-passports" value={passports} onChange={(e) => setPassports(e.target.value)} placeholder="e.g. Mum" maxLength={40} />
          </div>
          <div>
            <label htmlFor="pb-cash">Who holds the cash</label>
            <input id="pb-cash" value={cash} onChange={(e) => setCash(e.target.value)} placeholder="e.g. Dad" maxLength={40} />
          </div>
          <div>
            <label htmlFor="pb-kids">Child cards</label>
            <select id="pb-kids" value={children} onChange={(e) => setChildren(Number(e.target.value))}>
              {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n === 0 ? "None" : n}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="hint">Child cards carry no names: just where you&apos;re staying, the meeting point and a parent&apos;s phone.</p>
        <button type="button" onClick={() => window.print()}>Print or save as PDF</button>{" "}
        <button type="button" className="secondary" onClick={saveOffline}>
          Save an offline copy
        </button>
        {saved && <p className="hint">{saved}</p>}
      </div>

      <div className="planb-sheet" ref={sheet}>
        <h2>Plan B{placeName ? `: ${placeName}` : ""}</h2>
        <p className="planb-sub">Made on {dateLabel(made)} with TrueVsAd. Keep it on your phone and on paper.</p>

        <div className="planb-grid">
          {country ? (
            <div className="planb-box planb-sos">
              <h3>Emergency</h3>
              <div className="planb-big">{country.emergency.number}</div>
              <p>{country.emergency.text}</p>
              <p className="planb-small">{country.emergencyNoSignal.text}</p>
            </div>
          ) : (
            <div className="planb-box planb-sos">
              <h3>Emergency</h3>
              <p>Find this country&apos;s emergency number on GOV.UK&apos;s travel advice before you fly, and write it here:</p>
              <p className="planb-big">______</p>
            </div>
          )}

          <div className="planb-box">
            <h3>Where we&apos;re staying</h3>
            <p>
              <strong>{blank(hotel, "Hotel name")}</strong>
              <br />
              {blank(address, "Address")}
            </p>
            <p>
              {en.takeMeHere}.
              {local && local !== en && (
                <>
                  <br />
                  <span className="planb-es" lang={country!.language}>
                    {local.takeMeHere}.
                  </span>
                </>
              )}
            </p>
          </div>

          <div className="planb-box">
            <h3>{hospitalSource === "register" ? "Nearest general hospitals" : "Nearest hospitals with an emergency department"}</h3>
            {hospitals && hospitals.length > 0 ? (
              <>
                <ul>
                  {hospitals.map((h) => (
                    <li key={h.name}>
                      <strong>{h.name}</strong>
                      {h.public === undefined ? "" : h.public ? " (public)" : " (private)"}
                      {h.address ? `, ${h.address}` : ""} <span className="planb-small">(about {h.km} km from {distanceFrom || "the centre"})</span>
                      {h.urgencias && (
                        <>
                          <br />
                          <span className="planb-ok">
                            ✓ Emergency department (Urgencias){h.urgencias.open24h ? ", open 24 hours" : ""}
                            {h.urgencias.children ? ", children too" : ""}
                          </span>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
                {hospitalSource === "register" ? (
                  <p className="planb-small">
                    From Spain&apos;s official hospital register (Ministry of Health catalogue, hospitals open on{" "}
                    {dateLabel(register.asOf)}).{" "}
                    {hospitals.some((h) => h.urgencias)
                      ? "✓ = emergency department confirmed on the Canary Islands health service's own pages. For the others, the register doesn't say."
                      : "The register doesn't record which have an emergency department."}{" "}
                    In an emergency, call {country?.emergency.number ?? "the emergency number"} and they&apos;ll send help to the right one.
                  </p>
                ) : (
                  <p className="planb-small">
                    From OpenStreetMap{hospitalsCheckedOn ? `, ${dateLabel(hospitalsCheckedOn)}` : ""}. Map data can be out of date:
                    check with your hotel when you arrive. © OpenStreetMap contributors.
                  </p>
                )}
              </>
            ) : (
              <p>
                {hospitals ? `None with an emergency department are mapped near here${plan?.island ? ` on ${plan.island}` : ""}.` : "We couldn't look this up just now."} Ask your hotel for the nearest
                hospital with an emergency department and write it here: ____________________
              </p>
            )}
          </div>

          <div className="planb-box">
            <h3>UK help</h3>
            {plan?.consulate ? (
              <p>
                <strong>{plan.consulate.name}</strong>
                <br />
                {plan.consulate.address}
                <br />
                <span className="planb-small">{plan.consulate.contact}</span>
              </p>
            ) : country ? (
              <p>
                British Embassy and consulates in {country.country}:{" "}
                <a href={country.ukHelpUrl}>{country.ukHelpUrl.replace(/^https:\/\/(www\.)?/, "")}</a>
              </p>
            ) : null}
            <p>
              Family back home: <strong>{FCDO_LONDON.phone}</strong>
              <br />
              <span className="planb-small">{FCDO_LONDON.text}</span>
            </p>
            <p className="planb-small">
              They can: {CONSULAR_HELP.can.map(lower).join("; ")}. They can&apos;t: {CONSULAR_HELP.cannot.map(lower).join("; ")}.
            </p>
          </div>

          {country && (
            <div className="planb-box">
              <h3>Phone alerts</h3>
              <p>{country.alerts.text}</p>
              <p className="planb-small">{country.warnings.text} (aemet.es)</p>
            </div>
          )}

          <div className="planb-box">
            <h3>Our family plan</h3>
            <p>
              Meeting point: <strong>{blank(meeting, "____________________")}</strong>
              <br />
              Parent&apos;s phone: <strong>{blank(phone, "____________________")}</strong>
              <br />
              Passports: {blank(passports, "________")} · Cash: {blank(cash, "________")}
            </p>
          </div>

          {plan?.fragile && (
            <div className="planb-box">
              <h3>Good to know: {plan.fragile.place}</h3>
              {plan.fragile.events.map((e) => (
                <p key={e.date}>
                  {dateLabel(e.date)}: {e.text} <span className="planb-small">({e.sourceName})</span>
                </p>
              ))}
            </div>
          )}

          {country?.hazards.map((h) => (
            <div className="planb-box planb-hazard" key={h.id}>
              <h3>{h.title}: what to do</h3>
              <ul>
                {h.lines.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
              <p className="planb-small">From {h.sources.map((x) => x.name).join(", ")}.</p>
            </div>
          ))}

          <div className="planb-box planb-advice">
            <h3>In a power cut (our advice)</h3>
            <ul>
              {PLAN_B_ADVICE.powerCut.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>

          <div className="planb-box planb-advice">
            <h3>Before you fly (our advice)</h3>
            <ul>
              {PLAN_B_ADVICE.beforeYouFly.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
        </div>

        {children > 0 && (
          <>
            <p className="planb-small" style={{ marginTop: 16 }}>
              ✂ Child cards: cut out and keep one in each child&apos;s pocket.
            </p>
            <div className="planb-children">
              {Array.from({ length: children }, (_, i) => (
                <div className="planb-child" key={i}>
                  <p>
                    <strong>{en.stayingAt}:</strong>
                    {local && local !== en && (
                      <span className="planb-es" lang={country!.language}>
                        {local.stayingAt}:
                      </span>
                    )}
                    {blank(hotel, "____________________")}
                    {address.trim() ? <>, {address}</> : null}
                  </p>
                  <p>
                    <strong>{en.meetingPoint}:</strong>
                    {local && local !== en && (
                      <span className="planb-es" lang={country!.language}>
                        {local.meetingPoint}:
                      </span>
                    )}
                    {blank(meeting, "____________________")}
                  </p>
                  <p>
                    <strong>{en.ifLost}:</strong>
                    {local && local !== en && (
                      <span className="planb-es" lang={country!.language}>
                        {local.ifLost}:
                      </span>
                    )}
                    {blank(phone, "____________________")}
                  </p>
                  {country && (
                    <p className="planb-small">
                      {en.speaksEnglish}
                      {local && local !== en ? ` · ${local.speaksEnglish}` : ""} · {country.emergency.number}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        <div className="planb-sources">
          <strong>Sources</strong> (official pages, checked by us):{" "}
          {sources.map((s, i) => (
            <span key={s.url + i}>
              {i > 0 ? " · " : ""}
              <a href={s.url}>{s.name}</a> ({host(s.url)}, {dateLabel(s.checkedOn)})
            </span>
          ))}
          .
          <br />
          <strong>What this card doesn&apos;t check:</strong> {PLAN_B_NOT_CHECKED.join(" ")}
        </div>
      </div>
    </>
  );
}
