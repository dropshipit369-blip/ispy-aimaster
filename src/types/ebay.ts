import type { ScanAllowance } from '@/services/usage'

export type ConditionFilter = 'any' | 'used' | 'new'

/** One active eBay listing, as shown in the app. */
export interface ScanResult {
  id: string
  name: string
  /** 0–100: how many of the searched words appear in the listing title. */
  matchScore: number
  price: number
  currency: string
  priceLabel: string
  condition: string
  imageUrl: string
  itemUrl: string
  marketplace: string
}

/** Summary of current asking prices for one search. Prices are active listings, not completed sales. */
export interface ScanResponse {
  query: string
  condition: ConditionFilter
  totalResults: number
  items: ScanResult[]
  currency: string
  averagePrice: number
  medianPrice: number
  lowPrice: number
  highPrice: number
  timestamp: string
  allowance: ScanAllowance | null
}
