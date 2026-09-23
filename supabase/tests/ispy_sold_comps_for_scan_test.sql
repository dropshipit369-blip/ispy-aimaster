-- Self-rolling-back test for public.ispy_sold_comps_for_scan: inserts fixture comps, asserts the
-- matcher, then raises to undo everything. Success is the final "ALL PASSED" exception.
do $$
declare r jsonb; fails text := '';
begin
  insert into public.ebay_sold_comps (item_id, title, sold_price, currency, ended_at, confidence, price_source, sale_format, marketplace, category_seed, bid_count, condition)
  select 'zztest|' || g, t, p, 'AUD', now() - interval '3 days', c,
         case c when 'high' then 'getitem_settled' else 'scraped_sold_page' end, 'auction', 'EBAY_AU', 'test', 3, cond
  from (values
    (1,  'Zyxwq Qorvath WM-10 personal cassette player', 100, 'high', null),
    (2,  'Zyxwq Qorvath WM10 cassette', 110, 'high', 'Used'),
    (3,  'Zyxwq Qorvath WM 10 boxed', 120, 'high', 'Pre-owned'),
    (4,  'Zyxwq Qorvath WM-100 cassette', 900, 'high', null),          -- different model
    (5,  'Zyxwq Qorvath WM-10 spare parts only', 5, 'high', null),     -- spares
    (6,  'Zyxwq Qorvath WM-10 PSA 10', 950, 'high', null),             -- graded
    (7,  'Zyxwq Qorvath WM-10 unverified', 130, 'unverified', null),   -- lower tier
    (8,  'Zyxwq Qorvath WM-10 sealed', 500, 'high', 'Brand New'),      -- new: dropped from used scans
    (9,  'Zyxwq Qorvath WM-10 sealed box', 520, 'high', 'New'),
    (10, 'Zyxwq Qorvath WM-10 Pro edition', 2000, 'high', null),       -- variant not asked for
    (11, 'Zyxwq Qorvath WM-10 charger', 15, 'high', null)              -- accessory
  ) v(g, t, p, c, cond);

  -- Used scan: rows 1-3 only (2 new rows, the WM-100, spares, graded, Pro and charger all excluded).
  r := public.ispy_sold_comps_for_scan('Zyxwq Qorvath WM-10', 365, 'used');
  if r->>'status' <> 'ok' then fails := fails || 'used status=' || (r->>'status') || '; '; end if;
  if r->>'basis' <> 'confirmed' then fails := fails || 'basis=' || coalesce(r->>'basis', 'null') || '; '; end if;
  if (r->>'count')::int <> 3 then fails := fails || 'used count=' || coalesce(r->>'count', 'null') || '; '; end if;
  if (r->>'median')::numeric <> 110 then fails := fails || 'used median=' || coalesce(r->>'median', 'null') || '; '; end if;

  -- Any condition: rows 1-3 and 8-9.
  r := public.ispy_sold_comps_for_scan('Zyxwq Qorvath WM-10');
  if (r->>'count')::int <> 5 then fails := fails || 'any count=' || coalesce(r->>'count', 'null') || '; '; end if;

  -- New scan: stated-used rows 2-3 drop out; unstated row 1 stays with rows 8-9.
  r := public.ispy_sold_comps_for_scan('Zyxwq Qorvath WM-10', 365, 'new');
  if (r->>'count')::int <> 3 then fails := fails || 'new count=' || coalesce(r->>'count', 'null') || '; '; end if;

  -- Code written without a hyphen matches every spelling.
  r := public.ispy_sold_comps_for_scan('Zyxwq Qorvath WM10', 365, 'used');
  if (r->>'count')::int <> 3 then fails := fails || 'flex code count=' || coalesce(r->>'count', 'null') || '; '; end if;

  -- Naming the variant brings it in.
  r := public.ispy_sold_comps_for_scan('Zyxwq Qorvath WM-10 Pro');
  if coalesce(r->>'matched', r->>'count') <> '1' then fails := fails || 'variant query; '; end if;

  -- Asking for spares lets the spares listing through.
  r := public.ispy_sold_comps_for_scan('Zyxwq Qorvath WM-10 spare parts only');
  if coalesce(r->>'matched', '') <> '1' then fails := fails || 'spares matched=' || coalesce(r->>'matched', 'null') || '; '; end if;

  -- One term is a category, not an item.
  r := public.ispy_sold_comps_for_scan('Zyxwq');
  if r->>'status' <> 'insufficient_query' then fails := fails || 'one word not refused; '; end if;
  r := public.ispy_sold_comps_for_scan('WM10');
  if r->>'status' <> 'insufficient_query' then fails := fails || 'one code not refused; '; end if;

  -- A different model number finds nothing.
  r := public.ispy_sold_comps_for_scan('Zyxwq Qorvath WM-11');
  if r->>'status' <> 'insufficient_data' then fails := fails || 'wrong model matched; '; end if;

  if has_function_privilege('anon', 'public.ispy_sold_comps_for_scan(text,integer,text)', 'execute')
     or has_function_privilege('authenticated', 'public.ispy_sold_comps_for_scan(text,integer,text)', 'execute') then
    fails := fails || 'callable by clients; ';
  end if;

  if fails <> '' then raise exception 'FAILED: %', fails; end if;
  raise exception 'ALL PASSED (fixtures rolled back)';
end $$;
