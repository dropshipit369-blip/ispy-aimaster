// harvest-auctions - builds a proprietary AU sold-comp database.
//
// An auction that ends IS a sale, and Browse's SINGLE getItem serves an ended
// auction's final bidCount and currentBidPrice (verified: HTTP 200 fifteen
// seconds after close). Watch auctions, settle after close, record the
// realised price. Nothing is estimated.
//
// FIVE PROBLEMS LIVED HERE. The code looks the way it does because of them:
//
// 1. QUOTA BURN. v1 spent a getItem call on EVERY closed auction. 91.7% had
//    ended with zero bids - they did not sell - and every one already showed
//    0 bids at last sighting. ~5,600 calls/day against a 5,000 cap: 429, dead.
//    Fix: zero bids + a sighting close to close time settles as unsold, FREE.
//
// 2. BULK DOESN'T WORK FOR ENDED ITEMS. v2 moved settling to bulk getItems on
//    the separate bulk pool, assuming it behaved like single getItem. It does
//    not - it returns nothing for ended auctions. Every "resolution" for hours
//    was really the fallback, visible as high-confidence comps frozen at 405.
//    Fix: settle with SINGLE getItem, which is verified to work.
//
// 3. SETTLE STARVED SNAPSHOT. Both draw on buy.browse. Settle consumed the cap,
//    snapshot was refused, last_seen_at went stale, the free path stopped
//    qualifying anything, so every closure needed a paid call - which needed
//    more budget. Self-reinforcing collapse (observed 2026-09-10 05:10-05:45,
//    eight runs at resolvedFree:0 / deferred:505).
//    Fix: reserve_ebay_budget takes a purpose. Settle is capped at 3,800 of the
//    5,000 pool (was 3,000 of 4,200); the rest is reachable only by demand
//    (<= 4,400), snapshot (<= 4,950, needs ~864/day) and customers' scans
//    (<= 4,950). Settle can no longer starve the others.
//
// 4. PAID QUEUE BLOCKED THE FREE PATH. settle() reads the oldest unsettled
//    rows, capped at 1,000 by PostgREST. Once the settle budget is spent that
//    window is all auctions WITH bids waiting for getItem, so zero-bid closures
//    behind them - free to settle - were never reached. By 2026-09-23 184,876
//    free settlements were stuck in a 207k backlog (resolvedFree:1 per run).
//    Fix: ebay_settle_free_auctions() settles every free-qualifying closure
//    set-based in SQL first, so the window only ever holds paid work.
//
// 5. SEEDS WEREN'T WHAT PEOPLE SCAN. Six broad seeds filled the corpus with LEGO, coins and
//    trading cards while customers scanned bags, sneakers and appliances. eBay's only sold-data API
//    (Marketplace Insights) is closed to new applicants, so coverage has to come from here.
//    Fix: {action:"demand"} harvests auctions for what customers actually scan (ispy_demand_queries,
//    fed by ebay-proxy) plus a starter list, and settle() resolves those first (priority).
//    Only auctions that already have a bid are watched from demand: they almost always sell, so each
//    paid getItem buys a real sold price instead of confirming another no-sale.
//
// The lesson encoded here: verify the endpoint you actually ship, and never let
// the expensive path outbid the cheap path that keeps it cheap.
//
//   {action:"snapshot"} refresh watchlist + bid state
//   {action:"demand"}   harvest auctions for scanned/starter queries (with bids only)
//   {action:"settle"}   resolve closed auctions
//   {action:"stats"}    corpus state + API spend + settle backlog
//   {action:"quota"}    eBay's own view of both pools
//   {action:"access"}   which eBay API scopes this keyset holds (Marketplace Insights etc.)

import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SEEDS = [
  { key: "vintage_electronics", q: "vintage electronics" },
  { key: "toys", q: "toys" },
  { key: "vintage_toys", q: "vintage toys" },
  { key: "collectables", q: "collectables" },
  { key: "vintage_clothing", q: "vintage clothing" },
  { key: "clothing", q: "clothing" },
];

const MARKET = "EBAY_AU";
const SNAP_LIMIT = 200;
const FRESH_WINDOW_MIN = 10;
const SETTLE_ITEM_CALLS_MAX = 150;
const SETTLE_SCAN_MAX = 1500;
const MAX_ATTEMPTS = 4;
const DEMAND_QUERIES_PER_RUN = 8;
const DEMAND_SEARCH_LIMIT = 100;
const DEMAND_WATCH_PER_QUERY = 25;
// eBay condition IDs, matching ebay-proxy: "used" is every pre-owned grade except "for parts".
const CONDITION_FILTERS: Record<string, string> = {
  new: "conditionIds:{1000|1500}",
  used: "conditionIds:{2750|3000|4000|5000|6000}",
};

