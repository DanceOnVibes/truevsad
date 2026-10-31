-- When each council's term dates were last checked against the council's own page.
-- Shown on School Window and FairFam next to the source link. Re-checked by hand each January.
alter table public.school_holiday add column if not exists checked_on date;
update public.school_holiday set checked_on = created_at::date where checked_on is null;
alter table public.school_holiday alter column checked_on set default current_date;
