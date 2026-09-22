import { adminClient, requireUser, secureHandler } from "../_shared/security.ts";
import { boundedFetch, HttpError, json } from "../_shared/http.ts";
/**
 * ebay-proxy — eBay API gateway (sandbox/production switchable).
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
 * Secrets (set in Supabase dashboard → Edge Functions → Secrets):
 *  - EBAY_CLIENT_ID   e.g. joelmcvi-ispyai-SBX-...
 *  - EBAY_CERT_ID     the matching Client Secret (EBAY_CLIENT_SECRET also accepted)
 *  - EBAY_ENV         "sandbox" (default) | "production"
 *
 * Actions (POST JSON body):
 *  - { action: "search", q: string, limit?: number, marketplaceId?: string, condition?: "new" | "used" }
 *      → Browse API item_summary search (active listings) + remaining allowance
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
  const env = (Deno.env.get("EBAY_ENV") || "sandbox").toLowerCase();
  const isProd = env === "production";
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

  const clientId = Deno.env.get("EBAY_CLIENT_ID");
  const certId = Deno.env.get("EBAY_CLIENT_SECRET") ?? Deno.env.get("EBAY_CERT_ID");
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
  q: string;
  limit?: number;
  marketplaceId?: string;
  condition?: string;
}) {
  const { token } = await getAppToken();
  const { api } = ebayHosts();

  const url = new URL(`${api}/buy/browse/v1/item_summary/search`);
  url.searchParams.set("q", params.q.slice(0, 200));
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
  const items = (data.itemSummaries ?? []).map((it: Record<string, unknown>) => {
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

  return { total: data.total ?? items.length, items };
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
    if (!q) throw new HttpError(400, "Enter an item to scan.", "query_required");
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

    try {
      const result = await browseSearch({
        q,
        limit: typeof body?.limit === "number" ? body.limit : undefined,
        marketplaceId,
        condition,
      });
      return json({ ...result, quota: publicQuota(allowance) });
    } catch (error) {
      // The user should not lose a scan because eBay or our token grant failed.
      const { error: refundError } = await db.rpc("ispy_refund_market_scan", { p_user_id: user.id, p_usage_day: allowance.usage_day });
      if (refundError) console.error(JSON.stringify({ event: "market_scan_refund_failed", user_id: user.id }));
      throw error;
    }
  }

  throw new HttpError(400, `Unknown action: ${action || "(none)"}`, "unknown_action");
}, 256 * 1024));
