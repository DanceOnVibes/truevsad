-- Which version of our reader read each country, so a fixed reader re-reads every guide.
alter table public.fcdo_advice add column if not exists parser_version integer not null default 1;
