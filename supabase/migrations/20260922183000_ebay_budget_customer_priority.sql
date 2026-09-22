-- The iSpy app's market scans and the auction harvester share one eBay app key (buy.browse, 5,000/day).
-- Customer scans were not reserved at all, so the harvester could consume the whole day and paying users
-- would hit eBay 429s. Caps are ceilings on TOTAL daily usage per purpose, so priority is:
--   customer (4,950) > snapshot (4,950) > settle (3,000) > other (p_browse_cap, default 4,200)
-- Settle stops at 3,000, so the harvester peaks at ~3,000 + ~864 snapshot = ~3,864/day, which leaves
-- ~1,086+ calls/day that only customers and snapshot can use. Snapshot moves 4,700 -> 4,950 so customer
-- traffic can never starve it (bug 3 in harvest-auctions). 50 calls stay spare for sync drift.
create or replace function public.reserve_ebay_budget(
  p_browse integer default 0, p_bulk integer default 0,
  p_browse_cap integer default 4200, p_bulk_cap integer default 4200, p_purpose text default 'other')
returns table(allowed boolean, browse_used integer, bulk_used integer, browse_remaining integer, bulk_remaining integer)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  today date := public.ebay_quota_day();
  cur_browse integer; cur_bulk integer; eff_cap integer;
begin
  insert into public.ebay_api_budget (day) values (today) on conflict (day) do nothing;

  select (b.search_calls + b.item_calls), b.bulk_calls into cur_browse, cur_bulk
  from public.ebay_api_budget b where b.day = today for update;

  eff_cap := case p_purpose
               when 'settle'   then 3000
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
