-- Data accuracy round. Additive only: new nullable columns, safe with the code already live.

-- 1. Non-pound adverts. The offer's headline is stored in pence AFTER conversion; these keep what
--    the advert actually said and the rate used, so shared receipts can show both.
alter table public.offer
  add column if not exists fx_from_currency     text check (fx_from_currency in ('EUR', 'USD')),
  add column if not exists fx_from_amount_minor bigint check (fx_from_amount_minor > 0),
  add column if not exists fx_rate              numeric(12, 6) check (fx_rate > 0 and fx_rate < 10),
  add column if not exists fx_date              date;

comment on column public.offer.fx_rate is
  'Pounds per 1 unit of fx_from_currency: European Central Bank reference rate for fx_date.';

-- 2. Price observations: the postcode AREA only (the letters, e.g. "SE", "B", "CF") — tens of
--    thousands of households per area — so we can tell whether prices differ by home region.
--    Never the district (SE11) and never the full postcode.
alter table public.price_observation
  add column if not exists home_area text check (home_area ~ '^[A-Z]{1,2}$'),
  add column if not exists advertised_currency text not null default 'GBP'
    check (advertised_currency in ('GBP', 'EUR', 'USD'));

comment on table public.price_observation is
  'Anonymous price statistics from X-rays. No quote id, ages, link or full postcode: only the postcode area letters. Week-level dates only. Kept 2 years.';
