import { supabase } from '@/lib/supabase'
import type { ScanResponse, ScanResult } from '@/types/ebay'

/** A scan stored in `public.scans`. `total_value` holds the median asking price at the time of the scan. */
export interface SavedScan {
  id: string
  query: string
  results: ScanResult[]
  total_value: number | null
  item_count: number
  created_at: string
}

/** Persist a completed scan to the user's history. Row-level security scopes it to the signed-in user. */
export async function saveScan(userId: string, scan: ScanResponse): Promise<void> {
  const { error } = await supabase.from('scans').insert({
    user_id: userId,
    query: scan.query,
    results: scan.items.slice(0, 20),
    total_value: scan.items.length ? scan.medianPrice : null,
    item_count: scan.items.length,
  })
  if (error) throw new Error('This scan could not be saved to your history.')
}

/** Newest-first page of the user's scans. Pass the last row's `created_at` as `before` to load the next page. */
export async function getScanHistory(userId: string, options: { limit?: number; before?: string } = {}): Promise<SavedScan[]> {
  let request = supabase
    .from('scans')
    .select('id, query, results, total_value, item_count, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(options.limit ?? 20)
  if (options.before) request = request.lt('created_at', options.before)

  const { data, error } = await request
  if (error) throw new Error('Could not load your scan history. Please retry.')
  return (data ?? []) as SavedScan[]
}

export async function countScans(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('scans')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
  if (error) throw new Error('Could not count your scans.')
  return count ?? 0
}

export async function deleteScan(scanId: string): Promise<void> {
  const { error } = await supabase.from('scans').delete().eq('id', scanId)
  if (error) throw new Error('This scan could not be deleted. Please retry.')
}
