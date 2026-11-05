-- Run by hand in Supabase → SQL Editor (it redefines the nightly clean-up, which deletes old data).
--
-- Same nightly clean-up as before, plus: seller and place names typed by families that were
-- never approved are deleted 90 days after they were last seen (the privacy page says so).

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

  -- The scrambled visitor code is only needed for this month's FairMark.
  update public.true_cost_quote set source_hash = null
   where source_hash is not null and created_at < now() - interval '30 days';

  -- Party / offer rows no longer used by any quote.
  delete from public.party p
   where p.created_at < now() - interval '30 days'
     and not exists (select 1 from public.true_cost_quote q where q.party_id = p.id);

  delete from public.offer o
   where o.created_at < now() - interval '30 days'
     and not exists (select 1 from public.true_cost_quote q where q.offer_id = o.id);

  -- Rate-limit counters.
  delete from public.rate_limit where window_start < now() - interval '1 day';

  -- Cached place checks (Visit, Plan B hospitals): 90 days, as the privacy page says.
  delete from public.place_snapshot where fetched_at < now() - interval '90 days';
  delete from public.hospital_snapshot where fetched_at < now() - interval '90 days';

  -- Names typed by families and never approved: 90 days after last seen.
  delete from public.public_name where status <> 'approved' and last_seen < now() - interval '90 days';

  -- Anonymous price statistics.
  delete from public.price_observation where observed_week < now() - interval '2 years';
end;
$$;

revoke execute on function public.purge_old_data() from public, anon, authenticated;