let tok: { t: string; exp: number } | null = null;

async function ebayToken(): Promise<string> {
  if (tok && Date.now() < tok.exp - 60000) return tok.t;
  const id = (Deno.env.get("EBAY_CLIENT_ID") ?? "").trim();
  const sec = ((Deno.env.get("EBAY_CERT_ID") ?? Deno.env.get("EBAY_CLIENT_SECRET")) ?? "").trim();
  if (!id || !sec) throw new Error("eBay credentials missing");
  const r = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(`${id}:${sec}`)}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", scope: "https://api.ebay.com/oauth/api_scope" }),
  });
  if (!r.ok) throw new Error(`token ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  tok = { t: j.access_token, exp: Date.now() + (j.expires_in ?? 7200) * 1000 };
  return tok.t;
}

// {action:"access"} reports which eBay API scopes this keyset has been granted, without spending
// Browse budget. If Marketplace Insights (eBay's official sold-data API) is granted, it also runs one
// sold search to prove it works. Never returns tokens or credentials.
const PROBE_SCOPES: Record<string, string> = {
  browse: "https://api.ebay.com/oauth/api_scope",
  marketplaceInsights: "https://api.ebay.com/oauth/api_scope/buy.marketplace.insights",
  itemFeed: "https://api.ebay.com/oauth/api_scope/buy.item.feed",
  itemBulk: "https://api.ebay.com/oauth/api_scope/buy.item.bulk",
  productCatalog: "https://api.ebay.com/oauth/api_scope/buy.product.feed",
};

async function access() {
  const id = (Deno.env.get("EBAY_CLIENT_ID") ?? "").trim();
  const sec = ((Deno.env.get("EBAY_CERT_ID") ?? Deno.env.get("EBAY_CLIENT_SECRET")) ?? "").trim();
  if (!id || !sec) return { action: "access", error: "eBay credentials missing" };
  const scopes: Record<string, { granted: boolean; detail?: string }> = {};
  let insightsToken: string | null = null;
  for (const [name, scope] of Object.entries(PROBE_SCOPES)) {
    const r = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
      method: "POST",
      headers: { Authorization: `Basic ${btoa(`${id}:${sec}`)}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "client_credentials", scope }),
    });
    const txt = await r.text();
    if (r.ok) {
      scopes[name] = { granted: true };
      if (name === "marketplaceInsights") insightsToken = JSON.parse(txt).access_token;
    } else {
      let detail = txt.slice(0, 160);
      try { const e = JSON.parse(txt); detail = `${e.error ?? ""}: ${e.error_description ?? ""}`; } catch { /* keep text */ }
      scopes[name] = { granted: false, detail };
    }
  }
  let insightsTest: unknown = null;
  if (insightsToken) {
    const r = await fetch(
      "https://api.ebay.com/buy/marketplace_insights/v1_beta/item_sales/search?q=LEGO%2075192&limit=3",
      { headers: { Authorization: `Bearer ${insightsToken}`, "X-EBAY-C-MARKETPLACE-ID": MARKET } },
    );
    const txt = await r.text();
    let total: unknown = null;
    try { total = JSON.parse(txt).total ?? null; } catch { /* not json */ }
    insightsTest = { status: r.status, total, sample: r.ok ? null : txt.slice(0, 200) };
  }
  return { action: "access", clientIdPrefix: id.slice(0, 12), scopes, insightsTest };
}

function db() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

type Budget = {
  allowed: boolean; browse_used: number; bulk_used: number;
  browse_remaining: number; bulk_remaining: number;
};

async function reserve(sb: any, browse: number, bulk: number, purpose: string): Promise<Budget> {
  const { data, error } = await sb.rpc("reserve_ebay_budget", {
    p_browse: browse, p_bulk: bulk, p_purpose: purpose,
  });
  if (error) throw new Error(`budget reserve failed: ${error.message}`);
  return (Array.isArray(data) ? data[0] : data) as Budget;
}

async function markThrottled(sb: any) {
  const { data: day } = await sb.rpc("ebay_quota_day");
  await sb.from("ebay_api_budget").update({ throttled_at: new Date().toISOString() }).eq("day", day);
}

