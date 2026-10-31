# TrueVsAd

**The true price of your holiday, not the advertised one.**

TrueVsAd shows the true all-in price for a family's exact party next to the advertised headline —
bags, seats, tourist taxes, entry documents, getting to the airport, and card/FX fees.
UK-focused. Primary domain: `truevsad.co.uk`.

First feature: **Deal X-ray** — paste a deal (link, text or screenshot), confirm the details, get
the true price and an itemised Receipt.

## Ground rules (non-negotiable)

| Rule | What it means in code |
| --- | --- |
| Click-out only | We never take payment for flights or stays. No checkout, no card fields. |
| UK data stays in London | Supabase project in London (eu-west-2); Vercel functions pinned to `lhr1`. |
| No server-side scraping | The server never fetches airline/OTA pages. Links are stored as references only. |
| Commission-blind ranking | No commission or affiliate data in the engine or any table used for ranking. |
| Data minimisation | Child **ages** (not DOBs), no traveller names. The outward postcode (e.g. `SE11`) is used at pricing time only and never stored with a receipt; statistics keep only its letters (`SE`). |

## The engine

```
TrueCost = supplier lines + party extras + levies + entry docs + door-to-door + payment/FX
Gap      = TrueCost − advertised headline (whole party)
```

Every result returns: advertised → true, gap, itemised Receipt, confidence score (0–1).
All money is integer pence. The engine (`packages/true-cost`) is a pure function: no network, no database.

## Repo layout

```
apps/web               Next.js (App Router) — /xray, /fairfam, /school-window, /visit, /r/[slug], /api/xray
packages/true-cost     Shared TypeScript engine: calculateTrueCost()
supabase/migrations    Postgres + PostGIS schema with Row Level Security
```

## Run it locally

You need Node 22 and pnpm (`corepack enable` gives you pnpm).

```bash
pnpm install
cp .env.example apps/web/.env.local   # then fill in your own values
pnpm dev                              # http://localhost:3000/xray
```

Other commands:

```bash
pnpm typecheck   # TypeScript across all packages
pnpm test        # engine unit tests
```

## Database

Production project: `truevsad` (London, eu-west-2). Quotes are written only by the server
through the `save_quote()` function, which the browser cannot call. Shared receipts never show
the postcode, child ages or the deal link.

Create the Supabase project in **London**, then apply migrations with the Supabase CLI:

```bash
supabase link --project-ref <your-ref>
supabase db push
```

## Status

