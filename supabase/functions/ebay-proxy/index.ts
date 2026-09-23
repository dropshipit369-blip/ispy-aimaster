import { adminClient, requireUser, secureHandler } from "../_shared/security.ts";
import { boundedFetch, HttpError, json } from "../_shared/http.ts";
import { normaliseGtin } from "./gtin.ts";
/**
 * ebay-proxy — eBay API gateway (production by default; sandbox via EBAY_ENV).
 *
 * Exchanges the app's client credentials for an application access token
 * (cached in-memory until expiry) and proxies a safe, allow-listed set of
 * eBay Buy APIs. Keeps eBay credentials server-side — the client never
 * sees them.
 *
 * Every market search consumes one daily scan from the caller's plan
 * allowance (ispy_consume_market_scan). The allowance is enforced here, on the
 * server, and refunded if the eBay lookup itself fails.
 *
 * Each search also reserves one call from the shared eBay budget with purpose
 * "customer" (reserve_ebay_budget). App scans outrank the auction harvester, so
 * the harvester can no longer use up the day's eBay calls that customers need.
 *
 * Secrets (set in Supabase dashboard → Edge Functions → Secrets):
 *  - EBAY_CLIENT_ID   production App ID (Client ID)
 *  - EBAY_CERT_ID     the matching Client Secret (falls back to EBAY_CLIENT_SECRET)
 *  - EBAY_ENV         "production" (default) | "sandbox"
 *    The project's keys are production keys (harvest-auctions uses the same ones against
 *    api.ebay.com), so an unset EBAY_ENV must mean production: pointing production keys at the
 *    sandbox host fails the token grant and breaks every scan. Set EBAY_ENV=sandbox explicitly
 *    only with sandbox keys.
 *
 * Actions (POST JSON body):
 *  - { action: "search", q?: string, gtin?: string, limit?: number, marketplaceId?: string, condition?: "new" | "used" }
 *      → Browse API item_summary search (active listings) + remaining allowance.
 *        Send q (keywords), gtin (a scanned UPC/EAN/ISBN, 8–14 digits), or both.
 *      The response also carries `sold`: real eBay AU sold prices for the same item from iSpy's own
 *      sold-comps store (ispy_sold_comps_for_scan), honouring the condition filter. It costs no eBay
 *      call and no extra scan, and a failure there never fails the search (sold is then null).
 *      When there are too few sales, the query is recorded as demand (search words only, never who
 *      scanned) and any live AU auctions with bids in the results are watched, so harvest-auctions
 *      collects real sold prices for it from eBay. `soldTracking: true` says that happened.
 *  - { action: "health" }
 *      → token grant check, returns environment + expiry (does not consume a scan)
 */

interface CachedToken {
  accessToken: string;
  expiresAt: number; // epoch ms
}

interface Quota {
  allowed: boolean;
  code?: string;
  plan_type: "free" | "pro" | "unlimited";
  scans_used: number;
  scans_limit: number; // -1 = unlimited
  scans_remaining: number | null;
  usage_day: string;
  resets_at: string;
}

let tokenCache: CachedToken | null = null;

// eBay condition IDs. "used" covers every pre-owned grade except "for parts".
const CONDITION_FILTERS: Record<string, string> = {
  new: "conditionIds:{1000|1500}",
  used: "conditionIds:{2750|3000|4000|5000|6000}",
};
const MARKETPLACES = new Set(["EBAY_AU", "EBAY_US", "EBAY_GB"]);

function ebayHosts() {
  const env = (Deno.env.get("EBAY_ENV") || "production").trim().toLowerCase();
  const isProd = env !== "sandbox";
  return {
    env: isProd ? "production" : "sandbox",
    api: isProd ? "https://api.ebay.com" : "https://api.sandbox.ebay.com",
  };
}

