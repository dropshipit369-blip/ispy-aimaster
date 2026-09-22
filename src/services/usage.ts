import { supabase } from '@/lib/supabase'

export type PlanType = 'free' | 'pro' | 'unlimited'

/** Today's market-scan allowance, enforced server-side and reset at midnight Melbourne time. */
export interface ScanAllowance {
  plan_type: PlanType
  scans_used: number
  /** -1 means unlimited. */
  scans_limit: number
  /** null means unlimited. */
  scans_remaining: number | null
  resets_at: string
}

export async function getScanAllowance(): Promise<ScanAllowance> {
  const { data, error } = await supabase.rpc('ispy_market_scan_status')
  if (error || !data) throw new Error('Could not load your scan allowance. Please retry.')
  return data as ScanAllowance
}

export function isUnlimited(allowance: Pick<ScanAllowance, 'scans_limit'>): boolean {
  return allowance.scans_limit < 0
}

export function allowanceFromDetails(details: Record<string, unknown>): ScanAllowance | null {
  const plan = details.plan_type
  if (plan !== 'free' && plan !== 'pro' && plan !== 'unlimited') return null
  if (typeof details.scans_limit !== 'number' || typeof details.scans_used !== 'number' || typeof details.resets_at !== 'string') return null
  return {
    plan_type: plan,
    scans_used: details.scans_used,
    scans_limit: details.scans_limit,
    scans_remaining: typeof details.scans_remaining === 'number' ? details.scans_remaining : null,
    resets_at: details.resets_at,
  }
}

export const PLAN_LABELS: Record<PlanType, string> = {
  free: 'Free',
  pro: 'Pro',
  unlimited: 'Unlimited',
}
