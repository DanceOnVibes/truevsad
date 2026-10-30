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

Create the Supabase project in **London**, then apply migrations with the Supabase CLI:

```bash
supabase link --project-ref <your-ref>
supabase db push
```

## Status

- [x] Mono-repo, engine, migration, Deal X-ray UI + API stub, CI
- [ ] LLM extraction (replace stub in `apps/web/app/api/xray/route.ts`)
- [ ] Real, sourced `fee_rule` data (replace `apps/web/lib/demo-rules.ts`)
- [ ] Save quotes to Supabase + shareable Receipt links
- [ ] Duffel integration for live flight prices

> The X-ray currently uses **demo** fee rules. They are placeholders, not real prices, and the UI says so.

---

DanceOnVibes Limited · London
