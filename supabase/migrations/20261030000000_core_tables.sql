-- TrueVsAd — core tables
-- Project must be created in the London region (eu-west-2).
--
-- Principles enforced here:
--   * Data minimisation: child ages only (no DOBs), outward postcode only, no traveller names.
--   * Money is integer pence (bigint), never floats.
--   * Commission-blind: no commission / affiliate columns live on any table used for ranking.
--   * RLS on every table. Anonymous X-ray quotes are written by the server with the
--     service role (which bypasses RLS) and only exposed publicly when is_public = true.

create extension if not exists postgis with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.cost_category as enum (
  'supplier', 'party_extra', 'levy', 'entry_doc', 'door_to_door', 'payment_fx'
);

create type public.line_source as enum ('extracted', 'user', 'rule', 'estimate');

create type public.headline_basis as enum ('per_person', 'total');

create type public.rule_unit as enum (
  'per_party', 'per_person', 'per_adult', 'per_child',
  'per_person_per_night', 'per_adult_per_night'
);

create type public.offer_source_kind as enum ('link', 'text', 'screenshot');

-- ---------------------------------------------------------------------------
-- party — who is travelling
-- ---------------------------------------------------------------------------

create table public.party (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid references auth.users (id) on delete cascade,
  adults            smallint not null check (adults between 1 and 9),
  child_ages        smallint[] not null default '{}'
                    check (cardinality(child_ages) <= 9
                           and 0 <= all (child_ages)
                           and 17 >= all (child_ages)),
  outward_postcode  text check (outward_postcode ~ '^[A-Z]{1,2}[0-9][A-Z0-9]?$'),
  -- Approximate home area (centroid of the outward code), for door-to-door costs.
  home_area         extensions.geography(point, 4326),
  created_at        timestamptz not null default now()
);

comment on table public.party is
  'Travelling party. Minimised: ages not DOBs, outward postcode only, no names.';

-- ---------------------------------------------------------------------------
-- offer — what the advert said, confirmed by the user
-- ---------------------------------------------------------------------------

create table public.offer (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid references auth.users (id) on delete cascade,
  source_kind        public.offer_source_kind not null,
  source_url         text check (char_length(source_url) <= 2000),
  supplier_name      text check (char_length(supplier_name) <= 120),
  destination        text check (char_length(destination) <= 120),
  destination_point  extensions.geography(point, 4326),
  departure_airport  text check (departure_airport ~ '^[A-Z]{3}$'),
  nights             smallint not null check (nights between 0 and 60),
  headline_pence     bigint not null check (headline_pence >= 0),
  headline_basis     public.headline_basis not null,
  currency           char(3) not null default 'GBP',
  -- Raw LLM extraction, kept for audit. Must never contain personal data.
  raw_extract        jsonb,
  confirmed_at       timestamptz,
  created_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- fee_rule — the reference data that turns a party into extra costs
-- ---------------------------------------------------------------------------

create table public.fee_rule (
  id               uuid primary key default gen_random_uuid(),
  category         public.cost_category not null,
  label            text not null check (char_length(label) <= 160),
  unit             public.rule_unit not null,
  -- Exactly one of amount_pence / amount_bp is set.
  amount_pence     bigint check (amount_pence >= 0),
  amount_bp        integer check (amount_bp between 0 and 10000),
  min_age          smallint check (min_age between 0 and 120),
  max_age          smallint check (max_age between 0 and 120),
  -- Scope: null = applies everywhere.
  supplier_name    text,
  destination_area extensions.geography(multipolygon, 4326),
  confidence       numeric(3,2) not null check (confidence between 0 and 1),
  source_note      text,       -- where the figure came from
  source_url       text,
  valid_from       date not null default current_date,
  valid_to         date,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  constraint fee_rule_one_amount check ((amount_pence is null) <> (amount_bp is null)),
  constraint fee_rule_age_band check (min_age is null or max_age is null or min_age <= max_age),
  constraint fee_rule_dates check (valid_to is null or valid_to >= valid_from)
);

create index fee_rule_destination_area_idx on public.fee_rule using gist (destination_area);
create index fee_rule_active_idx on public.fee_rule (category) where is_active;

-- ---------------------------------------------------------------------------
-- true_cost_quote — the result of running the engine
-- ---------------------------------------------------------------------------

create table public.true_cost_quote (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid references auth.users (id) on delete cascade,
  party_id         uuid not null references public.party (id) on delete cascade,
  offer_id         uuid not null references public.offer (id) on delete cascade,
  advertised_pence bigint not null,
  true_cost_pence  bigint not null,
  gap_pence        bigint generated always as (true_cost_pence - advertised_pence) stored,
  confidence       numeric(3,2) not null check (confidence between 0 and 1),
  used_demo_rules  boolean not null default false,
  engine_version   text not null,
  -- Shareable Receipt
  share_slug       text unique check (share_slug ~ '^[a-z0-9]{8,32}$'),
  is_public        boolean not null default false,
  created_at       timestamptz not null default now()
);

create index true_cost_quote_owner_idx on public.true_cost_quote (owner_id);

-- ---------------------------------------------------------------------------
-- cost_line — itemised Receipt lines
-- ---------------------------------------------------------------------------

create table public.cost_line (
  id           uuid primary key default gen_random_uuid(),
  quote_id     uuid not null references public.true_cost_quote (id) on delete cascade,
  position     smallint not null,
  category     public.cost_category not null,
  label        text not null check (char_length(label) <= 160),
  amount_pence bigint not null,
  working      text,
  source       public.line_source not null,
  confidence   numeric(3,2) not null check (confidence between 0 and 1),
  fee_rule_id  uuid references public.fee_rule (id) on delete set null,
  unique (quote_id, position)
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.party           enable row level security;
alter table public.offer           enable row level security;
alter table public.fee_rule        enable row level security;
alter table public.true_cost_quote enable row level security;
alter table public.cost_line       enable row level security;

-- party: signed-in users manage their own rows only.
create policy party_owner_all on public.party
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- offer: same.
create policy offer_owner_all on public.offer
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- fee_rule: anyone may read active rules (it's public reference data).
-- No insert/update/delete policies → only the service role can write.
create policy fee_rule_public_read on public.fee_rule
  for select to anon, authenticated
  using (is_active);

-- true_cost_quote: owners see their own; anyone can see a quote shared publicly.
create policy quote_owner_all on public.true_cost_quote
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy quote_public_read on public.true_cost_quote
  for select to anon, authenticated
  using (is_public);

-- cost_line: readable if the parent quote is readable. Writes via service role only.
create policy cost_line_read on public.cost_line
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.true_cost_quote q
      where q.id = cost_line.quote_id
        and (q.is_public or q.owner_id = (select auth.uid()))
    )
  );
