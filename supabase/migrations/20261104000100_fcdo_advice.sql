-- Plan B, layer 1: our daily copy of the FCDO's travel advice for every country, from the GOV.UK
-- Content API (Open Government Licence v3.0). Only what the FCDO publishes: emergency numbers,
-- the natural hazards it flags and its travel alerts. No personal data.
create table if not exists public.fcdo_advice (
  slug             text primary key check (slug ~ '^[a-z0-9-]{2,60}$'),
  name             text not null check (char_length(name) <= 80),
  synonyms         text[] not null default '{}',
  updated_at       timestamptz,            -- when the FCDO last changed the guide
  fetched_at       timestamptz not null default now(),
  alert_status     text[] not null default '{}',
  emergency        jsonb,                  -- { text, numbers: [{ service, number }] }
  hazards          jsonb not null default '[]'::jsonb,
  content_hash     text not null,
  changed_at       timestamptz not null default now(),  -- when emergency/hazards/alerts last changed
  review_needed    boolean not null default true          -- a person should look at what changed
);

comment on table public.fcdo_advice is
  'Plan B: daily copy of FCDO travel advice per country (emergency numbers, natural hazards, alerts). Source: GOV.UK Content API, OGL v3.0. No personal data.';

alter table public.fcdo_advice enable row level security;
