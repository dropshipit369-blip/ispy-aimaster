import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { boundedFetch, corsHeaders, HttpError, json, readBoundedBody, validateImageReference, withDeadline } from "./http.ts";

type User = { id: string; email?: string };
const users = new WeakMap<Request, User>();
export function adminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new HttpError(503, "Service configuration is incomplete. Please contact support.", "configuration_missing");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: boundedFetch } });
}
export async function requireUser(req: Request): Promise<User> {
  const cached = users.get(req);
  if (cached) return cached;
  const token = req.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) throw new HttpError(401, "Please sign in to continue.", "authentication_required");
  const { data, error } = await adminClient().auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, "Your session expired. Please sign in again.", "authentication_required");
  users.set(req, data.user);
  return data.user;
}

// Every customer route authenticates before parsing images or using paid providers.
export function secureHandler(name: string, handler: (req: Request) => Promise<Response>, maxBytes = 256 * 1024) {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    if (req.method !== "POST") return json({ error: "Use POST for this endpoint.", code: "method_not_allowed" }, 405);
    const started = performance.now();
    const requestId = crypto.randomUUID();
    return await withDeadline(AbortSignal.any([req.signal, AbortSignal.timeout(name === 'live-scan' ? 30_000 : 40_000)]), async () => {
      try {
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        const internal = name === "scrape-marketplace" && !!serviceKey && req.headers.get("authorization") === `Bearer ${serviceKey}`;
        const user = internal ? null : await requireUser(req);
        if (user) {
          const { data: allowed, error } = await adminClient().rpc("ispy_take_request_slot", { p_user_id: user.id, p_route: name });
          if (error) throw new HttpError(503, "Usage checks are unavailable. Please retry shortly.", "usage_unavailable");
          if (!allowed) return json({ error: "Too many requests. Wait a minute and retry.", code: "rate_limited" }, 429, { "Retry-After": "60" });
        }
        const length = Number(req.headers.get("content-length"));
        if (length > maxBytes) throw new HttpError(413, "This request is too large. Use a smaller image.", "payload_too_large");
        const bytes = await readBoundedBody(req.body, maxBytes);
        let body: Record<string, unknown>;
        try { body = JSON.parse(new TextDecoder().decode(bytes) || "{}"); } catch { throw new HttpError(400, "Request must contain valid JSON.", "invalid_json"); }
        if (!body || Array.isArray(body) || typeof body !== "object") throw new HttpError(400, "Request must be a JSON object.");
        for (const field of ["image", "imageUrl", "imageBase64"]) {
          if (body[field] != null) validateImageReference(body[field], Deno.env.get("SUPABASE_URL")!, field === "imageBase64");
        }
        const checked = new Request(req.url, { method: "POST", headers: req.headers, body: bytes, signal: req.signal });
        if (user) users.set(checked, user);
        let reservation: { scans_used: number; scans_limit: number } | null = null;
        const scanId = typeof body.requestId === 'string' ? body.requestId : crypto.randomUUID();
        if (name === 'live-scan' && user) {
          if (!/^[0-9a-f-]{36}$/i.test(scanId)) throw new HttpError(400, 'Invalid scan request ID.');
          if (!body.image) throw new HttpError(400, 'A scan image is required.');
          const { data, error } = await adminClient().rpc('ispy_reserve_live_scan', { p_user_id: user.id, p_request_id: scanId });
          if (error) throw new HttpError(503, 'Cannot verify your scan allowance. Retry shortly.', 'usage_unavailable');
          if (!data?.allowed) return json({ error: data?.code === 'duplicate_request' ? 'This scan was already submitted. Check its result before starting a new scan.' : 'Your live scan allowance has been reached. Review your membership to continue.', ...data }, data?.code === 'duplicate_request' ? 409 : 402);
          reservation = data;
        }
        let response: Response;
        let completed = false;
        let finalizationFailed = false;
        try {
          response = await handler(checked);
          completed = response.ok;
          if (reservation && response.ok) {
            const result = await response.json();
            response = json({ ...result, scans_used: reservation.scans_used, scans_limit: reservation.scans_limit });
          }
        } finally {
          if (reservation && user) {
            // Finalisation must survive the caller cancelling its own HTTP request.
            const { error } = await withDeadline(AbortSignal.timeout(5_000), () => adminClient().rpc('ispy_finish_live_scan', { p_user_id: user.id, p_request_id: scanId, p_success: completed }));
            finalizationFailed = !!error;
          }
        }
        if (finalizationFailed) throw new HttpError(503, 'Scan usage could not be confirmed. Contact support before retrying.', 'usage_finalization_failed');
        if (response.status >= 500) response = json({ error: "The service could not complete this request. Please retry, or contact support with the request ID.", code: "service_unavailable", request_id: requestId }, response.status);
        response.headers.set("x-request-id", requestId);
        response.headers.set("server-timing", `total;dur=${Math.round(performance.now() - started)}`);
        response.headers.set("Cache-Control", "no-store");
        console.log(JSON.stringify({ event: "api_request", route: name, status: response.status, duration_ms: Math.round(performance.now() - started), request_id: requestId }));
        return response;
      } catch (error) {
        const safe = error instanceof HttpError ? error : new HttpError(500, "The service could not complete this request. Please retry.");
        console.error(JSON.stringify({ event: "api_error", route: name, code: safe.code, request_id: requestId }));
        return json({ error: safe.message, code: safe.code, request_id: requestId }, safe.status, { "x-request-id": requestId });
      }
    });
  };
}
