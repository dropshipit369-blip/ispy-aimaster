import { callFunction } from '@/services/functions'
import type { PlanType } from '@/services/usage'

/** Response of the check-subscription edge function. `scans_limit`/`scans_used` refer to monthly AI photo IDs. */
export interface Membership {
  subscribed: boolean
  plan_type: PlanType
  scans_limit: number
  scans_used: number
  subscription_status: string
  subscription_end: string | null
  cancel_at_period_end: boolean
  billing_verification_required: boolean
}

export type PaidPlan = 'pro' | 'unlimited'

export function getMembership(): Promise<Membership> {
  return callFunction<Membership>('check-subscription', {})
}

/** Creates a Stripe Checkout session for the plan and sends the browser to it. */
export async function startCheckout(plan: PaidPlan): Promise<void> {
  const { url } = await callFunction<{ url: string }>('create-checkout', { planType: plan })
  window.location.assign(requireStripeUrl(url))
}

/** Opens the Stripe customer portal (change plan, update card, cancel, invoices). */
export async function openBillingPortal(): Promise<void> {
  const { url } = await callFunction<{ url: string }>('customer-portal', {})
  window.location.assign(requireStripeUrl(url))
}

function requireStripeUrl(value: unknown): string {
  if (typeof value === 'string') {
    try {
      const url = new URL(value)
      if (url.protocol === 'https:' && (url.hostname === 'stripe.com' || url.hostname.endsWith('.stripe.com'))) return url.href
    } catch {
      // fall through
    }
  }
  throw new Error('Billing returned an unexpected link. Please retry or contact support.')
}