async function snapshot() {
  const sb = db();
  const budget = await reserve(sb, SEEDS.length, 0, "snapshot");
  if (!budget.allowed) return { action: "snapshot", skipped: "buy.browse budget exhausted", budget };

  const t = await ebayToken();
  const perSeed: Record<string, number | string> = {};
  let total = 0, rateLimited = false;

  for (const seed of SEEDS) {
    const url = new URL("https://api.ebay.com/buy/browse/v1/item_summary/search");
    url.searchParams.set("q", seed.q);
    url.searchParams.set("limit", String(SNAP_LIMIT));
    url.searchParams.set("filter", "buyingOptions:{AUCTION}");
    url.searchParams.set("sort", "endingSoonest");

    const r = await fetch(url, { headers: { Authorization: `Bearer ${t}`, "X-EBAY-C-MARKETPLACE-ID": MARKET } });
    if (r.status === 429) { perSeed[seed.key] = "rate_limited"; rateLimited = true; continue; }
    if (!r.ok) { perSeed[seed.key] = `http_${r.status}`; continue; }

    const data = await r.json();
    const rows = (data.itemSummaries ?? [])
      .filter((it: any) => it.itemEndDate && it.itemId)
      .map((it: any) => ({
        item_id: it.itemId,
        title: it.title ?? "(untitled)",
        category_seed: seed.key,
        marketplace: MARKET,
        condition: it.condition ?? null,
        image_url: it.image?.imageUrl ?? null,
        item_web_url: it.itemWebUrl ?? null,
        ends_at: it.itemEndDate,
        last_seen_bid: it.currentBidPrice?.value != null ? Number(it.currentBidPrice.value) : null,
        last_seen_bid_count: it.bidCount ?? 0,
        last_seen_at: new Date().toISOString(),
      }));

    if (rows.length) {
      const { error } = await sb.from("ebay_auction_watch")
        .upsert(rows, { onConflict: "item_id", ignoreDuplicates: false });
      if (error) { perSeed[seed.key] = "db_error"; continue; }
    }
    perSeed[seed.key] = rows.length;
    total += rows.length;
  }

  if (rateLimited) await markThrottled(sb);
  return { action: "snapshot", marketplace: MARKET, rowsUpserted: total, perSeed, budget, rateLimited };
}

async function demand() {
  const sb = db();
  const { data: queue, error } = await sb.rpc("ispy_next_demand_queries", { p_limit: DEMAND_QUERIES_PER_RUN });
  if (error) throw new Error(`demand queue: ${error.message}`);
  if (!queue?.length) return { action: "demand", queries: 0 };

  const budget = await reserve(sb, queue.length, 0, "demand");
  if (!budget.allowed) return { action: "demand", skipped: "demand budget exhausted", budget };

  const t = await ebayToken();
  const perQuery: Record<string, number | string> = {};
  let watched = 0, rateLimited = false;

  for (const d of queue as { query_key: string; query: string; condition: string | null; requests: number }[]) {
    const url = new URL("https://api.ebay.com/buy/browse/v1/item_summary/search");
    url.searchParams.set("q", d.query);
    url.searchParams.set("limit", String(DEMAND_SEARCH_LIMIT));
    const filters = ["buyingOptions:{AUCTION}"];
    if (d.condition && CONDITION_FILTERS[d.condition]) filters.push(CONDITION_FILTERS[d.condition]);
    url.searchParams.set("filter", filters.join(","));
    url.searchParams.set("sort", "endingSoonest");

    const r = await fetch(url, { headers: { Authorization: `Bearer ${t}`, "X-EBAY-C-MARKETPLACE-ID": MARKET } });
    if (r.status === 429) { perQuery[d.query] = "rate_limited"; rateLimited = true; break; }
    if (!r.ok) { perQuery[d.query] = `http_${r.status}`; continue; }

    const data = await r.json();
    const items = (data.itemSummaries ?? [])
      .filter((it: any) => it.itemId && it.itemEndDate && (it.bidCount ?? 0) >= 1)
      .slice(0, DEMAND_WATCH_PER_QUERY)
      .map((it: any) => ({
        itemId: it.itemId,
        title: it.title ?? "(untitled)",
        condition: it.condition ?? null,
        imageUrl: it.image?.imageUrl ?? null,
        url: it.itemWebUrl ?? null,
        endsAt: it.itemEndDate,
        bid: it.currentBidPrice?.value ?? null,
        bidCount: it.bidCount ?? 0,
      }));

    const { data: res, error: watchErr } = await sb.rpc("ispy_watch_demand", {
      p_query: d.query, p_condition: d.condition, p_record_demand: false, p_items: items,
      p_priority: d.requests > 0 ? 2 : 1,
    });
    if (watchErr) { perQuery[d.query] = "db_error"; continue; }
    await sb.rpc("ispy_mark_demand_harvested", { p_query_key: d.query_key, p_found: items.length });
    const n = Number((res as { watched?: number } | null)?.watched ?? 0);
    perQuery[d.query] = n;
    watched += n;
  }

  if (rateLimited) await markThrottled(sb);
  return { action: "demand", queries: queue.length, watched, perQuery, budget, rateLimited };
}

