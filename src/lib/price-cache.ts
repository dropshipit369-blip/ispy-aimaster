/**
 * Local price cache — stores scan results in IndexedDB so that:
 * 1. When the AI is busy/down, we can suggest prices from history
 * 2. Repeat/similar items get instant price suggestions
 * 3. Price accuracy improves over time as the cache grows
 *
 * Evidence path: every cached price includes its source label
 * so the user always knows WHY a price was suggested.
 */

const DB_NAME = "ispy-price-cache";
const DB_VERSION = 1;
const STORE_NAME = "scans";

export interface CachedScan {
  /** Composite key: lowercase `${category}::${brand}::${title}` */
  id: string;
  title: string;
  brand: string | null;
  model: string | null;
  category: string;
  condition: string | null;
  lowPrice: number | null;
  medianPrice: number | null;
  highPrice: number | null;
  suggestedPrice: number | null;
  bestMarketplace: string | null;
  confidenceScore: number | null;
  soldComparables: Array<{ title: string; price: number; marketplace: string }>;
  scannedAt: string;
  scanCount: number;
}

export interface FallbackPriceResult {
  lowPrice: number;
  medianPrice: number;
  highPrice: number;
  suggestedPrice: number;
  bestMarketplace: string | null;
  confidence: number;
  source: "price_cache";
  sourceLabel: string;
  matchCount: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("category", "category", { unique: false });
        store.createIndex("brand", "brand", { unique: false });
        store.createIndex("scannedAt", "scannedAt", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function buildCacheKey(category: string, brand: string | null, title: string): string {
  return [
    (category || "unknown").toLowerCase().trim(),
    (brand || "").toLowerCase().trim(),
    (title || "").toLowerCase().trim(),
  ].join("::");
}

/**
 * Store a successful scan result in the local price cache.
 * Call this after every successful analyze-item response.
 */
export async function cacheScanResult(scan: {
  title: string;
  brand: string | null;
  model: string | null;
  category: string;
  condition: string | null;
  lowPrice: number | null;
  medianPrice: number | null;
  highPrice: number | null;
  suggestedPrice: number | null;
  bestMarketplace: string | null;
  confidenceScore: number | null;
  soldComparables?: Array<{ title: string; price: number; marketplace: string }>;
}): Promise<void> {
  // Only cache scans that have actual price data
  if (!scan.medianPrice && !scan.lowPrice && !scan.highPrice) return;

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const id = buildCacheKey(scan.category, scan.brand, scan.title);

    // Check if exists — if so, update with averaged prices
    const existing = await new Promise<CachedScan | undefined>((resolve) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(undefined);
    });

    const entry: CachedScan = {
      id,
      title: scan.title,
      brand: scan.brand,
      model: scan.model,
      category: scan.category,
      condition: scan.condition,
      lowPrice: existing
        ? weightedAvg(existing.lowPrice, scan.lowPrice, existing.scanCount)
        : scan.lowPrice,
      medianPrice: existing
        ? weightedAvg(existing.medianPrice, scan.medianPrice, existing.scanCount)
        : scan.medianPrice,
      highPrice: existing
        ? weightedAvg(existing.highPrice, scan.highPrice, existing.scanCount)
        : scan.highPrice,
      suggestedPrice: existing
        ? weightedAvg(existing.suggestedPrice, scan.suggestedPrice, existing.scanCount)
        : scan.suggestedPrice,
      bestMarketplace: scan.bestMarketplace || existing?.bestMarketplace || null,
      confidenceScore: scan.confidenceScore,
      soldComparables: scan.soldComparables || existing?.soldComparables || [],
      scannedAt: new Date().toISOString(),
      scanCount: (existing?.scanCount || 0) + 1,
    };

    store.put(entry);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("Price cache write failed:", err);
  }
}

/**
 * Search the local price cache for similar items when AI is unavailable.
 * Matches by: exact key → same category+brand → same category.
 */
