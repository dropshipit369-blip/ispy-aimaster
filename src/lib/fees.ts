/**
 * eBay Australia seller fees, from eBay's AU help pages (updated 15 June 2026):
 *  - Free selling: AU-registered sellers without a Pro plan and with ≤ A$25,000 sales in the past 12 months
 *    pay no final value fee or order fee on domestic sales. Buyers pay eBay a separate Buyer Protection fee.
 *  - Pro Starter (default once sales pass A$25,000): 13.4% of the sale up to A$4,000, 2.5% above that,
 *    plus A$0.30 per order, all incl. GST.
 * Postage, promoted listings, international sales and below-standard surcharges are not included.
 */
export type SellerPlan = 'free' | 'pro_starter'

export const SELLER_PLANS: Record<SellerPlan, { label: string; detail: string }> = {
  free: { label: 'Free selling', detail: 'Under A$25k sales a year: no eBay selling fees' },
  pro_starter: { label: 'Pro Starter', detail: '13.4% + A$0.30 per order' },
}

export function ebayAuSellingFee(salePrice: number, plan: SellerPlan): number {
  if (!Number.isFinite(salePrice) || salePrice <= 0) return 0
  if (plan === 'free') return 0
  const variable = 0.134 * Math.min(salePrice, 4000) + 0.025 * Math.max(0, salePrice - 4000)
  return Math.round((variable + 0.3) * 100) / 100
}

export interface ProfitEstimate {
  fee: number
  profit: number
  /** Profit as a % of the buy price; null when the buy price is 0 (free finds). */
  roi: number | null
}

export function estimateProfit(salePrice: number, buyPrice: number, plan: SellerPlan): ProfitEstimate {
  const fee = ebayAuSellingFee(salePrice, plan)
  const profit = Math.round((salePrice - fee - buyPrice) * 100) / 100
  const roi = buyPrice > 0 ? Math.round((profit / buyPrice) * 1000) / 10 : null
  return { fee, profit, roi }
}
