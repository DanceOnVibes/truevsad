-- Fee rules that match how real taxes work:
--   per_party_per_night : charged once per night for the party (e.g. Greece's fee per room per night)
--   max_nights          : per-night taxes that stop after N nights (e.g. Catalonia charges the first 7 only)

alter type public.rule_unit add value if not exists 'per_party_per_night';

alter table public.fee_rule add column if not exists max_nights smallint
  check (max_nights between 1 and 60);