export async function getFallbackPrice(
  title: string,
  brand: string | null,
  category: string,
): Promise<FallbackPriceResult | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    // 1. Try exact match
    const exactKey = buildCacheKey(category, brand, title);
    const exact = await new Promise<CachedScan | undefined>((resolve) => {
      const req = store.get(exactKey);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(undefined);
    });

    if (exact && exact.medianPrice) {
      return {
        lowPrice: exact.lowPrice || exact.medianPrice * 0.7,
        medianPrice: exact.medianPrice,
        highPrice: exact.highPrice || exact.medianPrice * 1.4,
        suggestedPrice: exact.suggestedPrice || exact.medianPrice,
        bestMarketplace: exact.bestMarketplace,
        confidence: Math.min(90, (exact.confidenceScore || 50) + exact.scanCount * 5),
        source: "price_cache",
        sourceLabel: `Based on ${exact.scanCount} previous scan${exact.scanCount > 1 ? "s" : ""} of this item`,
        matchCount: exact.scanCount,
      };
    }

    // 2. Try category + brand match
    const allScans = await new Promise<CachedScan[]>((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });

    const categoryLower = (category || "").toLowerCase().trim();
    const brandLower = (brand || "").toLowerCase().trim();
    const titleWords = (title || "").toLowerCase().split(/\s+/).filter(w => w.length > 2);

    // Score matches
    const scored = allScans
      .filter((s) => s.medianPrice)
      .map((s) => {
        let score = 0;
        if (s.category.toLowerCase().trim() === categoryLower) score += 3;
        if (brandLower && s.brand?.toLowerCase().trim() === brandLower) score += 5;
        // Title word overlap
        const scanWords = s.title.toLowerCase().split(/\s+/);
        const overlap = titleWords.filter(w => scanWords.includes(w)).length;
        score += overlap * 2;
        return { scan: s, score };
      })
      .filter((s) => s.score >= 3) // At least category match
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    if (scored.length === 0) return null;

    // Average the top matches
    const prices = scored.map(s => s.scan);
    const avgLow = avg(prices.map(p => p.lowPrice));
    const avgMedian = avg(prices.map(p => p.medianPrice));
    const avgHigh = avg(prices.map(p => p.highPrice));
    const avgSuggested = avg(prices.map(p => p.suggestedPrice));
    const topMarketplace = prices[0].bestMarketplace;

    const matchType = scored[0].score >= 8
      ? `Based on ${scored.length} similar ${brand || category} items in your history`
      : `Estimated from ${scored.length} similar ${category} items in your scan history`;

    return {
      lowPrice: avgLow || avgMedian * 0.7,
      medianPrice: avgMedian,
      highPrice: avgHigh || avgMedian * 1.4,
      suggestedPrice: avgSuggested || avgMedian,
      bestMarketplace: topMarketplace,
      confidence: Math.min(70, scored.length * 15),
      source: "price_cache",
      sourceLabel: matchType,
      matchCount: scored.length,
    };
  } catch (err) {
    console.warn("Price cache read failed:", err);
    return null;
  }
}

/**
 * Get total number of cached scans (for UI display).
 */
export async function getCacheSize(): Promise<number> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    return new Promise((resolve) => {
      const req = store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(0);
    });
  } catch {
    return 0;
  }
}

// --- Helpers ---

function weightedAvg(
  existingVal: number | null,
  newVal: number | null,
  existingCount: number,
): number | null {
  if (existingVal == null && newVal == null) return null;
  if (existingVal == null) return newVal;
  if (newVal == null) return existingVal;
  // Weighted: existing values have more weight as scan count grows
  return (existingVal * existingCount + newVal) / (existingCount + 1);
}

function avg(values: (number | null)[]): number {
  const valid = values.filter((v): v is number => v != null && v > 0);
  if (valid.length === 0) return 0;
  return valid.reduce((sum, v) => sum + v, 0) / valid.length;
}
