import { motion } from 'framer-motion';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Loader2,
  Clock,
  AlertTriangle,
  Check
} from 'lucide-react';
import { formatAud } from '@/lib/utils';

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ProfitOverlayItem {
  key: string;
  name: string;
  price: number;
  lowPrice: number;
  highPrice: number;
  confidence: number;
  trend?: 'up' | 'down' | 'stable';
  rarity?: 'common' | 'uncommon' | 'rare' | 'very-rare';
  bestMarketplace?: string | null;
  smoothedBox: Box;
  isPriced: boolean;
  isLocked: boolean;
  suggestedBuyUnder?: number;
  estimatedProfit?: {
    low: number;
    high: number;
  };
  timeToSell?: 'fast' | 'medium' | 'slow';
}

interface ProfitOverlayProps {
  items: ProfitOverlayItem[];
  onSelect: (item: ProfitOverlayItem) => void;
}

// Calculate profit signal: green (>30%), yellow (10-30%), red (<10%)
function getProfitSignal(profit: number, price: number): 'green' | 'yellow' | 'red' {
  const margin = price > 0 ? (profit / price) * 100 : 0;
  if (margin >= 30) return 'green';
  if (margin >= 10) return 'yellow';
  return 'red';
}

function getSignalColors(signal: 'green' | 'yellow' | 'red') {
  switch (signal) {
    case 'green':
      return {
        bg: 'from-emerald-500/90 to-emerald-600/90',
        border: 'border-emerald-400',
        text: 'text-emerald-400',
        glow: 'shadow-emerald-500/40',
        badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
      };
    case 'yellow':
      return {
        bg: 'from-amber-500/90 to-amber-600/90',
        border: 'border-amber-400',
        text: 'text-amber-400',
        glow: 'shadow-amber-500/40',
        badge: 'bg-amber-500/20 text-amber-400 border-amber-500/40'
      };
    case 'red':
      return {
        bg: 'from-red-500/90 to-red-600/90',
        border: 'border-red-400',
        text: 'text-red-400',
        glow: 'shadow-red-500/40',
        badge: 'bg-red-500/20 text-red-400 border-red-500/40'
      };
  }
}

function getTimeToSellIcon(speed?: 'fast' | 'medium' | 'slow') {
  switch (speed) {
    case 'fast':
      return <Clock className="w-3 h-3 text-emerald-400" />;
    case 'slow':
      return <Clock className="w-3 h-3 text-red-400" />;
    default:
      return <Clock className="w-3 h-3 text-amber-400" />;
  }
}

function getRarityBadge(rarity?: 'common' | 'uncommon' | 'rare' | 'very-rare') {
  if (!rarity || rarity === 'common') return null;
  const styles = {
    'uncommon': 'bg-blue-500/80 text-white',
    'rare': 'bg-amber-500/80 text-white',
    'very-rare': 'bg-purple-600/90 text-white',
  }[rarity];
  const label = { 'uncommon': 'Uncommon', 'rare': 'Rare', 'very-rare': 'RARE' }[rarity];
  return (
    <span className={`absolute -top-5 right-0 px-1.5 py-0.5 rounded-full text-[9px] font-bold tracking-wide ${styles}`}>
      {label}
    </span>
  );
}

