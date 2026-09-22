import { AsyncLocalStorage } from "node:async_hooks";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, idempotency-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Expose-Headers": "x-request-id, server-timing",
};

export class HttpError extends Error {
  constructor(public status: number, message: string, public code = "request_failed") { super(message); }
}

export function json(value: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(value), { status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store", ...headers } });
}

const requestContext = new AsyncLocalStorage<AbortSignal>();
export const withDeadline = <T>(signal: AbortSignal, task: () => T): T => requestContext.run(signal, task);

export async function readBoundedBody(body: ReadableStream<Uint8Array> | null, maxBytes: number): Promise<Uint8Array<ArrayBuffer>> {
  if (!body) return new Uint8Array();
  const reader = body.getReader();
  const signal = requestContext.getStore();
  const cancel = () => { void reader.cancel().catch(() => undefined); };
  signal?.addEventListener('abort', cancel, { once: true });
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      signal?.throwIfAborted();
      const { done, value } = await reader.read();
      signal?.throwIfAborted();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new HttpError(413, "This request is too large. Use a smaller image or fewer items.", "payload_too_large");
      }
      chunks.push(value);
    }
  } finally { signal?.removeEventListener('abort', cancel); reader.releaseLock(); }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
  return result;
}

// A total request deadline is inherited by every retry and downstream HTTP call.
// Buffer a bounded response so timeouts also cover the response body, not just headers.
export async function boundedFetch(input: string | URL | Request, init: RequestInit = {}, timeoutMs = 20_000): Promise<Response> {
  const signals = [AbortSignal.timeout(timeoutMs), requestContext.getStore(), init.signal].filter(Boolean) as AbortSignal[];
  try {
    const response = await fetch(input, { ...init, signal: AbortSignal.any(signals) });
    if (!response.body) return response;
    const bytes = await readBoundedBody(response.body, 8 * 1024 * 1024);
    return new Response(bytes, { status: response.status, statusText: response.statusText, headers: response.headers });
  } catch (error) {
    if (signals.some((signal) => signal.aborted)) throw new HttpError(504, "The service took too long. Please retry.", "provider_timeout");
    if (error instanceof HttpError) throw error;
    // Fetch errors can contain a provider URL with its API key in the query string.
    throw new HttpError(502, "The service could not be reached. Please retry.", "provider_unavailable");
  }
}

export function validateImageReference(value: unknown, supabaseUrl: string, rawBase64 = false): void {
  if (typeof value !== "string" || !value) throw new HttpError(400, "A valid image is required.");
  if (value.length > 7 * 1024 * 1024) throw new HttpError(413, "Image too large. Use an image under 5 MB.");
  if (rawBase64 && /^[A-Za-z0-9+/]+={0,2}$/.test(value)) return;
  if (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) return;
  let url: URL;
  try { url = new URL(value); } catch { throw new HttpError(400, "Use a JPEG, PNG or WebP image."); }
  if (url.protocol !== "https:" || url.origin !== new URL(supabaseUrl).origin || !url.pathname.startsWith("/storage/v1/object/") || url.username || url.password) {
    throw new HttpError(400, "Upload the image to iSpy before scanning it.");
  }
}