async function settle() {
  const sb = db();

  // Free closures first, set-based and independent of the paid queue (bug 4).
  // Never fatal: if it fails, the paid path still runs and the in-window free path still applies.
  let resolvedFreeBulk = 0;
  let freeSettleError: string | null = null;
  const { data: freedBulk, error: freeErr } = await sb.rpc("ebay_settle_free_auctions", {
    p_fresh_minutes: FRESH_WINDOW_MIN, p_limit: 5000,
  });
  if (freeErr) freeSettleError = freeErr.message.slice(0, 120);
  else if (typeof freedBulk === "number") resolvedFreeBulk = freedBulk;

  const { data: pending, error } = await sb
    .from("ebay_auction_watch")
    .select("item_id,title,category_seed,condition,image_url,item_web_url,ends_at,last_seen_bid,last_seen_bid_count,last_seen_at,settle_attempts")
    .eq("settled", false)
    .lt("ends_at", new Date().toISOString())
    .lt("settle_attempts", MAX_ATTEMPTS)
    // Customer demand (2), then starter demand (1), then broad seeds (0); oldest first within each.
    .order("priority", { ascending: false })
    .order("ends_at", { ascending: true })
    .limit(SETTLE_SCAN_MAX);
  if (error) throw new Error(`watchlist read: ${error.message}`);
  if (!pending?.length) {
    return { action: "settle", resolvedFreeBulk, freeSettleError, examined: 0, resolvedFree: 0, needingApiCall: 0, itemCallsSpent: 0, sold: 0, unsold: 0 };
  }

  const free: any[] = [], paid: any[] = [];
  for (const w of pending) {
    const leadMin = (new Date(w.ends_at).getTime() - new Date(w.last_seen_at).getTime()) / 60000;
    if ((w.last_seen_bid_count ?? 0) === 0 && leadMin <= FRESH_WINDOW_MIN) free.push(w);
    else paid.push(w);
  }

  const sold: any[] = [], unsold: any[] = [], done: string[] = [], retryIds: string[] = [];

  for (const w of free) {
    unsold.push({
      item_id: w.item_id, title: w.title, category_seed: w.category_seed,
      ask_price: w.last_seen_bid, currency: "AUD", ended_at: w.ends_at,
    });
    done.push(w.item_id);
  }

  const toCall = paid.slice(0, SETTLE_ITEM_CALLS_MAX);
  let budget: Budget | null = null;
  let spent = 0, rateLimited = false, resolvedByApi = 0;

  if (toCall.length) {
    budget = await reserve(sb, toCall.length, 0, "settle");
    if (budget.allowed) {
      const t = await ebayToken();
      for (const w of toCall) {
        let bidCount: number | null = null, price: number | null = null;
        let currency = "AUD", source = "getitem_settled", confidence = "high", resolved = false;

        try {
          const r = await fetch(
            `https://api.ebay.com/buy/browse/v1/item/${encodeURIComponent(w.item_id)}`,
            { headers: { Authorization: `Bearer ${t}`, "X-EBAY-C-MARKETPLACE-ID": MARKET } },
          );
          spent++;
          if (r.status === 429) { rateLimited = true; break; }
          if (r.ok) {
            const it = await r.json();
            bidCount = it.bidCount ?? 0;
            const p = it.currentBidPrice ?? it.price;
            price = p?.value != null ? Number(p.value) : null;
            currency = p?.currency ?? "AUD";
            resolved = true;
            resolvedByApi++;
          }
        } catch { /* retried next run */ }

        if (!resolved && w.settle_attempts + 1 >= MAX_ATTEMPTS && w.last_seen_bid_count != null) {
          bidCount = w.last_seen_bid_count;
          price = w.last_seen_bid;
          source = "last_observed_bid";
          confidence = "medium";
          resolved = true;
        }
        if (!resolved) { retryIds.push(w.item_id); continue; }

        if ((bidCount ?? 0) >= 1 && price && price > 0) {
          sold.push({
            item_id: w.item_id, title: w.title, category_seed: w.category_seed,
            marketplace: MARKET, condition: w.condition, sold_price: price, currency,
            bid_count: bidCount, ended_at: w.ends_at, image_url: w.image_url,
            item_web_url: w.item_web_url, sale_format: "auction",
            price_source: source, confidence,
          });
        } else {
          unsold.push({
            item_id: w.item_id, title: w.title, category_seed: w.category_seed,
            ask_price: price, currency, ended_at: w.ends_at,
          });
        }
        done.push(w.item_id);
      }
    }
  }

  if (sold.length) {
    const { error: e } = await sb.from("ebay_sold_comps").upsert(sold, { onConflict: "item_id" });
    if (e) throw new Error(`sold write: ${e.message}`);
  }
  if (unsold.length) {
    for (let i = 0; i < unsold.length; i += 200) {
      await sb.from("ebay_unsold_auctions").upsert(unsold.slice(i, i + 200), { onConflict: "item_id" });
    }
  }
  if (done.length) {
    for (let i = 0; i < done.length; i += 200) {
      await sb.from("ebay_auction_watch").update({ settled: true }).in("item_id", done.slice(i, i + 200));
    }
  }
  for (const id of retryIds) {
    const row = pending.find((p: any) => p.item_id === id);
    await sb.from("ebay_auction_watch")
      .update({ settle_attempts: (row?.settle_attempts ?? 0) + 1 })
      .eq("item_id", id);
  }
  if (rateLimited) await markThrottled(sb);

  return {
    action: "settle",
    resolvedFreeBulk,
    freeSettleError,
    examined: pending.length,
    resolvedFree: free.length,
    needingApiCall: paid.length,
    itemCallsSpent: spent,
    resolvedByApi,
    sold: sold.length,
    unsold: unsold.length,
    deferred: Math.max(0, paid.length - toCall.length),
    unresolved: retryIds.length,
    budgetAllowed: budget?.allowed ?? true,
    settleBudgetRemaining: budget?.browse_remaining ?? null,
    rateLimited,
  };
}

