-- "Hard to argue with" round. Additive columns, plus clearing postcodes no longer kept.

-- The family's own hold-bag count (advisory; null = one per two people).
alter table public.party
  add column if not exists hold_bags smallint check (hold_bags between 0 and 30);

-- The airline flying a package, and the travel month when there is no exact date.
alter table public.offer
  add column if not exists airline text check (char_length(airline) <= 60),
  add column if not exists depart_month smallint check (depart_month between 1 and 12);

-- What the receipt said when it was priced: currency conversion, advert maths and party checks,
-- seasonal-rate notes. Plain sentences, nothing about the family.
alter table public.true_cost_quote
  add column if not exists notes text[] check (coalesce(array_length(notes, 1), 0) <= 12);

-- Receipts no longer keep the postcode: it is used at pricing time only (council lookup, and the
-- area letters in anonymous statistics). Clear any already stored.
update public.party set outward_postcode = null where outward_postcode is not null;

comment on column public.party.outward_postcode is
  'No longer written (31 Oct 2026). The postcode is used at pricing time only and never stored with a receipt.';
