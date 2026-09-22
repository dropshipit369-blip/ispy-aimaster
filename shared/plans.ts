/** Public packaging shared by the UI and billing service. Stripe price IDs remain server-only. */
export const PLANS = {
  free: { monthlyAmountMinor: 0, liveRequestsPerMonth: 5 },
  pro: { monthlyAmountMinor: 1900, liveRequestsPerMonth: 50 },
  unlimited: { monthlyAmountMinor: 4900, liveRequestsPerMonth: -1 },
} as const;
export const BILLING_CURRENCY = "aud";
export type Plan = keyof typeof PLANS;
