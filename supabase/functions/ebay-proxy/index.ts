/**
 * ebay-proxy — eBay API gateway (sandbox/production switchable).
 *
 * Exchanges the app's client credentials for an application access token
 * (cached in-memory until expiry) and proxies a safe, allow-listed set of
 * eBay Buy APIs. Keeps eBay credentials server-side — the client never
 * sees them.
 *
 * Secrets (set in Supabase dashboard → Edge Functions → Secrets):
 *  - EBAY_CLIENT_ID   e.g. joelmcvi-ispyai-SBX-...
 *  - EBAY_CERT_ID     the matching Client Secret
 *  - EBAY_ENV         "sandbox" (default) | "production"
 *
 * Actions (POST JSON body):
 *  - { action: "search", q: string, limit?: number, marketplaceId?: string }
 *      → Browse API item_summary search (active listings)
 *  - { action: "health" }
 *      → token grant check, returns environment + expiry
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CachedToken {
  accessToken: string;
  expiresAt: number; // epoch ms
}

let tokenCache: CachedToken | null = null;

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
  const certId = Deno.env.get("EBAY_CERT_ID");
  if (!clientId || !certId) {
    throw new Error("EBAY_CLIENT_ID / EBAY_CERT_ID secrets are not configured");
  }

  const basic = btoa(`${clientId}:${certId}`);
  const resp = await fetch(`${api}/identity/v1/oauth2/token`, {
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
    const text = await resp.text();
    throw new Error(`eBay token grant failed (${resp.status}): ${text.slice(0, 200)}`);
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
}) {
  const { token } = await getAppToken();
  const { api } = ebayHosts();

  const url = new URL(`${api}/buy/browse/v1/item_summary/search`);
  url.searchParams.set("q", params.q.slice(0, 200));
  url.searchParams.set("limit", String(Math.min(Math.max(params.limit ?? 10, 1), 50)));

  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-EBAY-C-MARKETPLACE-ID": params.marketplaceId || "EBAY_AU",
    },
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Browse search failed (${resp.status}): ${text.slice(0, 200)}`);
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = typeof body?.action === "string" ? body.action : "";

    if (action === "health") {
      const { env } = await getAppToken();
      return new Response(
        JSON.stringify({
          ok: true,
          environment: env,
          tokenExpiresInMs: tokenCache ? tokenCache.expiresAt - Date.now() : 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "search") {
      const q = typeof body?.q === "string" ? body.q.trim() : "";
      if (!q) {
        return new Response(JSON.stringify({ error: "q is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const result = await browseSearch({
        q,
        limit: typeof body?.limit === "number" ? body.limit : undefined,
        marketplaceId: typeof body?.marketplaceId === "string" ? body.marketplaceId : undefined,
      });
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action || "(none)"}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
