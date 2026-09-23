-- Scan-driven sold-data harvesting, direct from eBay's Browse API (no scraping).
--
-- eBay's only sold-data API (Marketplace Insights) is closed to new applicants, so iSpy builds its own
-- sold record: an auction that ends with bids IS a sale, and harvest-auctions reads the final price back
-- with getItem. Until now the harvester only watched six broad seeds. This makes customers' scans drive
-- it instead:
--   1. Auctions that appear in a customer's own scan results are added to the watch list for free
--      (the Browse call already happened), at priority 2.
--   2. A scan that finds too few sales records the query as demand. harvest-auctions {action:"demand"}
--      searches eBay AU auctions for the most-requested queries and watches what it finds.
--   3. settle() resolves priority items first (2 = customer demand, 1 = starter seeds, 0 = broad
--      harvester seeds), so items people actually scan get sold prices soonest.

alter table public.ebay_auction_watch
  add column if not exists priority smallint not null default 0,
  add column if not exists demand_query text;

create index if not exists ebay_auction_watch_settle_priority_idx
  on public.ebay_auction_watch (priority desc, ends_at)
  where settled = false;

create table if not exists public.ispy_demand_queries (
  query_key text primary key,              -- lower-cased, whitespace-collapsed query + condition
  query text not null,
  condition text check (condition in ('new', 'used')),
  requests integer not null default 0,     -- customer scans that found too few sales (0 = starter seed)
  first_requested_at timestamptz not null default now(),
  last_requested_at timestamptz not null default now(),
  last_harvested_at timestamptz,
  last_found integer,
  harvest_count integer not null default 0
);
alter table public.ispy_demand_queries enable row level security;  -- service role only; no policies
revoke all on public.ispy_demand_queries from anon, authenticated;

-- Record demand and/or watch auctions a customer scan surfaced. One call, best effort, service role only.
-- p_items: [{itemId,title,condition,imageUrl,url,endsAt,bid,bidCount}] (auctions only).
create or replace function public.ispy_watch_demand(p_query text, p_condition text, p_record_demand boolean, p_items jsonb, p_priority smallint default 2)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_query text := left(regexp_replace(btrim(coalesce(p_query, '')), '\s+', ' ', 'g'), 200);
  v_cond text := case when p_condition in ('new', 'used') then p_condition end;
  v_key text := lower(v_query) || '|' || coalesce(v_cond, 'any');
  v_watched integer := 0;
begin
  if v_query = '' then
    return jsonb_build_object('recorded', false, 'watched', 0);
  end if;

  if p_record_demand then
    insert into public.ispy_demand_queries as d (query_key, query, condition, requests)
    values (v_key, v_query, v_cond, 1)
    on conflict (query_key) do update
      set requests = d.requests + 1, last_requested_at = now();
  end if;

  if jsonb_typeof(p_items) = 'array' and jsonb_array_length(p_items) > 0 then
    with incoming as (
      select distinct on (x->>'itemId')
             x->>'itemId' as item_id,
             left(coalesce(x->>'title', '(untitled)'), 300) as title,
             x->>'condition' as condition,
             x->>'imageUrl' as image_url,
             x->>'url' as item_web_url,
             (x->>'endsAt')::timestamptz as ends_at,
             nullif(x->>'bid', '')::numeric as last_seen_bid,
             coalesce((x->>'bidCount')::int, 0) as last_seen_bid_count
      from jsonb_array_elements(p_items) x
      where x->>'itemId' is not null and x->>'endsAt' is not null
        and (x->>'endsAt')::timestamptz > now()
      limit 100
    )
    insert into public.ebay_auction_watch as w
      (item_id, title, category_seed, marketplace, condition, image_url, item_web_url, ends_at,
       last_seen_bid, last_seen_bid_count, last_seen_at, priority, demand_query)
    select item_id, title, 'demand', 'EBAY_AU', condition, image_url, item_web_url, ends_at,
           last_seen_bid, last_seen_bid_count, now(), greatest(0, least(p_priority, 2)), v_query
    from incoming
    on conflict (item_id) do update
      set priority = greatest(w.priority, least(p_priority, 2)),
          demand_query = coalesce(w.demand_query, excluded.demand_query),
          ends_at = excluded.ends_at,
          last_seen_bid = excluded.last_seen_bid,
          last_seen_bid_count = excluded.last_seen_bid_count,
          last_seen_at = excluded.last_seen_at
      where not w.settled;
    get diagnostics v_watched = row_count;
  end if;

  return jsonb_build_object('recorded', p_record_demand, 'watched', v_watched);
end;
$$;

-- Next queries for harvest-auctions {action:"demand"}: customer demand first (re-harvested every 12
-- hours, dropped after 60 days without a request), then starter seeds (every 24 hours).
create or replace function public.ispy_next_demand_queries(p_limit integer default 8)
returns table (query_key text, query text, condition text, requests integer)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select d.query_key, d.query, d.condition, d.requests
  from public.ispy_demand_queries d
  where (d.last_harvested_at is null
         or d.last_harvested_at < now() - case when d.requests > 0 then interval '12 hours' else interval '24 hours' end)
    and (d.requests = 0 or d.last_requested_at > now() - interval '60 days')
  order by (d.requests > 0) desc,
           (d.last_harvested_at is null) desc,
           d.requests desc,
           d.last_harvested_at nulls first,
           d.last_requested_at desc
  limit greatest(1, least(p_limit, 50));
