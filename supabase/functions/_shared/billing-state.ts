import { HttpError } from "./http.ts";
import { PLANS } from "../../../shared/plans.ts";

export const PLAN_LIMITS = { free: PLANS.free.liveRequestsPerMonth, pro: PLANS.pro.liveRequestsPerMonth, unlimited: PLANS.unlimited.liveRequestsPerMonth } as const;
export type Plan = keyof typeof PLAN_LIMITS;
export type PriceIds = { pro: string; unlimited: string };
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function planFromPrice(priceId: string, prices: PriceIds): Plan {
  if (prices.pro && priceId === prices.pro) return "pro";
  if (prices.unlimited && priceId === prices.unlimited) return "unlimited";
  throw new HttpError(503, "This subscription price is not configured for iSpy. Please contact support.", "billing_price_unknown");
}
export function entitlement(row: { plan_type?: string; status?: string; current_period_end?: string | null; billing_verified_at?: string | null } | null, now = Date.now()) {
  const active = !!row?.billing_verified_at && ["active", "trialing"].includes(row?.status ?? "") && Date.parse(row?.current_period_end ?? "") > now;
  const plan: Plan = active && (row?.plan_type === "pro" || row?.plan_type === "unlimited") ? row.plan_type : "free";
  return { subscribed: plan !== "free", plan_type: plan, scans_limit: PLAN_LIMITS[plan] };
}
export function subscriptionState(subscription: {
  id: string; customer: string | { id: string }; status: string; cancel_at_period_end?: boolean;
  items: { data: Array<{ price: { id: string }; current_period_start: number; current_period_end: number }> };
}, prices: PriceIds) {
  if (subscription.items.data.length !== 1) throw new HttpError(503, "This subscription requires support review.", "billing_items_invalid");
  const item = subscription.items.data[0];
  const plan = planFromPrice(item.price.id, prices);
  if (!Number.isFinite(item.current_period_start) || !Number.isFinite(item.current_period_end) || item.current_period_end < item.current_period_start) {
    throw new HttpError(503, "Subscription dates are unavailable. Please contact support.", "billing_dates_invalid");
  }
  return {
    stripe_customer_id: typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
    stripe_subscription_id: subscription.id, plan_type: plan, status: subscription.status,
    current_period_start: new Date(item.current_period_start * 1000).toISOString(),
    current_period_end: new Date(item.current_period_end * 1000).toISOString(),
    cancel_at_period_end: !!subscription.cancel_at_period_end,
  };
}
