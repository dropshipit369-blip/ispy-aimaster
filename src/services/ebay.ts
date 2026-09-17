import { supabase } from '@/lib/supabase'
import type { EbaySearchResponse, ScanResponse, ScanResult } from '@/types/ebay'

const EDGE_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ebay-search`

/**
 * Search eBay via our Supabase Edge Function proxy.
 * The edge function handles OAuth client-credentials and keeps keys server-side.
 */
export async function searchEbay(
  query: string,
  options: { limit?: number; sort?: string; filter?: string } = {},
): Promise<ScanResponse> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const params = new URLSearchParams({ q: query })
  if (options.limit) params.set('limit', String(options.limit))
  if (options.sort) params.set('sort', options.sort)
  if (options.filter) params.set('filter', options.filter)

  const res = await fetch(`${EDGE_FN_URL}?${params}`, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`eBay search failed (${res.status}): ${body}`)
  }

  const data: EbaySearchResponse = await res.json()
  return transformResponse(query, data)
}

/** Transform raw eBay API response into our app's format */
function transformResponse(query: string, data: EbaySearchResponse): ScanResponse {
  const items: ScanResult[] = (data.itemSummaries ?? []).map((item) => ({
    id: item.itemId,
    name: item.title,
    confidence: calculateConfidence(item.title, query),
    estimatedValue: `$${parseFloat(item.price.value).toFixed(2)}`,
    currency: item.price.currency,
    condition: item.condition ?? 'Unknown',
    imageUrl: item.image?.imageUrl ?? '',
    itemUrl: item.itemWebUrl,
    seller: item.seller?.username ?? 'Unknown',
    sellerRating: item.seller?.feedbackPercentage ?? 'N/A',
  }))

  const prices = items.map((i) => parseFloat(i.estimatedValue.replace('$', '')))
  const sorted = [...prices].sort((a, b) => a - b)
  const avg = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0
  const median = sorted.length
    ? sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)]
    : 0

  // Compute margin vs median for each item
  const itemsWithMargin = items.map((item) => {
    const price = parseFloat(item.estimatedValue.replace('$', ''))
    if (median > 0 && price < median) {
      const marginPct = Math.round(((median - price) / price) * 100)
      return { ...item, margin: `+${marginPct}%` }
    }
    return item
  })

  return {
    query,
    totalResults: data.total ?? 0,
    items: itemsWithMargin,
    averagePrice: Math.round(avg * 100) / 100,
    medianPrice: Math.round(median * 100) / 100,
    priceRange: {
      low: sorted.length ? `$${sorted[0].toFixed(2)}` : '$0.00',
      high: sorted.length ? `$${sorted[sorted.length - 1].toFixed(2)}` : '$0.00',
    },
    timestamp: new Date().toISOString(),
  }
}

/** Simple keyword-overlap confidence scorer */
function calculateConfidence(title: string, query: string): number {
  const titleWords = title.toLowerCase().split(/\s+/)
  const queryWords = query.toLowerCase().split(/\s+/)
  const matches = queryWords.filter((w) => titleWords.some((t) => t.includes(w)))
  const base = Math.round((matches.length / queryWords.length) * 100)
  return Math.min(99, Math.max(50, base))
}
