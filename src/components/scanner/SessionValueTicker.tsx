/**
 * SessionValueTicker — Progress momentum engine.
 *
 * A running "value discovered" counter that ticks upward as the room reveals
 * its worth. Every new priced item triggers a value "pop" (+A$X flies into
 * the total) and milestone thresholds fire celebration pulses.
 *
 * Psychology:
 *  - Goal-gradient effect: a visibly climbing number makes stopping feel
 *    like leaving money on the table.
 *  - Variable reward: the user never knows if the next item is a A$5 mug or
 *    a A$400 lamp — that uncertainty is the slot-machine pull that keeps
 *    the camera moving.
 *  - Endowment: framing it as "discovered" value makes it feel already
 *    theirs.
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Gem, Flame } from 'lucide-react';
import { formatAud } from '@/lib/utils';

interface ValuePop {
  id: number;
  amount: number;
}

interface SessionValueTickerProps {
  /** Sum of median prices of all priced items this session */
  totalValue: number;
  /** Number of priced items */
  itemCount: number;
}

const MILESTONES = [100, 250, 500, 1000, 2500, 5000];

export function SessionValueTicker({ totalValue, itemCount }: SessionValueTickerProps) {
  const reduceMotion = useReducedMotion();
  const [displayed, setDisplayed] = useState(0);
  const [pops, setPops] = useState<ValuePop[]>([]);
  const [milestoneHit, setMilestoneHit] = useState<number | null>(null);
  const prevValue = useRef(0);
  const popId = useRef(0);
  const rafRef = useRef<number>(0);

  // Animate counter toward target with ease-out
  useEffect(() => {
    const from = prevValue.current;
    const to = totalValue;
    if (from === to) return;

    // Value pop for the delta
    const delta = to - from;
    if (delta > 0 && from > 0) {
      const id = ++popId.current;
      setPops((prev) => [...prev.slice(-2), { id, amount: delta }]);
      setTimeout(() => setPops((prev) => prev.filter((p) => p.id !== id)), 1400);
    }

    // Milestone detection
    const crossed = MILESTONES.find((m) => from < m && to >= m);
    if (crossed) {
      setMilestoneHit(crossed);
      if ('vibrate' in navigator) navigator.vibrate([40, 60, 80]);
      setTimeout(() => setMilestoneHit(null), 2600);
    }

    prevValue.current = to;

    if (reduceMotion) {
      setDisplayed(to);
      return;
    }

    const start = performance.now();
    const duration = Math.min(900, 300 + Math.abs(delta) * 2);
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(from + delta * eased);
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [totalValue, reduceMotion]);

  if (itemCount === 0) return null;

  return (
    <div className="pointer-events-none relative flex flex-col items-center">
      {/* Milestone celebration */}
      <AnimatePresence>
        {milestoneHit && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -12 }}
            transition={{ type: 'spring', stiffness: 320, damping: 20 }}
            className="absolute -top-9 z-10 flex items-center gap-1.5 rounded-full border border-amber-400/50 bg-gradient-to-r from-amber-500/30 to-yellow-500/30 px-3 py-1 shadow-lg shadow-amber-500/30 backdrop-blur"
          >
            <Flame className="h-3.5 w-3.5 text-amber-300" />
            <span className="text-[11px] font-bold text-amber-200">
              {formatAud(milestoneHit, { decimals: 0 })} room unlocked!
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Value pops */}
      <div className="absolute -top-5 right-0">
        <AnimatePresence>
          {pops.map((pop) => (
            <motion.span
              key={pop.id}
              initial={{ opacity: 0, y: 6, scale: 0.85 }}
              animate={{ opacity: 1, y: -10, scale: 1 }}
              exit={{ opacity: 0, y: -22 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              className="absolute right-0 whitespace-nowrap text-xs font-bold text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.6)]"
            >
              +{formatAud(pop.amount, { decimals: 0 })}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>

      {/* Main ticker pill */}
      <motion.div
        animate={
          milestoneHit && !reduceMotion
            ? { scale: [1, 1.08, 1], transition: { duration: 0.5 } }
            : {}
        }
        className="flex items-center gap-2 rounded-full border border-amber-400/30 bg-black/65 px-3.5 py-1.5 shadow-lg shadow-black/40 backdrop-blur-md"
      >
        <Gem className="h-3.5 w-3.5 text-amber-400" />
        <div className="leading-none">
          <span className="bg-gradient-to-r from-amber-200 to-yellow-400 bg-clip-text text-sm font-bold tabular-nums text-transparent">
            {formatAud(displayed, { decimals: 0 })}
          </span>
          <span className="ml-1.5 text-[9px] font-medium uppercase tracking-wider text-white/45">
            found · {itemCount} item{itemCount === 1 ? '' : 's'}
          </span>
        </div>
      </motion.div>
    </div>
  );
}
