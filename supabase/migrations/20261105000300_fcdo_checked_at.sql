-- Plan B: when we last confirmed our copy of a country's FCDO advice is current. Set every
-- morning for countries GOV.UK's index shows unchanged, and whenever a guide is re-read, so the
-- card's "checked" date is true even when the FCDO hasn't changed anything for weeks.
alter table public.fcdo_advice add column if not exists checked_at timestamptz;
update public.fcdo_advice set checked_at = fetched_at where checked_at is null;
