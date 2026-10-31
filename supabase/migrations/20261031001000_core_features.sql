-- Core for the next features:
--   travel dates        offer.depart_on + seasonal fee rules (fee_rule.months)
--   School Window       school_holiday: council term dates, researched and sourced like fee rules
--   Visit Before You Book  place_snapshot: cached OpenStreetMap counts per place (no personal data)

-- ---------------------------------------------------------------------------
-- Travel dates + seasonal rates
-- ---------------------------------------------------------------------------

alter table public.offer add column if not exists depart_on date;

alter table public.fee_rule add column if not exists months smallint[]
  check (months is null or (cardinality(months) between 1 and 12 and months <@ array[1,2,3,4,5,6,7,8,9,10,11,12]::smallint[]));

-- ---------------------------------------------------------------------------
-- School Window
-- ---------------------------------------------------------------------------

create table if not exists public.school_holiday (
  id           uuid primary key default gen_random_uuid(),
  nation       text not null check (nation in ('england', 'scotland', 'wales', 'northern_ireland')),
  authority    text not null check (char_length(authority) between 2 and 80),
  school_year  text not null check (school_year ~ '^[0-9]{4}-[0-9]{2}$'),
  name         text not null check (char_length(name) between 2 and 80),
  starts_on    date not null,
  ends_on      date not null,
  source_url   text not null check (source_url ~ '^https?://'),
  source_note  text not null,
  created_at   timestamptz not null default now(),
  constraint school_holiday_dates check (ends_on >= starts_on and ends_on - starts_on <= 60),
  constraint school_holiday_unique unique (authority, school_year, name)
);

create index if not exists school_holiday_authority_idx on public.school_holiday (authority, starts_on);

comment on table public.school_holiday is
  'Council school holiday dates (first and last day off, inclusive). Public reference data, every row sourced.';

-- Server-only, like fee_rule: RLS on, no policies.
alter table public.school_holiday enable row level security;

-- ---------------------------------------------------------------------------
-- Visit Before You Book
-- ---------------------------------------------------------------------------

create table if not exists public.place_snapshot (
  query_key     text primary key check (char_length(query_key) between 2 and 120),
  display_name  text not null check (char_length(display_name) <= 300),
  lat           double precision not null check (lat between -90 and 90),
  lon           double precision not null check (lon between -180 and 180),
  counts        jsonb not null,
  fetched_at    timestamptz not null default now()
);

comment on table public.place_snapshot is
  'Cached OpenStreetMap counts around a place (playgrounds, beaches, nightlife…). Keyed by the normalised place name. No personal data.';

alter table public.place_snapshot enable row level security;

-- ---------------------------------------------------------------------------
-- save_quote: same as before, plus offer.depart_on
-- ---------------------------------------------------------------------------

create or replace function public.save_quote(p jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_party uuid;
  v_offer uuid;
  v_quote uuid;
  v_line  jsonb;
  v_pos   smallint := 0;
begin
  insert into public.party (adults, child_ages, outward_postcode)
  values (
    (p -> 'party' ->> 'adults')::smallint,
    coalesce(
      array(select x::smallint from jsonb_array_elements_text(p -> 'party' -> 'childAges') as x),
      '{}'
    ),
    nullif(p -> 'party' ->> 'outwardPostcode', '')
  )
  returning id into v_party;

  insert into public.offer (
    source_kind, source_url, supplier_name, destination,
    nights, headline_pence, headline_basis, currency, includes, excludes_taxes_and_fees, depart_on, confirmed_at
  )
  values (
    (p -> 'offer' ->> 'sourceKind')::public.offer_source_kind,
    nullif(p -> 'offer' ->> 'sourceUrl', ''),
    nullif(p -> 'offer' ->> 'supplierName', ''),
    nullif(p -> 'offer' ->> 'destination', ''),
    (p -> 'offer' ->> 'nights')::smallint,
    (p -> 'offer' ->> 'headlinePence')::bigint,
    (p -> 'offer' ->> 'headlineBasis')::public.headline_basis,
    coalesce(p -> 'offer' ->> 'currency', 'GBP'),
    coalesce(
      array(select x from jsonb_array_elements_text(coalesce(p -> 'offer' -> 'includes', '[]'::jsonb)) as x),
      '{}'
    ),
    coalesce((p -> 'offer' ->> 'excludesTaxesAndFees')::boolean, false),
    nullif(p -> 'offer' ->> 'departDate', '')::date,
    now()
  )
  returning id into v_offer;

  insert into public.true_cost_quote (
    party_id, offer_id, advertised_pence, true_cost_pence,
    confidence, used_demo_rules, engine_version
  )
  values (
    v_party, v_offer,
    (p -> 'result' ->> 'advertisedPence')::bigint,
    (p -> 'result' ->> 'trueCostPence')::bigint,
    round((p -> 'result' ->> 'confidence')::numeric, 2),
    coalesce((p -> 'result' ->> 'usedDemoRules')::boolean, false),
    p -> 'result' ->> 'engineVersion'
  )
  returning id into v_quote;

  for v_line in select * from jsonb_array_elements(p -> 'result' -> 'receipt' -> 'lines') loop
    insert into public.cost_line (
      quote_id, position, category, label, amount_pence,
      working, source, confidence, fee_rule_id
    )
    values (
      v_quote, v_pos,
      (v_line ->> 'category')::public.cost_category,
      left(v_line ->> 'label', 160),
      (v_line ->> 'amountPence')::bigint,
      v_line ->> 'working',
      (v_line ->> 'source')::public.line_source,
      round((v_line ->> 'confidence')::numeric, 2),
      case
        when v_line ->> 'ruleId' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then (v_line ->> 'ruleId')::uuid
      end
    );
    v_pos := v_pos + 1;
  end loop;

  return v_quote;
end;
$$;

revoke execute on function public.save_quote(jsonb) from public, anon, authenticated;
grant execute on function public.save_quote(jsonb) to service_role;

