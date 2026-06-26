import type { SoldComparable } from "@/lib/types";

const EBAY_BASE = "https://www.ebay.com.au/sch/i.html";

export function buildEbaySearchQuery(input: {
  title?: string | null;
  brand?: string | null;
  model?: string | null;
}): string {
  const parts = [input.brand, input.model, input.title]
    .map((v) => (v ?? "").toString().trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const deduped = parts.filter((p) => {
    const key = p.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return deduped.join(" ").slice(0, 180) || "";
}

export function buildEbaySoldUrl(query: string): string {
  const q = encodeURIComponent(query.trim());
  return `${EBAY_BASE}?_nkw=${q}&LH_Complete=1&LH_Sold=1`;
}

export function buildEbayActiveUrl(query: string): string {
  const q = encodeURIComponent(query.trim());
  return `${EBAY_BASE}?_nkw=${q}&LH_BIN=1`;
}

export function buildEbayCompletedUrl(query: string): string {
  const q = encodeURIComponent(query.trim());
  return `${EBAY_BASE}?_nkw=${q}&LH_Complete=1`;
}

export interface PriceConfidenceStats {
  count: number;
  median: number;
  mean: number;
  low: number;
  high: number;
  stdDev: number;
  coefficientOfVariation: number;
  confidenceLevel: "HIGH" | "MEDIUM" | "LOW" | "NONE";
  confidenceScore: number;
  prices: number[];
}

const EMPTY_STATS: PriceConfidenceStats = {
  count: 0,
  median: 0,
  mean: 0,
  low: 0,
  high: 0,
  stdDev: 0,
  coefficientOfVariation: 0,
  confidenceLevel: "NONE",
  confidenceScore: 0,
  prices: [],
};

export function calculatePriceConfidence(
  comparables: SoldComparable[] | null | undefined,
): PriceConfidenceStats {
  const prices = (comparables ?? [])
    .map((c) => c?.price)
    .filter((p): p is number => typeof p === "number" && Number.isFinite(p) && p > 0)
    .sort((a, b) => a - b);

  if (prices.length === 0) return EMPTY_STATS;

  const count = prices.length;
  const sum = prices.reduce((s, p) => s + p, 0);
  const mean = sum / count;
  const low = prices[0];
  const high = prices[count - 1];
  const median =
    count % 2 === 0
      ? (prices[count / 2 - 1] + prices[count / 2]) / 2
      : prices[Math.floor(count / 2)];
  const variance =
    prices.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / count;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = mean > 0 ? stdDev / mean : 0;

  let confidenceLevel: PriceConfidenceStats["confidenceLevel"] = "LOW";
  if (count >= 5 && coefficientOfVariation < 0.2) confidenceLevel = "HIGH";
  else if (count >= 3 && coefficientOfVariation < 0.35) confidenceLevel = "MEDIUM";
  else if (count < 2) confidenceLevel = "LOW";

  const sampleScore = Math.min(1, count / 6);
  const spreadScore = Math.max(0, 1 - coefficientOfVariation / 0.6);
  const confidenceScore = Math.round((sampleScore * 0.45 + spreadScore * 0.55) * 100);

  return {
    count,
    median,
    mean,
    low,
    high,
    stdDev,
    coefficientOfVariation,
    confidenceLevel,
    confidenceScore,
    prices,
  };
}

export function percentDeltaFromMedian(price: number, median: number): number | null {
  if (!Number.isFinite(price) || !Number.isFinite(median) || median <= 0) return null;
  return ((price - median) / median) * 100;
}

const TIMEFRAME_PATTERNS: Array<{ re: RegExp; toDays: (n: number) => number }> = [
  { re: /(\d+)\s*h(ours?)?/i, toDays: (n) => Math.max(1, Math.round(n / 24)) },
  { re: /(\d+)\s*d(ays?)?/i, toDays: (n) => n },
  { re: /(\d+)\s*w(eeks?)?/i, toDays: (n) => n * 7 },
  { re: /(\d+)\s*m(onths?)?/i, toDays: (n) => n * 30 },
  { re: /(\d+)\s*y(ears?)?/i, toDays: (n) => n * 365 },
];

export function parseTimeframeToDaysAgo(timeframe?: string | null): number | null {
  if (!timeframe) return null;
  const t = timeframe.trim();
  if (!t) return null;
  if (/today|now/i.test(t)) return 0;
  if (/yesterday/i.test(t)) return 1;
  for (const { re, toDays } of TIMEFRAME_PATTERNS) {
    const m = t.match(re);
    if (m) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n)) return toDays(n);
    }
  }
  const d = Date.parse(t);
  if (!Number.isNaN(d)) {
    const diff = Math.round((Date.now() - d) / (1000 * 60 * 60 * 24));
    return diff >= 0 ? diff : null;
  }
  return null;
}

export function formatDaysAgo(days: number | null): string | null {
  if (days === null || days === undefined) return null;
  if (days <= 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.round(days / 7)}w ago`;
  if (days < 365) return `${Math.round(days / 30)}mo ago`;
  return `${Math.round(days / 365)}y ago`;
}
