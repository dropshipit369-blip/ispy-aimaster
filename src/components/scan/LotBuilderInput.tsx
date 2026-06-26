import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PackagePlus, X, Target, Sparkles, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface LotBuilderInputProps {
  lotBuilderInput: string;
  setLotBuilderInput: (val: string) => void;
  lotBuilderItems: string[];
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
}

export const LotBuilderInput: React.FC<LotBuilderInputProps> = ({
  lotBuilderInput,
  setLotBuilderInput,
  lotBuilderItems,
  onAddItem,
  onRemoveItem,
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-background/40 backdrop-blur-md rounded-2xl border border-white/10 p-4 shadow-xl overflow-hidden relative group"
    >
      {/* Decorative side accent */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary/40 via-primary/10 to-transparent" />
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
            <PackagePlus className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-[11px] font-black tracking-widest uppercase text-foreground">Tactical Lot Assembly</h3>
            <p className="text-[9px] font-bold text-muted-foreground tracking-wide uppercase">Multi-Target Intel Consolidation</p>
          </div>
        </div>
        {lotBuilderItems.length > 0 && (
          <div className="flex items-center gap-1 bg-primary/20 px-2 py-0.5 rounded-full border border-primary/30">
            <Target className="w-2.5 h-2.5 text-primary" />
            <span className="text-[9px] font-black text-primary uppercase">{lotBuilderItems.length} Targets</span>
          </div>
        )}
      </div>

      <div className="relative flex gap-2">
        <div className="relative flex-1 group/input">
          <Input
            id="lot-builder-input"
            name="lot-builder"
            placeholder="Add ancillary target for bundled analysis..."
            value={lotBuilderInput}
            onChange={(e) => setLotBuilderInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onAddItem()}
            className="bg-black/20 border-white/5 focus:border-primary/40 focus:ring-primary/20 text-sm h-11 pl-4 pr-10 rounded-xl transition-all"
            aria-label="Add item to lot bundle"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground opacity-40 group-focus-within/input:opacity-100 transition-opacity">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>
        <Button 
          variant="ghost" 
          onClick={onAddItem} 
          size="icon" 
          className={cn(
            "h-11 w-11 shrink-0 rounded-xl border transition-all duration-300",
            lotBuilderInput 
              ? "bg-primary/20 border-primary/30 text-primary hover:bg-primary/30" 
              : "bg-white/5 border-white/10 text-muted-foreground"
          )}
        >
          <Plus className={cn("w-5 h-5 transition-transform duration-300", lotBuilderInput && "rotate-90 scale-110")} />
        </Button>
      </div>

      <AnimatePresence mode="popLayout">
        {lotBuilderItems.length > 0 && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-4 flex flex-wrap gap-2 overflow-hidden"
          >
            {lotBuilderItems.map((item, index) => (
              <motion.button
                layout
                initial={{ opacity: 0, scale: 0.8, x: -10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8, x: 10 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                key={`${item}-${index}`}
                onClick={() => onRemoveItem(index)}
                className="group relative flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-red-500/10 border border-white/5 hover:border-red-500/30 rounded-full transition-all duration-200"
              >
                <span className="text-[10px] font-bold text-foreground/80 group-hover:text-red-400 truncate max-w-[120px]">
                  {item}
                </span>
                <div className="flex items-center justify-center w-4 h-4 rounded-full bg-white/10 group-hover:bg-red-500/20 text-muted-foreground group-hover:text-red-400 transition-colors">
                  <X className="w-2.5 h-2.5" />
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {lotBuilderItems.length === 0 && (
        <p className="mt-4 text-[9px] font-bold text-muted-foreground/40 text-center uppercase tracking-[0.2em]">
          Ready for multi-item logistical override
        </p>
      )}
    </motion.div>
  );
};
