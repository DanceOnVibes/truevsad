-- "Local tourist taxes" can now be ticked as already included in a deal, and levy rules
-- cover it — so sellers who put taxes in their headline price (as the law now expects)
-- are never charged them twice.
alter table public.offer
  drop constraint offer_includes_check,
  add constraint offer_includes_check
    check (includes <@ array['hold_bag', 'cabin_bag', 'seats', 'transfers', 'local_taxes']::text[]);

alter table public.fee_rule
  drop constraint fee_rule_covers_check,
  add constraint fee_rule_covers_check
    check (covers in ('hold_bag', 'cabin_bag', 'seats', 'transfers', 'local_taxes'));