- [x] Mono-repo, engine, migration, Deal X-ray UI + API stub, CI
- [x] Quotes saved privately to Supabase; "Share" creates a random `/r/[slug]` link
- [x] Fee rules load from `fee_rule` (demo rules only while the table is empty)
- [x] Rate limiting (hashed visitor id, no raw IPs), privacy page, security headers, robots/sitemap
- [x] Fee rules scoped to destination + supplier; CSV template + `pnpm import-rules`
- [x] "What's included" step: package inclusions (bags, transfers, seats) are never charged twice
- [x] AI reader: Gemini on Google Cloud Agent Platform in London (text + screenshots), manual fallback, £10/month spend cap
- [x] London (europe-west2) serves `gemini-3.5-flash` (health probe 200); `gemini-2.5-flash` is not offered there (404)
- [x] "Plus taxes and fees" adverts flagged (AI + text check) and warned on the receipt, including shared ones
- [x] Place words read from the deal link's address (never opened) so the AI fills in town and country
- [x] First real, sourced fee rules (Balearics, Catalonia, Greece, ESTA, Ryanair/easyJet/typical hold bags) — checked against official/secondary sources 31 Oct 2026
- [x] Engine: per-room-per-night fees, night caps (e.g. Catalonia's 7 nights), airline-specific fee beats the generic one
- [x] Fee rules round 2 (30 rows): Balearics, Catalonia/Barcelona, Mogán, Greece, Croatia, Lisbon, Porto, Algarve, Rome, Florence, Venice, Malta; Ryanair/easyJet/TUI/Wizz/BA bags and seats; ESTA, Canada eTA, Egypt, Cape Verde. Load after merge
- [ ] Paris, Amsterdam (% of room), Turkey (% of room), Bulgaria; paid cabin bags parked (see data/fee-rules/README.md)
- [x] Travel date on the X-ray (AI reads it too); seasonal fee rates by month (summer assumed without a date, and the receipt says so)
- [x] School Window core: `school_holiday` table, `pnpm import-holidays`, /school-window (holidays, shoulder weeks, trip check)
- [x] School Window data (loaded): 10 councils for 2026-27 (Lambeth, Southwark, Wandsworth, Lewisham, Croydon, Westminster, Birmingham, Leeds, Bristol, Cardiff) and 8 of them for 2027-28
- [x] Term dates round 2 (31 Oct 2026): 16 councils, 167 holidays. Added Manchester, Liverpool, Sheffield, Bradford, Kent, Essex (2026-27 and 2027-28), Lewisham and Cardiff 2027-28, and summers where the council published the September return. GLM's pass (council's exact words quoted) agreed with Grok on all 44 shared rows; Liverpool Easter 2027 corrected (page says term "Ends" on Good Friday)
- [ ] More councils (Hampshire, Surrey, Greenwich: Grok only, awaiting a second check; Hertfordshire, Lancashire, Bromley, Barnet, Newham)
- [x] Visit Before You Book core: /visit with OpenStreetMap counts (cached 30 days in London), families / couples / groups traffic lights
- [x] Fair Share: split a deal between families on the receipt (never saved)
- [x] Watch groundwork: shared receipts re-price with today's fee rules and flag changes
- [x] FairMark: badge + exact % on every receipt (recalculated on view), opt-in public deals board with "Show only Fair Price deals", Operator Fairness Leaderboard (reference family, last 30 days, hourly), WhatsApp preview image for shared receipts
- [x] FairMark hardening: £ gap split into "taxes and fees left out" vs "extras your family needs", distance to the Fair Price line + biggest extra, reasons when unavailable, no badge without local tax data, "Local tourist taxes" can be ticked as included, median leaderboard (10+ deals, best/worst), /fairmark/method, /how-we-earn, a source link on every fee line
- [x] Anonymous price observations (one line per X-ray: seller, place, travel week, party size, prices per person; no ages, postcode, link or quote id), kept 2 years — the base for school-holiday premiums later
- [x] /fees: every fee rule in use, with source, date checked and how sure we are
- [x] "Kids go free" check: AI reads the claim; the receipt shows what each child still costs in extras
- [x] Data accuracy: every receipt lists "How we counted" and "Not checked on this receipt"; euro and US dollar adverts converted at the ECB daily rate (original price, rate and date kept and shown, also on shared receipts; no rate → no price); postcode suggests the School Window council (postcodes.io, outward code only); price statistics keep the postcode area letters and the advert currency; privacy page data table
- [x] "Hard to argue with": FairMark judges what the advert hid (taxes, resort fees, entry documents) plus one standard hold bag per booking; the family's own bag count, seats and other extras are advisory (in the true price, never in FairMark); hold bags one per two people unless the family gives a number; advert maths check and "priced for a different party" note; AI sanity checks with "please check" highlights; "plus taxes" / "kids go free" only when the advert's words are found; airline chips and travel month; checked-on date, 12-month decay and "wrong fee?" on every fee line; confidence with a next step; receipts no longer store the postcode
- [x] FairFam (phase 1): your council (from the postcode) or your school's own dates, the windows when every child is off, sellers' own sites in alphabetical order (not paid), one-tap hand-over to Deal X-ray, a private two-quote half-term check; nothing saved
- [x] Council term dates carry a "checked on" date (re-checked by hand each January); receipts explain package price-rise rights
- [x] /cabin-bags and "Will my bag fit?": 10 airlines from their own pages (data/bags CSV), verified only where two research passes agree; wheels rule (Wizz +5cm); gate fees as published; receipts show the airline's cabin bag sizes. BA and Norwegian confirmed by hand from their own pages; KLM left off (its page returns 404)
- [x] Fair seats: seats count only when the airline makes a family pay to sit together (Ryanair, easyJet and BA seat children with an adult free, per their own pages; Ryanair changed its policy on 25 Jun 2026 after the CMA opened a case); nothing for adults-only or teen-only bookings; other airlines per adult until their policies are checked
- [x] Infant (under 2) fees from airlines' own fee pages: Ryanair, easyJet, Aer Lingus £50 return; Wizz Air €70; Vueling €50 (+ taxes); Jet2 free (no line); TUI and BA not published
- [x] Tax fixes from official pages (31 Oct 2026): Venice by area (city and islands EUR 4.50, Lido 3.60, Mestre 3.10; Feb–Dec; under-10s exempt; 5 nights; January not yet), Paris (EUR 8.45 per adult per night, 4-star, all surcharges), Egypt visa USD 30; Mogán switched off (reported annulled by the Canary Islands high court, July 2026; no official page either way). Tunisia waits for an official TND exchange rate
- [ ] Watch alerts (needs accounts + email), search across deals (needs a click-out inventory, never scraping)
- [x] All migrations applied to production, up to 1900 (1100 and 1600 run by hand) (nightly purge job scheduled at 03:17 UTC)
- [x] Deployed on Vercel (London) and tested end to end: X-ray → save → share
- [x] Privacy page and footer: company number, ICO registration, registered office, contact emails, security.txt
- [ ] Duffel integration for live flight prices


---

DanceOnVibes Limited · London
