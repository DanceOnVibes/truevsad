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
| Data minimisation | Child **ages** (not DOBs), **outward** postcode only (e.g. `SE11`), no traveller names. |

## The engine

```
TrueCost = supplier lines + party extras + levies + entry docs + door-to-door + payment/FX
Gap      = TrueCost − advertised headline (whole party)
```

Every result returns: advertised → true, gap, itemised Receipt, confidence score (0–1).
All money is integer pence. The engine (`packages/true-cost`) is a pure function: no network, no database.

## Repo layout

```
apps/web               Next.js (App Router) — site + /api/xray
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
- [ ] LLM extraction (replace stub in `apps/web/app/api/xray/route.ts`)
- [ ] Real, sourced fee rules in `data/fee-rules/fee-rules.csv` (see its README)
- [x] All migrations applied to production (nightly purge job scheduled at 03:17 UTC)
- [x] Deployed on Vercel (London) and tested end to end: X-ray → save → share
- [ ] Privacy page: add company number, registered office, contact email
- [ ] Duffel integration for live flight prices

> The X-ray currently uses **demo** fee rules. They are placeholders, not real prices, and the UI says so.

---

DanceOnVibes Limited · London
