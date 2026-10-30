-- Scope fee rules to destinations, and make CSV imports repeatable.
--
-- regions: plain-word place names matched against the confirmed destination
--          (case-insensitive). NULL = applies everywhere. Map polygons
--          (destination_area) come later in Phase 3.

alter table public.fee_rule add column if not exists regions text[]
  check (regions is null or cardinality(regions) between 1 and 50);

-- One row per rule version, so re-importing the CSV updates instead of duplicating.
create unique index if not exists fee_rule_natural_key
  on public.fee_rule (category, label, (coalesce(supplier_name, '')), valid_from);