$$;

create or replace function public.ispy_mark_demand_harvested(p_query_key text, p_found integer)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.ispy_demand_queries
     set last_harvested_at = now(), last_found = p_found, harvest_count = harvest_count + 1
   where query_key = p_query_key;
$$;

revoke all on function public.ispy_watch_demand(text, text, boolean, jsonb, smallint) from public, anon, authenticated;
revoke all on function public.ispy_next_demand_queries(integer) from public, anon, authenticated;
revoke all on function public.ispy_mark_demand_harvested(text, integer) from public, anon, authenticated;
grant execute on function public.ispy_watch_demand(text, text, boolean, jsonb, smallint) to service_role;
grant execute on function public.ispy_next_demand_queries(integer) to service_role;
grant execute on function public.ispy_mark_demand_harvested(text, integer) to service_role;

-- Budget over eBay's 5,000/day Browse pool. Settling is what produces sold prices, and demand items
-- are watched only when they already have a bid, so settle's cap rises from 3,000 to 3,800.
-- Each lower-priority purpose keeps a guaranteed slice above the one below it:
--   settle <= 3,800 total; demand searches <= 4,400 (>= 600 left for ~384/day at 8 per 30 min);
--   snapshot <= 4,950 (>= 1,150 for its ~864/day); customers' live scans <= 4,950 (>= 550 always).
create or replace function public.reserve_ebay_budget(p_browse integer DEFAULT 0, p_bulk integer DEFAULT 0, p_browse_cap integer DEFAULT 4200, p_bulk_cap integer DEFAULT 4200, p_purpose text DEFAULT 'other'::text)
 RETURNS TABLE(allowed boolean, browse_used integer, bulk_used integer, browse_remaining integer, bulk_remaining integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  today date := public.ebay_quota_day();
  cur_browse integer; cur_bulk integer; eff_cap integer;
begin
  insert into public.ebay_api_budget (day) values (today) on conflict (day) do nothing;

  select (b.search_calls + b.item_calls), b.bulk_calls into cur_browse, cur_bulk
  from public.ebay_api_budget b where b.day = today for update;

  eff_cap := case p_purpose
               when 'settle'   then 3800
               when 'demand'   then 4400
               when 'snapshot' then 4950
               when 'customer' then 4950
               else p_browse_cap
             end;

  if (p_browse > 0 and (cur_browse + p_browse) > eff_cap)
     or (p_bulk > 0 and (cur_bulk + p_bulk) > p_bulk_cap) then
    update public.ebay_api_budget set throttled_at = now(), updated_at = now() where day = today;
    return query select false, cur_browse, cur_bulk,
                        greatest(0, eff_cap - cur_browse), greatest(0, p_bulk_cap - cur_bulk);
    return;
  end if;

  update public.ebay_api_budget
    set search_calls = search_calls + p_browse, bulk_calls = bulk_calls + p_bulk, updated_at = now()
    where day = today;

  cur_browse := cur_browse + p_browse; cur_bulk := cur_bulk + p_bulk;
  return query select true, cur_browse, cur_bulk,
                      greatest(0, eff_cap - cur_browse), greatest(0, p_bulk_cap - cur_bulk);
end $function$;

-- Starter demand: items Australian op-shop and garage-sale flippers commonly check, outside the six
-- broad harvester seeds. requests = 0 marks them as seeds; real customer demand always runs first.
insert into public.ispy_demand_queries (query_key, query, condition, requests)
select lower(q) || '|any', q, null, 0
from unnest(array[
  'Pyrex bowl vintage', 'Corningware casserole', 'Crown Lynn', 'Bendigo Pottery', 'Diana Pottery',
  'Royal Albert Old Country Roses', 'Wedgwood Jasperware', 'Carlton Ware', 'Arabia Finland', 'Villeroy Boch',
  'Le Creuset cast iron', 'Kenwood Chef mixer', 'Sunbeam Mixmaster', 'Thermomix TM5', 'Dyson V8',
  'Sony Walkman cassette', 'Technics turntable', 'Pioneer receiver', 'Nintendo 64 console', 'Super Nintendo SNES',
  'Game Boy Color', 'Nintendo DS Lite', 'PlayStation 2 console', 'Sega Mega Drive', 'Atari 2600',
  'Polaroid SX-70', 'Canon AE-1', 'Olympus Mju', 'Pentax K1000', 'GoPro Hero',
  'Levis 501 jeans', 'RM Williams boots', 'Dr Martens boots', 'Harley Davidson t-shirt', 'Ralph Lauren polo',
  'Country Road jumper', 'Nike Air Max', 'Adidas Samba', 'Birkenstock Arizona', 'Oroton bag',
  'Coach handbag', 'Seiko automatic watch', 'Casio G-Shock', 'Omega Seamaster', 'Pandora bracelet',
  'Sterling silver bracelet', '9ct gold ring', 'Swarovski crystal figurine', 'Hot Wheels Treasure Hunt', 'Matchbox Lesney',
  'Beanie Babies', 'Funko Pop exclusive', 'Transformers G1', 'Star Wars Kenner', 'Barbie vintage doll',
  'Holden Commodore VL', 'Ford Falcon XR6', 'Holden HQ', 'Toyota Hilux headlight', 'Makita drill 18V'
]) q
on conflict (query_key) do nothing;
