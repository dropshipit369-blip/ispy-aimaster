import { supabase } from '@/lib/supabase'
import type { ScanResponse } from '@/types/ebay'

/** Persist a scan result to Supabase */
export async function saveScan(userId: string, scan: ScanResponse) {
  const { error } = await supabase.from('scans').insert({
    user_id: userId,
    query: scan.query,
    results: scan.items,
    total_value: scan.items.reduce(
      (sum, i) => sum + parseFloat(i.estimatedValue.replace('$', '')),
      0,
    ),
    item_count: scan.items.length,
  })
  if (error) console.error('[iSpy] Failed to save scan:', error.message)
}

/** Fetch the user's scan history */
export async function getScanHistory(userId: string, limit = 20) {
  const { data, error } = await supabase
    .from('scans')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[iSpy] Failed to fetch scan history:', error.message)
    return []
  }
  return data ?? []
}

/** Increment the user's daily scan count */
export async function incrementScanCount(userId: string) {
  const { error } = await supabase.rpc('increment_scan_count', { uid: userId })
  if (error) console.error('[iSpy] Failed to increment scan count:', error.message)
}

/** Get the user's remaining scans today */
export async function getRemainingScans(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('scans_today, scans_limit')
    .eq('id', userId)
    .single()

  if (error || !data) return { used: 0, limit: 3, remaining: 3 }
  return {
    used: data.scans_today,
    limit: data.scans_limit,
    remaining: Math.max(0, data.scans_limit - data.scans_today),
  }
}
