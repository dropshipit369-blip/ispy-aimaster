import { formatMoney } from '@/lib/format'
import { callFunction } from '@/services/functions'
import { allowanceFromDetails } from '@/services/usage'
import type { ConditionFilter, ScanResponse, ScanResult } from '@/types/ebay'

/** Response shape from the ebay-proxy edge function (`action: "search"`). */
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
  quota?: Record<string, unknown>
}

/**
 * Searches current eBay AU listings through the ebay-proxy edge function.
 * The function authenticates the user, consumes one scan from today's allowance and
 * keeps eBay credentials server-side. A spent allowance surfaces as ApiError code "scan_limit_reached".
 */
export async function searchEbay(
  query: string,
  options: { limit?: number; condition?: ConditionFilter; gtin?: string } = {},
): Promise<ScanResponse> {
  const condition = options.condition ?? 'any'
  const data = await callFunction<ProxySearchResult>('ebay-proxy', {
    action: 'search',
    ...(query.trim() ? { q: query } : {}),
    ...(options.gtin ? { gtin: options.gtin } : {}),
    limit: options.limit ?? 12,
    ...(condition === 'any' ? {} : { condition }),
  })
  const label = query.trim() || (options.gtin ? `Barcode ${options.gtin}` : '')
  return transformResponse(label, condition, data, Boolean(options.gtin && !query.trim()))
}

/** Digits-only barcode with a valid GS1 check digit (UPC-A, EAN-8, EAN-13/ISBN-13, GTIN-14), or null. */
export function normaliseBarcode(value: string): string | null {
  const digits = value.replace(/[\s-]/g, '')
  if (!/^\d{8}$|^\d{12,14}$/.test(digits)) return null
  const body = digits.slice(0, -1).split('').reverse().map(Number)
  const sum = body.reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0)
  return (10 - (sum % 10)) % 10 === Number(digits.at(-1)) ? digits : null
}

let environmentPromise: Promise<'production' | 'sandbox' | 'unknown'> | null = null

/** Whether market data is live (production) or eBay test data (sandbox). Cached for the session. */
export function getMarketEnvironment(): Promise<'production' | 'sandbox' | 'unknown'> {
  environmentPromise ??= callFunction<{ environment?: string }>('ebay-proxy', { action: 'health' })
    .then((r) => (r.environment === 'production' || r.environment === 'sandbox' ? r.environment : 'unknown'))
    .catch(() => {
      environmentPromise = null
      return 'unknown' as const
    })
  return environmentPromise
}

function transformResponse(query: string, condition: ConditionFilter, data: ProxySearchResult, exactProduct = false): ScanResponse {
  const items: ScanResult[] = (data.items ?? [])
    .filter((item) => Number.isFinite(item.price) && item.price > 0)
    .map((item) => ({
      id: item.itemId,
      name: item.title,
      // A barcode search returns listings eBay has tied to that exact product.
      matchScore: exactProduct ? 100 : matchScore(item.title, query),
      price: item.price,
      currency: item.currency || 'AUD',
      priceLabel: formatMoney(item.price, item.currency || 'AUD'),
      condition: item.condition || 'Not specified',
      imageUrl: item.imageUrl ?? '',
      itemUrl: safeEbayUrl(item.url),
      marketplace: item.marketplace || 'eBay',
    }))

  const prices = items.map((i) => i.price).sort((a, b) => a - b)
  const mid = Math.floor(prices.length / 2)
  const median = prices.length ? (prices.length % 2 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2) : 0
  const average = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0
  const round = (n: number) => Math.round(n * 100) / 100

  return {
    query,
    condition,
    totalResults: data.total ?? items.length,
    items,
    currency: items[0]?.currency ?? 'AUD',
    averagePrice: round(average),
    medianPrice: round(median),
    lowPrice: prices[0] ?? 0,
    highPrice: prices.at(-1) ?? 0,
    timestamp: new Date().toISOString(),
    allowance: data.quota ? allowanceFromDetails(data.quota) : null,
  }
}

/** Only ever link out to eBay over https. */
function safeEbayUrl(value: string | null): string {
  if (!value) return ''
  try {
    const url = new URL(value)
    const host = url.hostname
    const isEbay = host === 'ebay.com' || host.endsWith('.ebay.com') || host === 'ebay.com.au' || host.endsWith('.ebay.com.au')
    return url.protocol === 'https:' && isEbay ? url.href : ''
  } catch {
    return ''
  }
}

/** Share of the searched words found in the listing title (0–100). */
function matchScore(title: string, query: string): number {
  const titleText = title.toLowerCase()
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 1)
  if (!words.length) return 0
  const hits = words.filter((w) => titleText.includes(w)).length
  return Math.round((hits / words.length) * 100)
}
