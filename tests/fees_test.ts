/// <reference lib="deno.ns" />
import { assertEquals } from 'jsr:@std/assert@1'
import { ebayAuSellingFee, estimateProfit } from '../src/lib/fees.ts'

Deno.test('free selling charges no eBay fee', () => {
  assertEquals(ebayAuSellingFee(50, 'free'), 0)
  assertEquals(estimateProfit(50, 12, 'free'), { fee: 0, profit: 38, roi: 316.7 })
})

Deno.test('Pro Starter matches eBay AU examples', () => {
  // eBay: "$50 item: $7 in transaction fees" (13.4% + old $0.30 ≈ $7.00)
  assertEquals(ebayAuSellingFee(50, 'pro_starter'), 7)
  // eBay worked example: $6,000 sale → $586.30
  assertEquals(ebayAuSellingFee(6000, 'pro_starter'), 586.3)
})

Deno.test('free finds have no ROI percentage', () => {
  assertEquals(estimateProfit(20, 0, 'free').roi, null)
  assertEquals(ebayAuSellingFee(0, 'pro_starter'), 0)
})
