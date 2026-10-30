-- Retention (data minimisation): unshared quotes are deleted after 30 days,
-- shared ones after 12 months. Orphaned party/offer rows and day-old
-- rate-limit counters go too. Runs nightly via pg_cron.
--
-- NOT YET APPLIED to production: run it once in the Supabase SQL Editor.

-- ---------------------------------------------------------------------------
-- Retention
-- ---------------------------------------------------------------------------

create or replace function public.purge_old_data()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- Quotes (cost_line rows cascade).
  delete from public.true_cost_quote
   where (share_slug is null and created_at < now() - interval '30 days')
      or (share_slug is not null and created_at < now() - interval '12 months');

  -- Party / offer rows no longer used by any quote.
  delete from public.party p
   where p.created_at < now() - interval '30 days'
     and not exists (select 1 from public.true_cost_quote q where q.party_id = p.id);

  delete from public.offer o
   where o.created_at < now() - interval '30 days'
     and not exists (select 1 from public.true_cost_quote q where q.offer_id = o.id);

  -- Rate-limit counters.
  delete from public.rate_limit where window_start < now() - interval '1 day';
end;
$$;

revoke execute on function public.purge_old_data() from public, anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;

-- Every night at 03:17 UTC.
select cron.schedule('truevsad-purge-old-data', '17 3 * * *', $$select public.purge_old_data();$$);
