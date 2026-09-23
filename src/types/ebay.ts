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

/** One recent eBay AU sale behind a sold-price summary. */
export interface SoldSale {
  title: string
  price: number
  endedAt: string
  url: string | null
  format: string | null
  basis: SoldBasis
}

/**
 * How trustworthy the sold figure is:
 * - confirmed: winning bids read back from eBay's API after the auction closed
 * - observed: sale prices seen on eBay's public sold listings (not API-verified)
 * - estimated: Best Offer sales, where eBay hides the accepted amount; list price less 8%
 */
export type SoldBasis = 'confirmed' | 'observed' | 'estimated'

/** Real eBay AU sold prices for the scanned item, from iSpy's sold-comps store. */
export interface SoldSummary {
  basis: SoldBasis
  count: number
  confirmedCount: number
  median: number
  p25: number
  p75: number
  oldest: string
  newest: string
  wideSpread: boolean
  windowDays: number
  recent: SoldSale[]
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
  /** Sold prices for the same item, or null when there are too few matching sales to be useful. */
  sold: SoldSummary | null
  /** True when iSpy has started collecting eBay AU sold prices for this item because it had too few. */
  soldTracking: boolean
}
