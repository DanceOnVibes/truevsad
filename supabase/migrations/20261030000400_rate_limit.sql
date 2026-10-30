-- Rate limiting: a tiny counter table keyed by a HASHED visitor id (never a raw IP).

-- ---------------------------------------------------------------------------
-- Rate limiting
-- ---------------------------------------------------------------------------

create table public.rate_limit (
  bucket       text primary key check (char_length(bucket) <= 80),
  hits         integer not null default 0,
  window_start timestamptz not null default now()
);

comment on table public.rate_limit is
  'Request counters. bucket = action + HMAC of visitor IP; raw IPs are never stored. Rows older than a day are purged.';

-- RLS on, no policies: only the service role (our server) can touch it.
alter table public.rate_limit enable row level security;

-- Returns true if the request is allowed.
create or replace function public.hit_rate_limit(p_bucket text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_hits integer;
begin
  insert into public.rate_limit as r (bucket, hits, window_start)
  values (p_bucket, 1, now())
  on conflict (bucket) do update
    set hits = case
                 when r.window_start < now() - make_interval(secs => p_window_seconds) then 1
                 else r.hits + 1
               end,
        window_start = case
                 when r.window_start < now() - make_interval(secs => p_window_seconds) then now()
                 else r.window_start
               end
  returning hits into v_hits;

  return v_hits <= p_max;
end;
$$;

revoke execute on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;