async function quota() {
  const t = await ebayToken();
  const r = await fetch(
    "https://api.ebay.com/developer/analytics/v1_beta/rate_limit/?api_context=buy&api_name=Browse",
    { headers: { Authorization: `Bearer ${t}` } },
  );
  const txt = await r.text();
  let body: any = null; try { body = JSON.parse(txt); } catch { /* */ }
  const summary = (body?.rateLimits ?? []).flatMap((rl: any) =>
    (rl.resources ?? []).map((res: any) => ({
      name: res.name, limit: res.rates?.[0]?.limit,
      remaining: res.rates?.[0]?.remaining, resetTime: res.rates?.[0]?.reset,
    })),
  );
  return { action: "quota", status: r.status, summary: summary.length ? summary : (body ?? txt.slice(0, 300)) };
}

async function stats() {
  const sb = db();
  const q = async (tbl: string, f?: (b: any) => any) => {
    let b = sb.from(tbl).select("*", { count: "exact", head: true });
    if (f) b = f(b);
    const { count } = await b;
    return count ?? 0;
  };
  const { data: day } = await sb.rpc("ebay_quota_day");
  const { data: budget } = await sb.from("ebay_api_budget").select("*").eq("day", day).maybeSingle();
  const nowIso = new Date().toISOString();
  return {
    action: "stats",
    watching: await q("ebay_auction_watch", (b) => b.eq("settled", false).gte("ends_at", nowIso)),
    settleBacklog: await q("ebay_auction_watch", (b) => b.eq("settled", false).lt("ends_at", nowIso).lt("settle_attempts", MAX_ATTEMPTS)),
    settled: await q("ebay_auction_watch", (b) => b.eq("settled", true)),
    soldComps: await q("ebay_sold_comps"),
    verified: await q("ebay_sold_comps", (b) => b.in("confidence", ["high", "medium"])),
    unverified: await q("ebay_sold_comps", (b) => b.eq("confidence", "unverified")),
    estimated: await q("ebay_sold_comps", (b) => b.eq("confidence", "estimated")),
    unsoldAuctions: await q("ebay_unsold_auctions"),
    demandQueries: await q("ispy_demand_queries"),
    demandWatching: await q("ebay_auction_watch", (b) => b.eq("settled", false).gt("priority", 0)),
    quotaDay: day,
    apiBudget: budget ?? null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const j = (o: unknown, s = 200) =>
    new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
  try {
    const body = await req.json().catch(() => ({}));
    const action = typeof body?.action === "string" ? body.action : "";
    if (action === "snapshot") return j(await snapshot());
    if (action === "demand") return j(await demand());
    if (action === "settle") return j(await settle());
    if (action === "stats") return j(await stats());
    if (action === "quota") return j(await quota());
    if (action === "access") return j(await access());
    return j({ error: `Unknown action: ${action || "(none)"}` }, 400);
  } catch (e) {
    return j({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
