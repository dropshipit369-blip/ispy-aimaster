import { supabase } from '@/lib/supabase'
import type { ScanResponse, ScanResult } from '@/types/ebay'

const EDGE_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ebay-proxy`

/** Response shape from the ebay-proxy edge function */
interface ProxySearchResult {
  total: number
  items: {
    itemId: string
    title: string
    price: number
    currency: string
    condition: string
    imageUrl: string | null
    url: string | null
    marketplace: string
  }[]
}

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

  const body: Record<string, unknown> = {
    action: 'search',
    q: query,
  }
  if (options.limit) body.limit = options.limit

  const res = await fetch(EDGE_FN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `Request failed (${res.status})` }))
    throw new Error(err.error ?? `eBay search failed (${res.status})`)
  }

  const data: ProxySearchResult = await res.json()
  return transformResponse(query, data)
}

/** Transform proxy response into our app's format */
function transformResponse(query: string, data: ProxySearchResult): ScanResponse {
  const items: ScanResult[] = (data.items ?? []).map((item) => ({
    id: item.itemId,
    name: item.title,
    confidence: calculateConfidence(item.title, query),
    estimatedValue: `$${item.price.toFixed(2)}`,
    currency: item.currency,
    condition: item.condition ?? 'Unknown',
    imageUrl: item.imageUrl ?? '',
    itemUrl: item.url ?? '',
    seller: 'eBay AU',
    sellerRating: 'N/A',
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
