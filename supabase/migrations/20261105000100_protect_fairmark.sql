-- Audit step 2: protect FairMark.
--
-- 1. Every quote remembers which visitor sent it as a scrambled code (keyed hash of the IP,
--    never the IP), so the leaderboard can count different families instead of clicks.
--    The code is removed from the receipt after 30 days.
-- 2. Each quote stores its FairMark for the standard family, worked out by the engine when it
--    was saved and again every night with that day's fees, so the leaderboard is one query.
-- 3. Seller and place names are held for review before they're shown publicly.

alter table public.true_cost_quote
  add column if not exists source_hash text,
  add column if not exists seller_key text,
  add column if not exists place_key text,
  add column if not exists ref_percent numeric,
  add column if not exists ref_priced_at timestamptz;

create index if not exists true_cost_quote_created_at_idx on public.true_cost_quote (created_at desc);

-- ---------------------------------------------------------------------------
-- Names shown in public (sellers on the leaderboard, places on the deal board)
-- ---------------------------------------------------------------------------

create table if not exists public.public_name (
  kind text not null check (kind in ('seller', 'place')),
  key text not null check (length(key) between 1 and 120),
  display text not null check (length(display) between 1 and 80),
  status text not null default 'pending' check (status in ('pending', 'approved', 'hidden')),
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  note text,
  primary key (kind, key)
);

alter table public.public_name enable row level security;
revoke all on public.public_name from anon, authenticated;

-- Real UK holiday sellers, approved so they can appear once families have checked enough of
-- their deals. Approval never rates anyone: it only means the name is real and spelled right.
insert into public.public_name (kind, key, display, status, note) values
  ('seller', 'jet2holidays', 'Jet2holidays', 'approved', 'seeded'),
  ('seller', 'tui', 'TUI', 'approved', 'seeded'),
  ('seller', 'easyjetholidays', 'easyJet holidays', 'approved', 'seeded'),
  ('seller', 'loveholidays', 'loveholidays', 'approved', 'seeded'),
  ('seller', 'onthebeach', 'On the Beach', 'approved', 'seeded'),
  ('seller', 'britishairwaysholidays', 'British Airways Holidays', 'approved', 'seeded'),
  ('seller', 'virginholidays', 'Virgin Holidays', 'approved', 'seeded'),
  ('seller', 'lastminute', 'lastminute.com', 'approved', 'seeded'),
  ('seller', 'expedia', 'Expedia', 'approved', 'seeded'),
  ('seller', 'booking', 'Booking.com', 'approved', 'seeded'),
  ('seller', 'haystravel', 'Hays Travel', 'approved', 'seeded'),
  ('seller', 'kuoni', 'Kuoni', 'approved', 'seeded'),
  ('seller', 'trailfinders', 'Trailfinders', 'approved', 'seeded'),
  ('seller', 'ryanair', 'Ryanair', 'approved', 'seeded'),
  ('seller', 'easyjet', 'easyJet', 'approved', 'seeded'),
  ('seller', 'jet2', 'Jet2', 'approved', 'seeded')
on conflict (kind, key) do nothing;

-- What's waiting for a look, busiest first. Open it in Supabase → Table Editor, or ask Claude.
create or replace view public.names_to_review with (security_invoker = true) as
select n.kind, n.key, n.display, n.first_seen,
       count(q.id) as deals_30_days,
       count(distinct coalesce(q.source_hash, 'unknown')) as families_30_days
  from public.public_name n
  left join public.true_cost_quote q
    on q.created_at > now() - interval '30 days'
   and ((n.kind = 'seller' and q.seller_key = n.key) or (n.kind = 'place' and q.place_key = n.key))
 where n.status = 'pending'
 group by n.kind, n.key, n.display, n.first_seen
 order by count(q.id) desc, n.first_seen;

revoke all on public.names_to_review from anon, authenticated;

