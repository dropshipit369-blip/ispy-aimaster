import type { SoldBasis } from '@/types/ebay'

/** "12 confirmed eBay AU sales" etc. Used by the HUD and the sold panel. */
export const SOLD_BASIS_LABEL: Record<SoldBasis, (n: number) => string> = {
  confirmed: (n) => `${n} confirmed eBay AU ${n === 1 ? 'sale' : 'sales'}`,
  observed: (n) => `${n} eBay AU ${n === 1 ? 'sale' : 'sales'}`,
  estimated: (n) => `${n} Best Offer ${n === 1 ? 'sale' : 'sales'} (estimated)`,
}
