-- Plan B.
-- 1. The booking type the family confirmed (package or booked separately). It never changes the
--    price; it only picks the receipt's "If it goes wrong" lines, so shared receipts show the same.
alter table public.offer add column if not exists booking_type text
  check (booking_type in ('package', 'separate'));

-- 2. Hospitals with an emergency department near a place, from OpenStreetMap, cached with the
--    place itself (30 days) so we ask OpenStreetMap's free services as little as possible.
alter table public.place_snapshot add column if not exists hospitals jsonb;
alter table public.place_snapshot add column if not exists hospitals_at timestamptz;
