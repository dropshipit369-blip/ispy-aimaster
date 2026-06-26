/**
 * PriceCoach — conversational price refinement (ported from snapit's
 * strategy chat, upgraded to use the refine-pricing edge function).
 *
 * The user tells the AI things only a human would know — "it's signed",
 * "box is sealed", "I need it gone this week" — and the price strategy
 * recalculates live in the conversation.
 *
 * Psychology: co-creation. A price the user helped shape is a price they
 * believe in (IKEA effect). It also converts a static verdict into a
 * dialogue, which is stickier than any dashboard.
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, MessageCircle, Sparkles } from 'lucide-react';
import { invokeSupabaseFunction } from '@/lib/supabase-functions';
import { formatAud } from '@/lib/utils';
import { toast } from 'sonner';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

interface RefinedStrategy {
  recommendedPrice?: number;
  reasoning?: string;
  lowEstimate?: number;
  highEstimate?: number;
}

interface PriceCoachProps {
  itemName: string;
  condition?: string;
  category?: string;
  brand?: string;
  currentPrice: number;
  lowPrice: number;
  highPrice: number;
  /** Called when the AI produces an updated price strategy */
  onStrategyRefined?: (strategy: { price: number; low: number; high: number; reasoning: string }) => void;
}

const QUICK_PROMPTS = [
  "It's in original packaging",
  'Sell it fast',
  'Maximise the price',
  "It's a rare variant",
];

export function PriceCoach({
  itemName,
  condition,
  category,
  brand,
  currentPrice,
  lowPrice,
  highPrice,
  onStrategyRefined,
}: PriceCoachProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length > 0) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isThinking) return;

    setInput('');
    setIsThinking(true);
    const history = [...messages];
    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);

    try {
      const { data, error } = await invokeSupabaseFunction<{ strategy?: RefinedStrategy; error?: string }>(
        'refine-pricing',
        {
          // NOTE: refine-pricing expects `analysis.title` (see edge function prompt)
          analysis: {
            title: itemName,
            condition: condition ?? 'Unknown',
            category: category ?? 'General',
            brand: brand ?? null,
          },
          currentStrategy: {
            recommendedPrice: currentPrice,
            lowEstimate: lowPrice,
            highEstimate: highPrice,
          },
          userFeedback: trimmed,
          chatHistory: history.map((m) => ({ role: m.role, text: m.text })),
          marketReport: {
            low_price: lowPrice,
            median_price: currentPrice,
            high_price: highPrice,
          },
        },
      );

      if (error || !data?.strategy) {
        throw new Error(data?.error || 'Could not refine the price right now.');
      }

      const s = data.strategy;
      const newPrice = typeof s.recommendedPrice === 'number' ? s.recommendedPrice : currentPrice;
      const reasoning = s.reasoning || 'Strategy updated.';

      setMessages((prev) => [...prev, { role: 'model', text: reasoning }]);

      if (onStrategyRefined) {
        onStrategyRefined({
          price: newPrice,
          low: typeof s.lowEstimate === 'number' ? s.lowEstimate : lowPrice,
          high: typeof s.highEstimate === 'number' ? s.highEstimate : highPrice,
          reasoning,
        });
      }

      if (newPrice !== currentPrice) {
        toast.success(`Price updated to ${formatAud(newPrice, { decimals: 0 })}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Refinement failed.';
      setMessages((prev) => [
        ...prev,
        { role: 'model', text: `I hit a snag: ${msg} Try again in a moment.` },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="rounded-xl border border-border/50 bg-muted/20 overflow-hidden">
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <div className="p-1.5 rounded-lg bg-primary/15">
          <MessageCircle className="w-3.5 h-3.5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-none">Price Coach</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Tell me what the AI can't see — I'll re-price it
          </p>
        </div>
      </div>

      {/* Conversation */}
      <AnimatePresence initial={false}>
        {messages.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="max-h-44 overflow-y-auto px-4 py-2 space-y-2"
          >
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary/20 text-foreground rounded-tr-sm'
                      : 'bg-card border border-border/50 text-muted-foreground rounded-tl-sm'
                  }`}
                >
                  {msg.text}
                </div>
              </motion.div>
            ))}
            {isThinking && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 rounded-xl bg-card border border-border/50 px-3 py-2">
                  <Sparkles className="w-3 h-3 text-primary animate-pulse" />
                  <span className="text-[11px] text-muted-foreground">Recalculating strategy…</span>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick prompts — zero-typing path to first interaction */}
      {messages.length === 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-2">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => void send(prompt)}
              disabled={isThinking}
              className="rounded-full border border-border/60 bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 border-t border-border/40 bg-card/40 p-2.5">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void send(input)}
          placeholder="e.g. 'It's signed by the artist'…"
          disabled={isThinking}
          className="flex-1 rounded-lg border border-border/50 bg-background px-3 py-1.5 text-xs outline-none transition-colors focus:border-primary/60 disabled:opacity-50"
        />
        <button
          onClick={() => void send(input)}
          disabled={isThinking || !input.trim()}
          className="rounded-lg bg-primary px-3 text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Send to price coach"
        >
          {isThinking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}
