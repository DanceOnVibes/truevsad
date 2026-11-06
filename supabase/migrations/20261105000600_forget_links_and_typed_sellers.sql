-- Second legal check (5 Nov 2026): stop holding two things nothing uses.
--
-- 1. offer.source_url — the deal link a family pasted. Nothing ever read it back, and the part
--    after "?" can carry an email address or booking reference. The site no longer saves it.
-- 2. price_observation.seller_name — the seller as the family typed it, kept for 2 years in the
--    statistics. seller_key is all the statistics need. The site no longer saves it.
--
-- RUN BY HAND in the Supabase SQL editor (it clears data). Safe to run more than once.

update public.offer set source_url = null where source_url is not null;
update public.price_observation set seller_name = null where seller_name is not null;

-- Check: both should be 0.
select
  (select count(*) from public.offer where source_url is not null) as links_left,
  (select count(*) from public.price_observation where seller_name is not null) as typed_sellers_left;
