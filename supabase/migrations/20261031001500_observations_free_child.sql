-- 1. Anonymous price observations: one row per X-ray, kept for 2 years to measure school-holiday
--    premiums and seller fairness over time. Deliberately NOT linked to the quote, the family or the
--    deal link: no quote id, no ages, no postcode, no URL, and only the WEEK of travel and of checking.
create table if not exists public.price_observation (
  id                   bigserial primary key,
  observed_week        date not null,                 -- Monday of the week it was checked
  seller_key           text check (char_length(seller_key) <= 80),
  seller_name          text check (char_length(seller_name) <= 120),
  place_key            text check (char_length(place_key) <= 120),
  travel_week          date,                          -- Monday of the travel week, if known
  nights               smallint not null check (nights between 0 and 60),
  party_size           smallint not null check (party_size between 1 and 18),
  children             smallint not null check (children between 0 and 9),
  headline_basis       public.headline_basis not null,
  advertised_pp_pence  bigint not null check (advertised_pp_pence >= 0),
  true_pp_pence        bigint not null check (true_pp_pence >= 0),
  includes             text[] not null default '{}',
  free_child_claim     boolean not null default false,
  fairmark_percent     numeric(9,4),
  engine_version       text not null,
  -- Week precision only (Monday 00:00 UTC), like observed_week: never the exact moment.
  created_at           timestamptz not null default date_trunc('week', now())
);

create index if not exists price_observation_seller_idx on public.price_observation (seller_key, travel_week);
create index if not exists price_observation_place_idx on public.price_observation (place_key, travel_week);

comment on table public.price_observation is
  'Anonymous price statistics from X-rays. No quote id, ages, postcode or link; week-level dates only. Kept 2 years.';

alter table public.price_observation enable row level security;

-- 2. "Free child places": the advert says children go free. Kept so shared receipts can show
--    what each child still costs in extras.
alter table public.offer add column if not exists free_child_claim boolean not null default false;
