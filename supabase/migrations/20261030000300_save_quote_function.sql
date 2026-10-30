-- save_quote: writes party + offer + quote + cost lines in ONE transaction.
-- Called only by our server (service role). Not callable from the browser.
--
-- Data minimisation: we store only the confirmed fields — never the raw pasted text.

create or replace function public.save_quote(p jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_party uuid;
  v_offer uuid;
  v_quote uuid;
  v_line  jsonb;
  v_pos   smallint := 0;
begin
  insert into public.party (adults, child_ages, outward_postcode)
  values (
    (p -> 'party' ->> 'adults')::smallint,
    coalesce(
      array(select x::smallint from jsonb_array_elements_text(p -> 'party' -> 'childAges') as x),
      '{}'
    ),
    nullif(p -> 'party' ->> 'outwardPostcode', '')
  )
  returning id into v_party;

  insert into public.offer (
    source_kind, source_url, supplier_name, destination,
    nights, headline_pence, headline_basis, currency, confirmed_at
  )
  values (
    (p -> 'offer' ->> 'sourceKind')::public.offer_source_kind,
    nullif(p -> 'offer' ->> 'sourceUrl', ''),
    nullif(p -> 'offer' ->> 'supplierName', ''),
    nullif(p -> 'offer' ->> 'destination', ''),
    (p -> 'offer' ->> 'nights')::smallint,
    (p -> 'offer' ->> 'headlinePence')::bigint,
    (p -> 'offer' ->> 'headlineBasis')::public.headline_basis,
    coalesce(p -> 'offer' ->> 'currency', 'GBP'),
    now()
  )
  returning id into v_offer;

  insert into public.true_cost_quote (
    party_id, offer_id, advertised_pence, true_cost_pence,
    confidence, used_demo_rules, engine_version
  )
  values (
    v_party, v_offer,
    (p -> 'result' ->> 'advertisedPence')::bigint,
    (p -> 'result' ->> 'trueCostPence')::bigint,
    round((p -> 'result' ->> 'confidence')::numeric, 2),
    coalesce((p -> 'result' ->> 'usedDemoRules')::boolean, false),
    p -> 'result' ->> 'engineVersion'
  )
  returning id into v_quote;

  for v_line in select * from jsonb_array_elements(p -> 'result' -> 'receipt' -> 'lines') loop
    insert into public.cost_line (
      quote_id, position, category, label, amount_pence,
      working, source, confidence, fee_rule_id
    )
    values (
      v_quote, v_pos,
      (v_line ->> 'category')::public.cost_category,
      left(v_line ->> 'label', 160),
      (v_line ->> 'amountPence')::bigint,
      v_line ->> 'working',
      (v_line ->> 'source')::public.line_source,
      round((v_line ->> 'confidence')::numeric, 2),
      -- Demo rules have text ids; only real fee_rule uuids are linked.
      case
        when v_line ->> 'ruleId' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then (v_line ->> 'ruleId')::uuid
      end
    );
    v_pos := v_pos + 1;
  end loop;

  return v_quote;
end;
$$;

-- Only the server may call it.
revoke execute on function public.save_quote(jsonb) from public, anon, authenticated;
grant execute on function public.save_quote(jsonb) to service_role;
