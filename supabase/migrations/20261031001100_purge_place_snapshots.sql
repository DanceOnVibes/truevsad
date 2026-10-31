-- NOT YET APPLIED to production (it contains deletes, so it needs a manual run):
-- paste it into the Supabase SQL Editor once.

-- ---------------------------------------------------------------------------
-- Retention: also drop place snapshots older than 90 days (they're refetched on demand)
-- ---------------------------------------------------------------------------

create or replace function public.purge_old_data()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  delete from public.true_cost_quote
   where (share_slug is null and created_at < now() - interval '30 days')
      or (share_slug is not null and created_at < now() - interval '12 months');

  delete from public.party p
   where p.created_at < now() - interval '30 days'
     and not exists (select 1 from public.true_cost_quote q where q.party_id = p.id);

  delete from public.offer o
   where o.created_at < now() - interval '30 days'
     and not exists (select 1 from public.true_cost_quote q where q.offer_id = o.id);

  delete from public.rate_limit where window_start < now() - interval '1 day';

  delete from public.place_snapshot where fetched_at < now() - interval '90 days';
end;
$$;

revoke execute on function public.purge_old_data() from public, anon, authenticated;
