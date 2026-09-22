-- harvest-auctions settle() examines only the oldest 1,000 unsettled auctions (PostgREST row cap).
-- Once the daily settle budget is spent, that window is entirely auctions WITH bids waiting for a
-- paid getItem call, so zero-bid auctions behind them - which settle for free - are never reached.
-- On 2026-09-23 that left 184,876 free-to-settle auctions stuck in a 207,132 backlog.
-- This settles them set-based using the harvester's existing rule, independent of the paid queue.
create or replace function public.ebay_settle_free_auctions(p_fresh_minutes integer default 10, p_limit integer default 20000)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_settled integer;
begin
  with picked as (
    select w.item_id, w.title, w.category_seed, w.last_seen_bid, w.ends_at
    from public.ebay_auction_watch w
    where not w.settled
      and w.ends_at < now()
      and coalesce(w.last_seen_bid_count, 0) = 0
      and w.ends_at - w.last_seen_at <= make_interval(mins => p_fresh_minutes)
    order by w.ends_at
    limit p_limit
    for update skip locked
  ), ins as (
    insert into public.ebay_unsold_auctions (item_id, title, category_seed, ask_price, currency, ended_at)
    select item_id, title, category_seed, last_seen_bid, 'AUD', ends_at from picked
    on conflict (item_id) do nothing
    returning 1
  )
  update public.ebay_auction_watch w set settled = true
  from picked p where w.item_id = p.item_id;
  get diagnostics v_settled = row_count;
  return v_settled;
end
$$;

revoke execute on function public.ebay_settle_free_auctions(integer, integer) from public, anon, authenticated;
grant execute on function public.ebay_settle_free_auctions(integer, integer) to service_role;
