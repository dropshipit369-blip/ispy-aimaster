import Stripe from "https://esm.sh/stripe@18.5.0";
import { adminClient } from "./security.ts";
import { boundedFetch, HttpError } from "./http.ts";
import { type PriceIds, UUID } from "./billing-state.ts";
export { Stripe };

export function stripeClient() {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new HttpError(503, "Billing is not configured. Please contact support.", "billing_unavailable");
  return new Stripe(key, { apiVersion: "2025-08-27.basil", httpClient: Stripe.createFetchHttpClient(boundedFetch), maxNetworkRetries: 0, timeout: 15_000 });
}
export function priceIds(): PriceIds {
  const pro = Deno.env.get("STRIPE_PRO_PRICE_ID") ?? "";
  const unlimited = Deno.env.get("STRIPE_UNLIMITED_PRICE_ID") ?? "";
  if (![pro, unlimited].every((p) => /^price_[a-zA-Z0-9]+$/.test(p)) || pro === unlimited) {
    throw new HttpError(503, "Billing plans are not configured. Please contact support.", "billing_unavailable");
  }
  return { pro, unlimited };
}

// The production web app. Checkout/portal return here unless the request came from another approved origin.
const PRODUCTION_APP_ORIGIN = "https://ispy-ai1-main.vercel.app";

function httpsOrigin(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Where Stripe sends the customer back to. Uses the caller's browser Origin only when it is on the allowlist
 * (APP_URL, APP_ALLOWED_ORIGINS, the production app), so return URLs can never be pointed at another site.
 */
export function appOrigin(req?: Request): string {
  const configured = httpsOrigin(Deno.env.get("APP_URL") ?? PRODUCTION_APP_ORIGIN);
  if (!configured) throw new HttpError(503, "Billing return URL is not configured.", "billing_unavailable");
  const allowed = new Set<string>([configured, PRODUCTION_APP_ORIGIN]);
  for (const extra of (Deno.env.get("APP_ALLOWED_ORIGINS") ?? "").split(",")) {
    const origin = extra ? httpsOrigin(extra) : null;
    if (origin) allowed.add(origin);
  }
  const requested = req?.headers.get("origin");
  if (requested && allowed.has(requested)) return requested;
  return configured;
}
export async function ownedCustomer(stripe: Stripe, userId: string): Promise<string | null> {
  const { data, error } = await adminClient().from("user_subscriptions").select("stripe_customer_id,billing_verified_at").eq("user_id", userId).maybeSingle();
  if (error) throw new HttpError(503, "Billing records are unavailable. Please retry.", "billing_unavailable");
  if (!data?.stripe_customer_id) return null;
  const customer = await stripe.customers.retrieve(data.stripe_customer_id);
  if (customer.deleted) throw new HttpError(409, "Your billing account needs support review.", "billing_identity_unverified");
  // Historical rows were user-writable. Never bind an account by email or that row alone.
  if (customer.metadata.user_id !== userId && !data.billing_verified_at) throw new HttpError(409, "Your billing account needs verification. Please contact support.", "billing_identity_unverified");
  if (customer.metadata.user_id && customer.metadata.user_id !== userId) throw new HttpError(409, "Your billing account needs support review.", "billing_identity_unverified");
  return customer.id;
}
export function verifiedUserId(...candidates: Array<string | null | undefined>): string {
  const present = candidates.filter((id): id is string => !!id);
  if (!present.length || present.some((id) => !UUID.test(id) || id !== present[0])) throw new HttpError(409, "Billing identity could not be verified.", "billing_identity_unverified");
  return present[0];
}