-- ---------------------------------------------------------------------------
-- fairmark_index: store the engine's figures for a batch of quotes (on save and nightly)
-- p = [{ id, ref_percent, seller_key, seller, place_key, place }]
-- ---------------------------------------------------------------------------

create or replace function public.fairmark_index(p jsonb)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  n integer;
begin
  update public.true_cost_quote q
     set ref_percent = r.ref_percent,
         seller_key = nullif(r.seller_key, ''),
         place_key = nullif(r.place_key, ''),
         ref_priced_at = now()
    from jsonb_to_recordset(p) as r(id uuid, ref_percent numeric, seller_key text, place_key text)
   where q.id = r.id;
  get diagnostics n = row_count;

  insert into public.public_name (kind, key, display)
  select distinct on (k.kind, k.key) k.kind, k.key, k.display
    from (
      select 'seller' as kind, left(r.seller_key, 120) as key, left(btrim(r.seller), 80) as display
        from jsonb_to_recordset(p) as r(seller_key text, seller text)
       where coalesce(r.seller_key, '') <> '' and coalesce(btrim(r.seller), '') <> ''
      union all
      select 'place', left(r.place_key, 120), left(btrim(r.place), 80)
        from jsonb_to_recordset(p) as r(place_key text, place text)
       where coalesce(r.place_key, '') <> '' and coalesce(btrim(r.place), '') <> ''
    ) k
  on conflict (kind, key) do update set last_seen = now();

  return n;
end;
$$;

revoke execute on function public.fairmark_index(jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- fairmark_leaderboard: one row per approved seller, from deals in the last p_days.
-- The same deal sent twice by the same visitor counts once, and each visitor counts at most
-- p_per_source deals per seller, so one person can't sway a seller's median.
-- ---------------------------------------------------------------------------

create or replace function public.fairmark_leaderboard(
  p_days integer,
  p_min_deals integer,
  p_min_sources integer,
  p_per_source integer,
  p_fair numeric
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with base as (
    select q.created_at, coalesce(q.source_hash, 'unknown') as src, q.seller_key, q.place_key, q.ref_percent,
           row_number() over (
             partition by coalesce(q.source_hash, 'unknown'), q.seller_key, q.place_key, o.nights,
                          o.headline_pence, o.headline_basis, o.depart_on, o.depart_month
             order by q.created_at desc) as dup
      from public.true_cost_quote q
      join public.offer o on o.id = q.offer_id
     where q.created_at >= now() - make_interval(days => p_days)
       and q.ref_percent is not null
       and q.seller_key is not null
  ), uniq as (
    select *, row_number() over (partition by src, seller_key order by created_at desc) as per_src
      from base
     where dup = 1
  ), counted as (
    select * from uniq where per_src <= p_per_source
  ), board as (
    select n.display as seller,
           count(*)::int as deals,
           count(distinct c.src)::int as sources,
           count(distinct c.place_key)::int as destinations,
           avg(c.ref_percent)::float8 as "averagePercent",
           (percentile_cont(0.5) within group (order by c.ref_percent))::float8 as "medianPercent",
           avg(case when c.ref_percent <= p_fair then 1 else 0 end)::float8 as "fairShare",
           min(c.ref_percent)::float8 as "bestPercent",
           max(c.ref_percent)::float8 as "worstPercent"
      from counted c
      join public.public_name n on n.kind = 'seller' and n.key = c.seller_key and n.status = 'approved'
     group by n.display
    having count(*) >= p_min_deals and count(distinct c.src) >= p_min_sources
  )
  select jsonb_build_object(
    'dealsCounted', (select count(*) from counted),
    'rows', coalesce((select jsonb_agg(to_jsonb(board)) from board), '[]'::jsonb)
  );
$$;

revoke execute on function public.fairmark_leaderboard(integer, integer, integer, integer, numeric) from public, anon, authenticated;

-- The 30-day removal of the visitor code is in the next migration (it contains deletes,
-- so Adalbert runs it by hand in the Supabase SQL Editor).
