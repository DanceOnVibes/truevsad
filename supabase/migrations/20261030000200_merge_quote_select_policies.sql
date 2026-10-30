-- Performance Advisor fix (not a security issue).
-- NOT YET APPLIED to production: run it in the Supabase SQL Editor when convenient.
--
-- One SELECT policy on true_cost_quote instead of two overlapping ones.
--    Same access as before: anyone sees public quotes, owners see their own.
drop policy if exists quote_owner_all   on public.true_cost_quote;
drop policy if exists quote_public_read on public.true_cost_quote;

create policy quote_read on public.true_cost_quote
  for select to anon, authenticated
  using (is_public or owner_id = (select auth.uid()));

create policy quote_owner_insert on public.true_cost_quote
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy quote_owner_update on public.true_cost_quote
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy quote_owner_delete on public.true_cost_quote
  for delete to authenticated
  using (owner_id = (select auth.uid()));
