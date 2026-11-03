-- Plan B's own cache: a place and its nearest hospitals with an emergency department, from
-- OpenStreetMap (30 days). Separate from place_snapshot so a hospital card never depends on
-- Visit before you book's bigger counting query. No personal data: keyed by the place name.
create table if not exists public.hospital_snapshot (
  query_key     text primary key check (char_length(query_key) between 2 and 120),
  display_name  text not null check (char_length(display_name) <= 300),
  lat           double precision not null check (lat between -90 and 90),
  lon           double precision not null check (lon between -180 and 180),
  hospitals     jsonb not null,
  fetched_at    timestamptz not null default now()
);

comment on table public.hospital_snapshot is
  'Plan B: cached OpenStreetMap hospitals with an emergency department near a place. Keyed by the normalised place name. No personal data.';

alter table public.hospital_snapshot enable row level security;
