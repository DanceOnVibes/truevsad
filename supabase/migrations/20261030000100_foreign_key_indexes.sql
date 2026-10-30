-- Performance Advisor fix: Index every foreign key (faster joins and cascading deletes).
create index if not exists party_owner_idx           on public.party (owner_id);
create index if not exists offer_owner_idx           on public.offer (owner_id);
create index if not exists true_cost_quote_party_idx on public.true_cost_quote (party_id);
create index if not exists true_cost_quote_offer_idx on public.true_cost_quote (offer_id);
create index if not exists cost_line_fee_rule_idx    on public.cost_line (fee_rule_id);
