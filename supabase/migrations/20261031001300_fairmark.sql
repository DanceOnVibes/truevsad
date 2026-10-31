-- FairMark: the gap between true and advertised price, stored when a quote is saved so shares
-- and history stay consistent (pages still recalculate on view with today's fee rules).
--   fairmark_percent : (true − advertised) / advertised × 100, full precision
--   fairmark_level   : gold (≤5%) · fair (≤10%) · higher (≤20%) · high (>20%) · unavailable
--   listed           : the family chose to show this shared deal on the public Fair Price board

alter table public.true_cost_quote
  add column if not exists fairmark_percent numeric(9,4),
  add column if not exists fairmark_level text
    check (fairmark_level in ('gold', 'fair', 'higher', 'high', 'unavailable')),
  add column if not exists listed boolean not null default false;

-- A listed deal must be shared (public) first.
alter table public.true_cost_quote
  add constraint true_cost_quote_listed_is_public check (not listed or is_public);

create index if not exists true_cost_quote_listed_idx
  on public.true_cost_quote (created_at desc) where listed;
