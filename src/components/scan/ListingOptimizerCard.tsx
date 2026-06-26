import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Zap, Copy, ExternalLink, PenTool } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { OptimizedListing } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ListingOptimizerCardProps {
  optimizedListing: OptimizedListing | null;
  isListingOptimizing: boolean;
  onOptimize: () => void;
  selectedTitleIndex: number;
  onTitleSelect: (index: number) => void;
}

export const ListingOptimizerCard: React.FC<ListingOptimizerCardProps> = ({
  optimizedListing,
  isListingOptimizing,
  onOptimize,
  selectedTitleIndex,
  onTitleSelect,
}) => {
  const handleCopyDescription = () => {
    if (optimizedListing) {
      navigator.clipboard.writeText(optimizedListing.description);
      toast.success("Strategic description copied to terminal");
    }
  };

  return (
    <Card className="border-white/5 bg-background/40 backdrop-blur-3xl shadow-2xl relative overflow-hidden group rounded-[2.5rem]">
      {/* Glow Effects */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[100px] -mr-32 -mt-32 opacity-50" />
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary/60 via-primary/20 to-transparent" />
      
      <CardHeader className="pb-4 border-b border-white/5 bg-white/5">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 shadow-inner">
              <Zap className="w-5 h-5 text-primary shadow-[0_0_10px_rgba(14,165,233,0.5)]" />
            </div>
            <div>
              <p className="text-[11px] font-black tracking-[0.3em] uppercase text-foreground">Listing Intelligence</p>
              <p className="text-[9px] font-black text-muted-foreground tracking-widest uppercase opacity-40">AI-Optimized Sales Execution</p>
            </div>
          </div>
          <Button 
            onClick={onOptimize} 
            disabled={isListingOptimizing} 
            size="sm"
            className="rounded-xl bg-primary/20 border border-primary/30 text-primary hover:bg-primary/30 h-10 px-6 transition-all shadow-[0_0_20px_rgba(14,165,233,0.1)] active:scale-95"
          >
            {isListingOptimizing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> 
                <span className="text-[10px] font-black uppercase tracking-widest">Optimizing</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" /> 
                <span className="text-[10px] font-black uppercase tracking-widest">Generate</span>
              </>
            )}
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-8 space-y-10">
        <AnimatePresence mode="wait">
          {optimizedListing ? (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-10"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <PenTool className="w-4 h-4 text-primary" />
                  <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">A/B Title Variations</p>
                </div>
                <div className="grid gap-3">
                  {optimizedListing.titles.map((title, index) => (
                    <motion.button
                      key={title}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => onTitleSelect(index)}
                      className={cn(
                        "w-full text-left text-[13px] font-bold border rounded-2xl px-6 py-4 transition-all duration-300 relative overflow-hidden group/btn backdrop-blur-md uppercase tracking-wide",
                        selectedTitleIndex === index
                          ? "bg-primary/20 border-primary/40 text-primary ring-1 ring-primary/20 shadow-[0_0_20px_rgba(14,165,233,0.1)]"
                          : "bg-white/5 border-white/5 text-foreground/50 hover:bg-white/10 hover:border-white/10"
                      )}
                    >
                      {selectedTitleIndex === index && (
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary shadow-[0_0_15px_rgba(14,165,233,0.8)]" />
                      )}
                      <span className={cn("relative z-10", selectedTitleIndex === index ? "italic" : "")}>{title}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ExternalLink className="w-4 h-4 text-primary" />
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Strategic Description</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyDescription}
                    className="h-8 rounded-xl bg-white/5 border border-white/10 hover:bg-primary/20 hover:text-primary px-4 transition-all"
                  >
                    <Copy className="w-3.5 h-3.5 mr-2" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Copy Payload</span>
                  </Button>
                </div>
                <div className="relative group/desc">
                  <div className="absolute -inset-1 bg-gradient-to-br from-primary/30 to-transparent rounded-[2rem] blur-xl opacity-0 group-hover/desc:opacity-100 transition-opacity duration-1000" />
                  <div className="relative text-[13px] font-bold leading-relaxed text-foreground/80 bg-black/40 border border-white/5 rounded-[2rem] p-8 max-h-72 overflow-y-auto whitespace-pre-wrap no-scrollbar shadow-inner ring-1 ring-white/5 italic">
                    {optimizedListing.description}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">High-Velocity Keywords</p>
                <div className="flex flex-wrap gap-3">
                  {optimizedListing.keywords.map((keyword, idx) => (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      key={keyword}
                      className="text-[9px] font-black bg-white/5 border border-white/10 text-foreground/70 rounded-xl px-4 py-2 uppercase tracking-widest hover:border-primary/40 hover:text-primary transition-all cursor-default shadow-lg"
                    >
                      {keyword}
                    </motion.span>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="relative mb-8">
                <div className="absolute inset-x-0 bottom-0 h-1 bg-primary/20 blur-md rounded-full scale-150 animate-pulse" />
                <PenTool className="w-16 h-16 text-muted-foreground/20 relative" />
                <motion.div 
                  animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.3, 0.1] }}
                  transition={{ duration: 5, repeat: Infinity }}
                  className="absolute inset-0 bg-primary/30 rounded-full blur-2xl"
                />
              </div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em] max-w-[240px] leading-relaxed opacity-60">
                Uplink to optimization engine to generate high-conversion tactical data
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};

export default ListingOptimizerCard;