export function ProfitOverlay({ items, onSelect }: ProfitOverlayProps) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {items.map((item) => {
        // Calculate profit metrics
        const platformFees = item.price * 0.13; // ~13% average fees
        const suggestedBuy = item.suggestedBuyUnder || Math.round(item.lowPrice * 0.6);
        const netProfitLow = item.lowPrice - suggestedBuy - platformFees;
        const netProfitHigh = item.highPrice - suggestedBuy - platformFees;
        
        const profitSignal = getProfitSignal(netProfitLow, suggestedBuy);
        const colors = getSignalColors(profitSignal);
        
        return (
          <motion.div
            key={item.key}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => item.isPriced && onSelect(item)}
            className={`absolute pointer-events-auto cursor-pointer transition-all duration-100 ${
              item.isLocked ? 'opacity-100' : 'opacity-80'
            }`}
            style={{
              left: `${item.smoothedBox.x * 100}%`,
              top: `${item.smoothedBox.y * 100}%`,
              width: `${item.smoothedBox.w * 100}%`,
              height: `${item.smoothedBox.h * 100}%`,
            }}
          >
            {/* Bounding Box with corner brackets */}
            <div className={`absolute inset-0 border-2 rounded-2xl ${colors.border} bg-white/5 backdrop-blur-[1px]`}>
              {/* Corner brackets - tactical style */}
              <div className={`absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 ${colors.border} rounded-tl-xl`} />
              <div className={`absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 ${colors.border} rounded-tr-xl`} />
              <div className={`absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 ${colors.border} rounded-bl-xl`} />
              <div className={`absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 ${colors.border} rounded-br-xl`} />
              
              {/* Scanline effect inside box */}
              {item.isLocked && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl opacity-20">
                  <motion.div 
                    animate={{ y: ["0%", "100%", "0%"] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className={`h-0.5 w-full bg-gradient-to-r from-transparent via-current to-transparent ${colors.text}`}
                  />
                </div>
              )}

              {/* Glow effect for locked items */}
              {item.isLocked && (
                <div className={`absolute inset-0 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.5)] ${colors.glow}`} />
              )}
            </div>

            {/* Main Price Card - Floating above item */}
            <div 
              className={`absolute -top-16 left-1/2 -translate-x-1/2 min-w-[140px] px-4 py-2.5 rounded-2xl backdrop-blur-xl bg-gradient-to-br ${colors.bg} border border-white/30 shadow-2xl z-10 flex flex-col items-center justify-center`}
            >
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-inherit border-r border-b border-white/30" />
              
              {item.isPriced ? (
                <div className="text-white relative z-10">
                  {/* Top row: Price + Trend */}
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xl font-black tracking-tight drop-shadow-sm">{formatAud(item.price, { decimals: 0 })}</span>
                    {item.trend === 'up' && <TrendingUp className="w-4 h-4 text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" />}
                    {item.trend === 'down' && <TrendingDown className="w-4 h-4 text-red-300 drop-shadow-[0_0_8px_rgba(248,113,113,0.8)]" />}
                  </div>
                  
                  {/* Bottom row: Buy-under hint */}
                  <div className="text-[10px] font-bold text-white/90 text-center mt-1 flex items-center justify-center gap-1.5 uppercase tracking-widest bg-black/20 rounded-full px-2 py-0.5">
                    <span>Target &lt; {formatAud(suggestedBuy, { decimals: 0 })}</span>
                    {getTimeToSellIcon(item.timeToSell)}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-white py-1 relative z-10">
                  <Loader2 className="w-4 h-4 animate-spin text-white/80" />
                  <span className="text-sm font-bold tracking-wide uppercase">Identifying</span>
                </div>
              )}
            </div>

            {/* Profit Indicator Badge */}
            {item.isPriced && netProfitLow > 0 && (
              <div className="absolute -top-24 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-emerald-500/95 text-white text-[10px] font-black tracking-wider uppercase flex items-center gap-1 shadow-lg border border-white/20 z-10 translate-y-2">
                <Check className="w-3.5 h-3.5" />
                Profit: {formatAud(netProfitLow, { decimals: 0, showPlus: true })}–{formatAud(netProfitHigh, { decimals: 0 })}
              </div>
            )}

            {/* Rarity Badge */}
            {getRarityBadge(item.rarity)}

            {/* Item Name - Below box */}
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-xl bg-black/60 backdrop-blur-xl text-[10px] text-white font-bold tracking-wide uppercase border border-white/10 truncate max-w-[180px] text-center shadow-2xl">
              {item.name}
            </div>

            {/* Best Marketplace - Below name */}
            {item.isPriced && item.bestMarketplace && (
              <div className="absolute -bottom-[58px] left-1/2 -translate-x-1/2 text-[9px] text-primary font-black tracking-widest uppercase bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                {item.bestMarketplace}
              </div>
            )}

            {/* Confidence indicator */}
            {item.isLocked && (
              <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground flex items-center gap-1">
                {item.confidence >= 80 ? (
                  <span className="text-emerald-400">High confidence</span>
                ) : item.confidence >= 60 ? (
                  <span className="text-amber-400">Estimate</span>
                ) : (
                  <span className="text-slate-400">Category guess</span>
                )}
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
