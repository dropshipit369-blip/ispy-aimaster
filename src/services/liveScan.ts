import { callFunction } from '@/services/functions'

/** One item the AI recognised in a photo (live-scan edge function). */
export interface IdentifiedItem {
  key: string
  name: string
  brand: string | null
  model: string | null
  category: string
  condition: string
  rarity: string
  yearMade: string | null
  originStory: string | null
  salesStrategy: string | null
  bestMarketplace: string | null
  optimalSearchTerms: string[]
  confidence: number
}

interface LiveScanResponse {
  items: IdentifiedItem[]
  scans_used?: number
  scans_limit?: number
}

/**
 * Sends a JPEG data URL to the live-scan function for identification.
 * Uses one AI photo ID from the monthly allowance; failed identifications are not counted.
 * The photo is processed in memory and is not stored by iSpy.
 */
export async function identifyFromPhoto(imageDataUrl: string): Promise<LiveScanResponse> {
  const response = await callFunction<LiveScanResponse>('live-scan', {
    image: imageDataUrl,
    requestId: crypto.randomUUID(),
    enableMarketplaceScrape: false,
  })
  const items = [...(response.items ?? [])].sort((a, b) => b.confidence - a.confidence)
  return { ...response, items }
}

/** The best phrase to search eBay for an identified item. */
export function searchPhraseFor(item: IdentifiedItem): string {
  const suggested = item.optimalSearchTerms.find((term) => term.trim().length > 2)
  if (suggested) return suggested.trim().slice(0, 200)
  const brand = item.brand && !item.name.toLowerCase().includes(item.brand.toLowerCase()) ? item.brand : null
  return [brand, item.name, item.model].filter(Boolean).join(' ').slice(0, 200)
}
