/** eBay Browse API — item_summary/search response types */

export interface EbayPrice {
  value: string
  currency: string
}

export interface EbayImage {
  imageUrl: string
  height?: number
  width?: number
}

export interface EbaySeller {
  username: string
  feedbackPercentage: string
  feedbackScore: number
}

export interface EbayShippingOption {
  shippingCostType: string
  shippingCost?: EbayPrice
}

export interface EbayItemSummary {
  itemId: string
  title: string
  price: EbayPrice
  image?: EbayImage
  additionalImages?: EbayImage[]
  condition: string
  conditionId: string
  itemWebUrl: string
  seller: EbaySeller
  categories?: { categoryId: string; categoryName: string }[]
  shippingOptions?: EbayShippingOption[]
  itemLocation?: { city: string; stateOrProvince: string; country: string }
  buyingOptions?: string[]
  listingMarketplaceId?: string
}

export interface EbaySearchResponse {
  href: string
  total: number
  next?: string
  offset: number
  limit: number
  itemSummaries: EbayItemSummary[]
}

/** Processed result used in the app UI */
export interface ScanResult {
  id: string
  name: string
  confidence: number
  estimatedValue: string
  currency: string
  condition: string
  imageUrl: string
  itemUrl: string
  seller: string
  sellerRating: string
  margin?: string
}

export interface ScanResponse {
  query: string
  totalResults: number
  items: ScanResult[]
  averagePrice: number
  medianPrice: number
  priceRange: { low: string; high: string }
  timestamp: string
}
