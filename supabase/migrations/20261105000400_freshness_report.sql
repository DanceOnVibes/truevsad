-- The daily freshness check's latest result: one row, replaced each morning by /api/cron/freshness.
-- Read by the weekly reminder (a Claude scheduled task) and by Adalbert in the Table Editor.
create table if not exists public.freshness_report (
  id smallint primary key default 1 check (id = 1),
  run_at timestamptz not null default now(),
  issues jsonb not null default '[]'::jsonb
);

alter table public.freshness_report enable row level security;
revoke all on public.freshness_report from anon, authenticated;
