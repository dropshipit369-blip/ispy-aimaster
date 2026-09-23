-- Self-rolling-back test for scan-driven harvesting. Success is the final "ALL PASSED" exception.
do $$
declare r jsonb; n int; p smallint; fails text := '';
begin
  -- Demand is recorded once per scan and counts repeats.
  r := public.ispy_watch_demand('  Zyxwq   Qorvath lamp ', 'used', true, '[]'::jsonb);
  r := public.ispy_watch_demand('zyxwq qorvath lamp', 'used', true, '[]'::jsonb);
  select requests into n from public.ispy_demand_queries where query_key = 'zyxwq qorvath lamp|used';
  if n is distinct from 2 then fails := fails || 'requests=' || coalesce(n::text, 'null') || '; '; end if;

  -- Customer demand is served before starter seeds.
  select requests into n from public.ispy_next_demand_queries(1);
  if n is distinct from 2 then fails := fails || 'queue order; '; end if;

  -- Auctions from a scan are watched at priority 2; ended or id-less items are ignored.
  r := public.ispy_watch_demand('zyxwq qorvath lamp', null, false, jsonb_build_array(
    jsonb_build_object('itemId', 'zztest|a1', 'title', 'Zyxwq Qorvath lamp', 'endsAt', now() + interval '2 days', 'bid', '12.50', 'bidCount', 2),
    jsonb_build_object('itemId', 'zztest|a2', 'title', 'ended', 'endsAt', now() - interval '1 hour', 'bidCount', 1),
    jsonb_build_object('title', 'no id', 'endsAt', now() + interval '1 day')));
  if (r->>'watched')::int <> 1 then fails := fails || 'watched=' || (r->>'watched') || '; '; end if;
  select priority into p from public.ebay_auction_watch where item_id = 'zztest|a1';
  if p is distinct from 2::smallint then fails := fails || 'priority=' || coalesce(p::text, 'null') || '; '; end if;

  -- A seed-priority sighting never downgrades a customer-priority item.
  r := public.ispy_watch_demand('zyxwq qorvath lamp', null, false, jsonb_build_array(
    jsonb_build_object('itemId', 'zztest|a1', 'title', 'Zyxwq Qorvath lamp', 'endsAt', now() + interval '2 days', 'bid', '15', 'bidCount', 3)), 1::smallint);
  select priority into p from public.ebay_auction_watch where item_id = 'zztest|a1';
  if p is distinct from 2::smallint then fails := fails || 'downgraded; '; end if;

  -- Harvest bookkeeping.
  perform public.ispy_mark_demand_harvested('zyxwq qorvath lamp|used', 7);
  select last_found into n from public.ispy_demand_queries where query_key = 'zyxwq qorvath lamp|used';
  if n is distinct from 7 then fails := fails || 'mark harvested; '; end if;

  -- Service-role only.
  if has_function_privilege('authenticated', 'public.ispy_watch_demand(text,text,boolean,jsonb,smallint)', 'execute')
     or has_function_privilege('anon', 'public.ispy_next_demand_queries(integer)', 'execute')
     or has_table_privilege('authenticated', 'public.ispy_demand_queries', 'select') then
    fails := fails || 'exposed to clients; ';
  end if;

  if fails <> '' then raise exception 'FAILED: %', fails; end if;
  raise exception 'ALL PASSED (fixtures rolled back)';
end $$;