async function getAppToken(): Promise<{ token: string; env: string }> {
  const { api, env } = ebayHosts();

  if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) {
    return { token: tokenCache.accessToken, env };
  }

  // Same lookup order as harvest-auctions, whose production token grant is proven daily.
  const clientId = Deno.env.get("EBAY_CLIENT_ID")?.trim();
  const certId = (Deno.env.get("EBAY_CERT_ID") ?? Deno.env.get("EBAY_CLIENT_SECRET"))?.trim();
  if (!clientId || !certId) {
    throw new HttpError(503, "Market data is not configured. Please contact support.", "ebay_configuration_missing");
  }

  const basic = btoa(`${clientId}:${certId}`);
  const resp = await boundedFetch(`${api}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "https://api.ebay.com/oauth/api_scope",
    }),
  });

  if (!resp.ok) {
    console.error(JSON.stringify({ event: "ebay_token_failed", status: resp.status, env }));
    throw new HttpError(503, "Market data is temporarily unavailable. Please retry shortly.", "ebay_auth_unavailable");
  }

  const data = await resp.json();
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 7200) * 1000,
  };
  return { token: tokenCache.accessToken, env };
}

async function browseSearch(params: {
  q?: string;
  gtin?: string;
  limit?: number;
  marketplaceId?: string;
  condition?: string;
}) {
  const { token } = await getAppToken();
  const { api } = ebayHosts();

  const url = new URL(`${api}/buy/browse/v1/item_summary/search`);
  if (params.q) url.searchParams.set("q", params.q.slice(0, 200));
  if (params.gtin) url.searchParams.set("gtin", params.gtin);
  url.searchParams.set("limit", String(Math.min(Math.max(params.limit ?? 10, 1), 50)));
  if (params.condition && CONDITION_FILTERS[params.condition]) {
    url.searchParams.set("filter", CONDITION_FILTERS[params.condition]);
  }

  const resp = await boundedFetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-EBAY-C-MARKETPLACE-ID": params.marketplaceId || "EBAY_AU",
    },
  });

  if (!resp.ok) {
    if (resp.status === 401) tokenCache = null;
    console.error(JSON.stringify({ event: "ebay_search_failed", status: resp.status }));
    throw new HttpError(
      resp.status === 429 ? 503 : 502,
      resp.status === 429 ? "eBay is rate-limiting market lookups. Please retry in a few minutes." : "eBay market data is temporarily unavailable. Please retry.",
      "ebay_search_unavailable",
    );
  }

  const data = await resp.json();
  const summaries = (data.itemSummaries ?? []) as Record<string, unknown>[];
  const items = summaries.map((it) => {
    const price = (it.price ?? {}) as Record<string, unknown>;
    const image = (it.image ?? {}) as Record<string, unknown>;
    return {
      itemId: it.itemId,
      title: it.title,
      price: Number(price.value ?? 0),
      currency: price.currency ?? "AUD",
      condition: it.condition ?? "Unknown",
      imageUrl: image.imageUrl ?? null,
      url: it.itemWebUrl ?? null,
      marketplace: "eBay",
    };
  });

  // Live auctions that already have a bid: they almost always sell, so watching them costs one getItem
  // per real sold price. Kept server-side for ispy_watch_demand; the client never receives this list.
  const auctions = summaries
    .filter((it) =>
      Array.isArray(it.buyingOptions) && (it.buyingOptions as unknown[]).includes("AUCTION") &&
      typeof it.itemEndDate === "string" && Number(it.bidCount ?? 0) >= 1
    )
    .map((it) => {
      const bid = (it.currentBidPrice ?? {}) as Record<string, unknown>;
      const image = (it.image ?? {}) as Record<string, unknown>;
      return {
        itemId: it.itemId,
        title: it.title,
        condition: it.condition ?? null,
        imageUrl: image.imageUrl ?? null,
        url: it.itemWebUrl ?? null,
        endsAt: it.itemEndDate,
        bid: bid.value ?? null,
        bidCount: Number(it.bidCount ?? 0),
      };
    });

  return { total: data.total ?? items.length, items, auctions };
}

const TRACK_TIMEOUT_MS = 1_500;

/**
 * Feeds the sold-price harvester from a customer's scan. Records the query as demand when iSpy has too
 * few sales for it, and watches any AU auctions with bids from the results. Returns true only when the
 * demand was actually recorded. Best effort: never fails or slows the scan beyond TRACK_TIMEOUT_MS.
 */
async function trackForSoldPrices(
  db: ReturnType<typeof adminClient>,
  query: string,
  condition: string | undefined,
  recordDemand: boolean,
  auctions: unknown[],
): Promise<boolean> {
  if (!recordDemand && auctions.length === 0) return false;
  const call = db.rpc("ispy_watch_demand", {
    p_query: query.slice(0, 200),
    p_condition: condition ?? null,
    p_record_demand: recordDemand,
    p_items: auctions,
    p_priority: 2,
  }).then(({ data, error }) => {
    if (error) {
      console.error(JSON.stringify({ event: "sold_tracking_failed", code: error.code }));
      return false;
    }
    return (data as { recorded?: boolean } | null)?.recorded === true;
  });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<boolean>((resolve) => {
    timer = setTimeout(() => resolve(false), TRACK_TIMEOUT_MS);
  });
  try {
    return await Promise.race([call, timeout]);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

const SOLD_LOOKUP_TIMEOUT_MS = 2_500;

/** Sold prices for a query from the sold-comps store. Best effort: null on error, timeout or no query. */
async function soldComps(
  db: ReturnType<typeof adminClient>,
  query: string,
  condition: string | undefined,
): Promise<Record<string, unknown> | null> {
  const q = query.trim();
  if (!q) return null;
  const params = { p_query: q.slice(0, 200), p_window_days: 365, p_condition: condition ?? null };
  const lookup = db.rpc("ispy_sold_comps_for_scan", params).then(({ data, error }) => {
    if (error) {
      console.error(JSON.stringify({ event: "sold_comps_failed", code: error.code }));
      return null;
    }
    return (data ?? null) as Record<string, unknown> | null;
  });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), SOLD_LOOKUP_TIMEOUT_MS);
  });
  try {
    return await Promise.race([lookup, timeout]);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function publicQuota(q: Quota) {
  return {
    plan_type: q.plan_type,
    scans_used: q.scans_used,
    scans_limit: q.scans_limit,
    scans_remaining: q.scans_remaining,
    resets_at: q.resets_at,
  };
}

Deno.serve(secureHandler("ebay-proxy", async (req: Request) => {
  const body = await req.json().catch(() => ({}));
  const action = typeof body?.action === "string" ? body.action : "";

  if (action === "health") {
    const { env } = await getAppToken();
    return json({
      ok: true,
      environment: env,
      tokenExpiresInMs: tokenCache ? tokenCache.expiresAt - Date.now() : 0,
    });
  }

  if (action === "search") {
    const q = typeof body?.q === "string" ? body.q.trim() : "";
    const gtinInput = typeof body?.gtin === "string" && body.gtin.trim() ? body.gtin : null;
    const gtin = gtinInput ? normaliseGtin(gtinInput) : null;
    if (gtinInput && !gtin) throw new HttpError(400, "That barcode number isn't valid. Check the digits under the barcode and retry.", "gtin_invalid");
    if (!q && !gtin) throw new HttpError(400, "Enter an item to scan.", "query_required");
    if (q.length > 200) throw new HttpError(400, "Keep the search under 200 characters.", "query_too_long");
    const condition = body?.condition === "new" || body?.condition === "used" ? body.condition : undefined;
    const marketplaceId = typeof body?.marketplaceId === "string" && MARKETPLACES.has(body.marketplaceId) ? body.marketplaceId : undefined;

    const user = await requireUser(req);
    const db = adminClient();
    const { data: quota, error: quotaError } = await db.rpc("ispy_consume_market_scan", { p_user_id: user.id });
    if (quotaError || !quota) throw new HttpError(503, "Your scan allowance could not be checked. Please retry.", "usage_unavailable");
    const allowance = quota as Quota;
    if (!allowance.allowed) {
      return json({
        error: allowance.plan_type === "free"
          ? "You've used today's 3 free scans. Upgrade for more, or scan again after midnight (Melbourne time)."
          : "You've reached today's scan limit for your plan. It resets at midnight (Melbourne time).",
        code: "scan_limit_reached",
        ...publicQuota(allowance),
      }, 402);
    }

    // Reserve this search's eBay call from the customer share of the daily budget. Fail open on a
    // budget-store error: the table is a guard, eBay itself remains the hard limit.
    const { data: slot, error: slotError } = await db.rpc("reserve_ebay_budget", {
      p_browse: 1, p_bulk: 0, p_purpose: "customer",
    });
    const reserved = Array.isArray(slot) ? slot[0] : slot;
    if (slotError) {
      console.error(JSON.stringify({ event: "ebay_budget_unavailable", route: "ebay-proxy" }));
    } else if (reserved && reserved.allowed === false) {
      await db.rpc("ispy_refund_market_scan", { p_user_id: user.id, p_usage_day: allowance.usage_day });
      console.error(JSON.stringify({ event: "ebay_customer_budget_exhausted" }));
      return json({
        error: "Live eBay prices have hit today's limit. They're back after 5pm AEST (6pm AEDT). This scan wasn't counted.",
        code: "market_capacity_reached",
      }, 429, { "Retry-After": "3600" });
    }

    try {
      // Sold prices are looked up alongside the live search, so they add no wait. Barcode-only scans
      // skip them: the only words available are a random seller's title, which is too noisy to match.
      const soldForQuery = q ? soldComps(db, q, condition) : Promise.resolve(null);
      const result = await browseSearch({
        q: q || undefined,
        gtin: gtin ?? undefined,
        limit: typeof body?.limit === "number" ? body.limit : undefined,
        marketplaceId,
        condition,
      });
      const sold = await soldForQuery;
      const { auctions, ...publicResult } = result;
      // Only AU keyword scans feed the AU sold-price store. "insufficient_query" (one word) is a
      // category, not an item, so it is never recorded as demand.
      const isAu = !marketplaceId || marketplaceId === "EBAY_AU";
      const soldTracking = q && isAu
        ? await trackForSoldPrices(db, q, condition, (sold as { status?: string } | null)?.status === "insufficient_data", auctions)
        : false;
      return json({ ...publicResult, sold, soldTracking, quota: publicQuota(allowance) });
    } catch (error) {
      // The user should not lose a scan because eBay or our token grant failed.
      const { error: refundError } = await db.rpc("ispy_refund_market_scan", { p_user_id: user.id, p_usage_day: allowance.usage_day });
      if (refundError) console.error(JSON.stringify({ event: "market_scan_refund_failed", user_id: user.id }));
      throw error;
    }
  }

  throw new HttpError(400, `Unknown action: ${action || "(none)"}`, "unknown_action");
}, 256 * 1024));
