-- Rules in the same exclusive group never stack: the most specific one wins
-- (e.g. a Barcelona-city rate beats the rest-of-Catalonia rate for a Barcelona hotel).
alter table public.fee_rule add column if not exists exclusive_group text
  check (exclusive_group ~ '^[a-z0-9_]{2,40}$');
