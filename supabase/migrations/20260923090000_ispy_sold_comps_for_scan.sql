-- Customer-facing sold prices for a scan.
--
-- match_sold_comps/sold_comp_summary were built for AI prompts: loose trigram matching over up to 60
-- rows (4 s, and "Pink Floyd Dark Side of the Moon vinyl" matched Star Wars trading cards). A price
-- shown to a buyer must be strict, so this function:
--   * requires every model-number-like token (has a digit, 3+ chars: 75192, 1966, 501) to appear;
--   * requires the comp title to contain all specific query tokens when the query has 1-3 of them,
--     otherwise all but floor(n/4) (so "LV Speedy 30 Monogram" can't drift to other models);
--   * drops lots, bundles, parts, stands, manuals, empty boxes etc. unless the query asks for them;
--   * prefers confirmed auction results, then any observed sale, then Best Offer estimates, and
--     labels which basis it used;
--   * is fast: the GIN index is probed with only the rarest tokens a match must contain
--     (planner element stats pick them), so no full scan of common tokens like "lego".
-- Correctness does not depend on the frequency estimate: any match missing at most m specific
-- tokens must contain at least one of any m+1 of them.

create or replace function public.ispy_sold_comps_for_scan(
  p_query text,
  p_window_days integer default 365,
  p_condition text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_all text[] := public.ebay_significant_tokens(left(coalesce(p_query, ''), 200));
  v_generic text[] := public.ebay_generic_tokens();
  v_excluders constant text[] := array[
    'lot','lots','bundle','joblot','job','bulk','bulkbuy','parts','spares','spare','repair','faulty','broken',
    'stand','display','case','cover','manual','manuals','instructions','booklet','sticker','stickers','decal',
    'poster','replacement','compatible','custom','moc','led','lighting','empty','only','reproduction','replica',
    'fake','keyring','keychain','magnet','patch','print','photo','cardboard','packaging',
    -- graded cards and sealed product are different markets from a raw single
    'psa','cgc','bgs','graded','booster',
    -- accessories sold under the product's name
    'charger','cable','controller','controllers','remote','skin','headset','dock','strap','lens','protector',
    -- variants that change the price ("iPhone 13" must not include Pro/Max/Mini sales)
    'pro','max','mini','plus','ultra','lite','slim'];
  v_codes text[];
  v_flex text[];
  v_specific text[];
  v_models text[];
  v_n int;
  v_allow_missing int;
  v_probe text[];
  v_cond text := lower(coalesce(p_condition, ''));
  v_result jsonb;
begin
  select coalesce(array_agg(t), '{}') into v_specific
  from unnest(v_all) t where not (t = any(v_generic));

  -- Letter+digit codes written without a separator ("wm10", "ps5") are matched as flexible codes,
  -- because sellers also write them "WM-10" / "PS 5", which the tokenizer splits and drops.
  select coalesce(array_agg(t), '{}') into v_flex from unnest(v_specific) t where t ~ '^[a-z]{1,4}[0-9]{1,6}$';
  select coalesce(array_agg(t), '{}') into v_specific from unnest(v_specific) t where not (t = any(v_flex));

  -- Short or hyphenated codes ("WM-10", "Speedy 30", "Air Max 90") are dropped by the 3-character
  -- tokenizer, so require them as whole codes in the raw title: "WM-10" matches WM10 / WM-10 / WM 10,
  -- not WM-100. Only letters and digits reach the pattern, so user text can't inject regex syntax.
  select coalesce(array_agg(distinct rx), '{}') into v_codes
  from (
    select '\m' || lower(m[1]) || case when m[1] <> '' then '[- ]?' else '' end || m[2] || '(?![0-9])' as rx
    from regexp_matches(left(coalesce(p_query, ''), 200), '(?:^|[^A-Za-z0-9])([A-Za-z]{0,4})-?([0-9]{1,6})(?![0-9])', 'g') as m
    where (m[1] = '' and length(m[2]) < 3) or m[1] <> ''
    union
    select '\m' || substring(f from '^[a-z]+') || '[- ]?' || substring(f from '[0-9]+$') || '(?![0-9])'
    from unnest(v_flex) f
  ) x;

  v_n := coalesce(array_length(v_specific, 1), 0);
  select coalesce(array_agg(t), '{}') into v_models from unnest(v_specific) t where t ~ '[0-9]';

  -- Need at least one indexable word, and two terms in all: one word or one code ("lego", "PS5")
  -- describes a category, not an item, and its median would mislead.
  if v_n = 0 or v_n + coalesce(array_length(v_codes, 1), 0) < 2 then
    return jsonb_build_object('status', 'insufficient_query');
  end if;
  -- Up to 6 specific words must all match; long titles (barcode/eBay wording) may miss 1 in 7-10.
  v_allow_missing := case when v_n <= 6 then 0 else (v_n - 3) / 4 end;

  -- GIN probe. Every model token is mandatory, so the rarest one alone is a correct probe.
  -- Otherwise use the pigeonhole rule: a match missing at most m words contains one of any m+1 of
  -- them, so the m+1 rarest words (by planner element statistics) are a correct, selective probe.
  select array_agg(t order by f, t) into v_probe
  from (
    select t, coalesce((
      select s.most_common_elem_freqs[array_position(s.most_common_elems::text::text[], t)]
      from pg_stats s
      where s.schemaname = 'public' and s.tablename = 'ebay_sold_comps' and s.attname = 'title_tokens'
    ), 0) as f
    from unnest(case when array_length(v_models, 1) > 0 then v_models else v_specific end) t
  ) x;
  v_probe := case when array_length(v_models, 1) > 0 then v_probe[1:1] else v_probe[1:v_allow_missing + 1] end;

  with cand as (
    select c.item_id, c.title, c.sold_price, c.ended_at, c.item_web_url, c.confidence, c.sale_format,
           c.title_tokens, c.condition
    from public.ebay_sold_comps c
    where c.title_tokens && v_probe
      and c.ended_at > now() - make_interval(days => greatest(30, least(p_window_days, 730)))
      and c.sold_price > 0
      and coalesce(c.currency, 'AUD') = 'AUD'
    -- Broad word-only probes ("star wars") can hit 10k+ rows: score the most recent 5,000, which are
    -- also the most relevant to today's price. Model-number probes are selective and rarely reach this.
    order by c.ended_at desc
    limit 5000
  ),
  scored as (
    select c.*,
           (select count(*) from unnest(v_specific) q where q = any(c.title_tokens))::int as shared
    from cand c
  ),
  matched as (
    select s.*,
           case when s.confidence in ('high', 'medium') then 1
                when s.confidence = 'unverified' then 2
                else 3 end as tier
    from scored s
    where s.shared >= v_n - v_allow_missing
      and v_models <@ s.title_tokens
      and not exists (select 1 from unnest(v_codes) rx where lower(s.title) !~ rx)
      and not exists (
        select 1 from unnest(s.title_tokens) t
        where t = any(v_excluders) and not (t = any(v_all))
      )
      -- Honour the scan's condition filter; comps with no stated condition are kept.
      and not (v_cond = 'used' and coalesce(s.condition, '') ~* '^\s*(brand\s+)?new\M(?!\s*[-(]?\s*other)')
      and not (v_cond = 'new' and coalesce(s.condition, '') ~* '(used|pre-?owned|like\s+new|very\s+good|good|acceptable|for\s+parts|refurbished)')
  ),
  counts as (
    select count(*) filter (where tier = 1) as n1,
           count(*) filter (where tier <= 2) as n2,
           count(*) as n3
    from matched
  ),
  chosen as (
    select case when n1 >= 3 then 1 when n2 >= 3 then 2 when n3 >= 3 then 3 end as max_tier, n1, n2, n3
    from counts
  ),
  basis_rows as (
    select m.* from matched m, chosen ch where ch.max_tier is not null and m.tier <= ch.max_tier
  ),
  stats as (
    select count(*) as n,
           round(percentile_cont(0.5) within group (order by sold_price)::numeric, 2) as median,
           round(percentile_cont(0.25) within group (order by sold_price)::numeric, 2) as p25,
           round(percentile_cont(0.75) within group (order by sold_price)::numeric, 2) as p75,
           min(ended_at) as oldest, max(ended_at) as newest,
           count(*) filter (where tier = 1) as confirmed
    from basis_rows
  ),
  recent as (
    select coalesce(jsonb_agg(jsonb_build_object(
             'title', r.title, 'price', r.sold_price, 'endedAt', r.ended_at,
             'url', r.item_web_url, 'format', r.sale_format,
             'basis', case r.tier when 1 then 'confirmed' when 2 then 'observed' else 'estimated' end)
           order by r.ended_at desc), '[]'::jsonb) as items
    from (select * from basis_rows order by ended_at desc limit 5) r
  )
  select case when ch.max_tier is null then
           jsonb_build_object('status', 'insufficient_data', 'matched', ch.n3)
         else jsonb_build_object(
           'status', 'ok',
           'basis', case ch.max_tier when 1 then 'confirmed' when 2 then 'observed' else 'estimated' end,
           'count', st.n,
           'confirmedCount', st.confirmed,
           'median', st.median, 'p25', st.p25, 'p75', st.p75,
           'oldest', st.oldest, 'newest', st.newest,
           -- A p75 over 3x the p25 means the matches cover different variants/grades.
           'wideSpread', st.p25 > 0 and st.p75 / st.p25 > 3,
           'windowDays', greatest(30, least(p_window_days, 730)),
           'condition', nullif(v_cond, ''),
           'currency', 'AUD', 'marketplace', 'EBAY_AU',
           'recent', rc.items)
         end
  into v_result
  from chosen ch, stats st, recent rc;

  return v_result;
end;
$$;

drop function if exists public.ispy_sold_comps_for_scan(text, integer);
revoke all on function public.ispy_sold_comps_for_scan(text, integer, text) from public, anon, authenticated;
grant execute on function public.ispy_sold_comps_for_scan(text, integer, text) to service_role;
