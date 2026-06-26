/**
 * EvidenceRail — The Trust Loop.
 *
 * Docked rail that surfaces the REAL sold listings behind every suggested
 * price, directly inside the live scan view. The user never has to wonder
 * "where did this number come from?" — the receipts scroll right next to
 * the price.
 *
 * Psychology: social proof (real transactions), authority (marketplace
 * sources), and concreteness (dates + conditions) convert a floating AI
 * guess into a number the user trusts enough to act on.
 */

import { useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  ExternalLink,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  Search,
} from 'lucide-react';
import { formatAud } from '@/lib/utils';

export interface EvidenceSource {
  marketplace: string;
  title: string;
  price: number;
  condition: string;
  soldDate: string;
  url?: string;
}

export interface EvidenceItem {
  key: string;
  name: string;
  price: number;
  lowPrice: number;
  highPrice: number;
  confidence: number;
  trend?: 'up' | 'down' | 'stable';
  isPriced: boolean;
  pricingSources?: EvidenceSource[];
}

interface EvidenceRailProps {
  item: EvidenceItem | null;
  onOpenDetail: (item: EvidenceItem) => void;
  onDismiss: () => void;
}

function marketplaceBadgeColor(marketplace: string): string {
  const m = marketplace.toLowerCase();
  if (m.includes('ebay')) return 'bg-[#e53238]/20 text-[#ff7b7f] border-[#e53238]/40';
  if (m.includes('facebook') || m.includes('marketplace')) return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
  if (m.includes('gumtree')) return 'bg-green-500/20 text-green-300 border-green-500/40';
  if (m.includes('amazon')) return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
  return 'bg-white/10 text-white/70 border-white/20';
}

function TrendChip({ trend }: { trend?: 'up' | 'down' | 'stable' }) {
  if (trend === 'up')
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-400">
        <TrendingUp className="h-3 w-3" /> Rising
      </span>
    );
  if (trend === 'down')
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-red-400">
        <TrendingDown className="h-3 w-3" /> Falling
      </span>
    );
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-white/50">
      <Minus className="h-3 w-3" /> Stable
    </span>
  );
}

function SkeletonCard({ index }: { index: number }) {
  return (
    <div
      className="relative w-36 flex-shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-3"
      style={{ animationDelay: `${index * 120}ms` }}
    >
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="mb-2 h-3 w-16 rounded bg-white/10" />
      <div className="mb-1 h-2.5 w-full rounded bg-white/10" />
      <div className="mb-3 h-2.5 w-3/4 rounded bg-white/10" />
      <div className="h-5 w-14 rounded bg-white/15" />
    </div>
  );
}

export function EvidenceRail({ item, onOpenDetail, onDismiss }: EvidenceRailProps) {
  const reduceMotion = useReducedMotion();

  const sources = item?.pricingSources ?? [];
  const medianIndex = useMemo(() => {
    if (!item || sources.length === 0) return -1;
    let best = 0;
    let bestDelta = Infinity;
    sources.forEach((s, i) => {
      const delta = Math.abs(s.price - item.price);
      if (delta < bestDelta) {
        bestDelta = delta;
        best = i;
      }
    });
    return best;
  }, [item, sources]);

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          key={item.key}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 64 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 64 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          className="pointer-events-auto mx-auto w-full max-w-xl px-3"
        >
          <div className="overflow-hidden rounded-3xl border border-white/12 bg-black/72 shadow-2xl shadow-black/60 backdrop-blur-xl">
            {/* Header: item + price + verification */}
            <button
              onClick={() => onOpenDetail(item)}
              className="group flex w-full items-center justify-between gap-3 px-4 pb-2 pt-3 text-left"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{item.name}</p>
                <div className="mt-0.5 flex items-center gap-2">
                  {sources.length > 0 ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400">
                      <ShieldCheck className="h-3 w-3" />
                      Backed by {sources.length} real sold listing{sources.length === 1 ? '' : 's'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-300/90">
                      <Search className="h-3 w-3 animate-pulse" />
                      Verifying live market data…
                    </span>
                  )}
                  <TrendChip trend={item.trend} />
                </div>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                <div className="text-right">
                  <p className="bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-500 bg-clip-text text-xl font-bold leading-none text-transparent">
                    {formatAud(item.price, { decimals: 0 })}
                  </p>
                  <p className="text-[10px] text-white/45">
                    {formatAud(item.lowPrice, { decimals: 0 })} – {formatAud(item.highPrice, { decimals: 0 })}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-white/40 transition-transform group-hover:translate-x-0.5" />
              </div>
            </button>

            {/* Comp cards — the receipts */}
            <div className="scrollbar-hide flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-3 pt-1">
              {sources.length === 0 && (
                <>
                  <SkeletonCard index={0} />
                  <SkeletonCard index={1} />
                  <SkeletonCard index={2} />
                </>
              )}
              {sources.map((src, i) => {
                const isAnchor = i === medianIndex;
                const Card = (
                  <motion.div
                    initial={reduceMotion ? false : { opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: reduceMotion ? 0 : i * 0.06, duration: 0.3 }}
                    className={`relative w-36 flex-shrink-0 snap-start rounded-2xl border p-3 transition-colors ${
                      isAnchor
                        ? 'border-amber-400/50 bg-amber-400/10 shadow-[0_0_18px_-6px] shadow-amber-400/40'
                        : 'border-white/10 bg-white/[0.06] hover:bg-white/[0.1]'
                    }`}
                  >
                    {isAnchor && (
                      <span className="absolute -top-2 left-2 inline-flex items-center gap-0.5 rounded-full border border-amber-400/40 bg-black/80 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-amber-300">
                        <Sparkles className="h-2 w-2" /> Price anchor
                      </span>
                    )}
                    <div className="mb-1.5 flex items-center justify-between gap-1">
                      <span
                        className={`truncate rounded-full border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide ${marketplaceBadgeColor(src.marketplace)}`}
                      >
                        {src.marketplace}
                      </span>
                      {src.url && <ExternalLink className="h-2.5 w-2.5 flex-shrink-0 text-white/40" />}
                    </div>
                    <p className="mb-1.5 line-clamp-2 min-h-[28px] text-[10px] leading-snug text-white/80">{src.title}</p>
                    <p className="text-base font-bold leading-none text-white">{formatAud(src.price, { decimals: 0 })}</p>
                    <div className="mt-1 flex items-center justify-between text-[9px] text-white/45">
                      <span className="truncate">{src.condition}</span>
                      <span className="flex-shrink-0">{src.soldDate}</span>
                    </div>
                  </motion.div>
                );

                return src.url ? (
                  <a key={i} href={src.url} target="_blank" rel="noopener noreferrer" className="contents">
                    {Card}
                  </a>
                ) : (
                  <div key={i} className="contents">
                    {Card}
                  </div>
                );
              })}
            </div>

            {/* Dismiss handle */}
            <button
              onClick={onDismiss}
              className="block w-full pb-2 pt-0.5 text-center text-[10px] font-medium text-white/35 transition-colors hover:text-white/60"
            >
              Swipe to keep scanning · tap to hide
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
