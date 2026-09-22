-- Server-side market-scan quota.
-- Replaces the browser-enforced profiles.scans_today counter, which (a) never reset,
-- so free users were locked out permanently after 3 lifetime scans, (b) was only
-- checked client-side, and (c) ignored paid plans because Stripe state lives in
-- user_subscriptions, not profiles.plan.

create table if not exists public.ispy_market_scan_usage (
  user_id    uuid    not null references auth.users(id) on delete cascade,
  usage_day  date    not null,
  scan_count integer not null default 0 check (scan_count >= 0),
  primary key (user_id, usage_day)
);
alter table public.ispy_market_scan_usage enable row level security;
revoke all on public.ispy_market_scan_usage from anon, authenticated;
grant select on public.ispy_market_scan_usage to authenticated;
drop policy if exists ispy_select on public.ispy_market_scan_usage;
create policy ispy_select on public.ispy_market_scan_usage
  for select to authenticated using ((select auth.uid()) = user_id);

-- "Today" for quota purposes is the Melbourne calendar day (AU-first product).
create or replace function public.ispy_au_today()
returns date language sql stable set search_path = '' as
$$ select (now() at time zone 'Australia/Melbourne')::date $$;

create or replace function public.ispy_au_next_reset()
returns timestamptz language sql stable set search_path = '' as
$$ select ((public.ispy_au_today() + 1)::timestamp at time zone 'Australia/Melbourne') $$;

-- Same entitlement rule as billing-state.ts entitlement() and ispy_reserve_live_scan:
-- only Stripe-verified, active/trialing, unexpired subscriptions grant a paid plan.
create or replace function public.ispy_current_plan(p_user_id uuid)
returns text language sql stable security definer set search_path = '' as
$$
  select coalesce((
    select s.plan_type from public.user_subscriptions s
    where s.user_id = p_user_id
      and s.status in ('active','trialing')
      and s.billing_verified_at is not null
      and s.current_period_end > now()
      and s.plan_type in ('pro','unlimited')
  ), 'free')
$$;

create or replace function public.ispy_market_scan_cap(p_plan text)
returns integer language sql immutable set search_path = '' as
$$ select case p_plan when 'unlimited' then -1 when 'pro' then 50 else 3 end $$;

-- Atomic check-and-consume. Called only by the ebay-proxy edge function (service role).
create or replace function public.ispy_consume_market_scan(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as
$$
declare
  v_plan text; v_cap integer; v_used integer;
  v_day date := public.ispy_au_today();
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 812));
  v_plan := public.ispy_current_plan(p_user_id);
  v_cap  := public.ispy_market_scan_cap(v_plan);
  insert into public.ispy_market_scan_usage(user_id, usage_day, scan_count)
    values (p_user_id, v_day, 0) on conflict (user_id, usage_day) do nothing;
  select scan_count into v_used from public.ispy_market_scan_usage
    where user_id = p_user_id and usage_day = v_day for update;
  if v_cap >= 0 and v_used >= v_cap then
    return jsonb_build_object('allowed', false, 'code', 'scan_limit_reached',
      'plan_type', v_plan, 'scans_used', v_used, 'scans_limit', v_cap,
      'scans_remaining', 0, 'usage_day', v_day, 'resets_at', public.ispy_au_next_reset());
  end if;
  update public.ispy_market_scan_usage set scan_count = scan_count + 1
    where user_id = p_user_id and usage_day = v_day;
  return jsonb_build_object('allowed', true, 'plan_type', v_plan,
    'scans_used', v_used + 1, 'scans_limit', v_cap,
    'scans_remaining', case when v_cap < 0 then null else greatest(v_cap - v_used - 1, 0) end,
    'usage_day', v_day, 'resets_at', public.ispy_au_next_reset());
end
$$;

-- Give a scan back when the eBay lookup itself failed (user should not pay for our outage).
create or replace function public.ispy_refund_market_scan(p_user_id uuid, p_usage_day date)
returns void language plpgsql security definer set search_path = '' as
$$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 812));
  update public.ispy_market_scan_usage set scan_count = greatest(scan_count - 1, 0)
    where user_id = p_user_id and usage_day = p_usage_day;
end
$$;

-- Read-only status for the signed-in caller. Takes no user id, so it cannot be pointed at someone else.
create or replace function public.ispy_market_scan_status()
returns jsonb language plpgsql stable security definer set search_path = '' as
$$
declare
  v_uid uuid := auth.uid(); v_plan text; v_cap integer; v_used integer;
begin
  if v_uid is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;
  v_plan := public.ispy_current_plan(v_uid);
  v_cap  := public.ispy_market_scan_cap(v_plan);
  select coalesce((select scan_count from public.ispy_market_scan_usage
                   where user_id = v_uid and usage_day = public.ispy_au_today()), 0)
    into v_used;
  return jsonb_build_object('plan_type', v_plan, 'scans_used', v_used, 'scans_limit', v_cap,
    'scans_remaining', case when v_cap < 0 then null else greatest(v_cap - v_used, 0) end,
    'resets_at', public.ispy_au_next_reset());
end
$$;

-- Lock down EXECUTE. Supabase default privileges grant new functions to anon/authenticated.
revoke execute on function public.ispy_current_plan(uuid)              from public, anon, authenticated;
revoke execute on function public.ispy_consume_market_scan(uuid)       from public, anon, authenticated;
revoke execute on function public.ispy_refund_market_scan(uuid, date)  from public, anon, authenticated;
revoke execute on function public.ispy_market_scan_status()            from public, anon;
grant  execute on function public.ispy_consume_market_scan(uuid)       to service_role;
grant  execute on function public.ispy_refund_market_scan(uuid, date)  to service_role;
grant  execute on function public.ispy_current_plan(uuid)              to service_role;
grant  execute on function public.ispy_market_scan_status()            to authenticated;

-- The legacy client-side counter is superseded; nothing in the new frontend calls it.
revoke execute on function public.increment_scan_count(uuid) from authenticated;
