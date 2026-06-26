import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Layers, Zap, Barcode, Lock, Crown, Loader2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface ScanMethod {
  id: string;
  icon: any;
  label: string;
  description: string;
  gradient: string;
  iconColor: string;
}

interface ScanMethodsGridProps {
  methods: ScanMethod[];
  onMethodClick: (id: string) => void;
  analyzingLot: boolean;
  canUseLiveScanner: () => { allowed: boolean; reason?: string };
  getRemainingScans: () => number;
  planType: string;
}

export function ScanMethodsGrid({
  methods,
  onMethodClick,
  analyzingLot,
  canUseLiveScanner,
  getRemainingScans,
  planType,
}: ScanMethodsGridProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", damping: 20, stiffness: 100 }}
      className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8 mb-12"
    >
      {methods.map((method, index) => {
        const isLive = method.id === "live";
        const isLot = method.id === "lot";
        const { allowed: liveAllowed } = canUseLiveScanner();
        const isLocked = isLive && !liveAllowed;
        const remainingScans = getRemainingScans();

        return (
          <motion.button
            key={method.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.08, type: "spring", damping: 12 }}
            whileHover={{ y: -10, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onMethodClick(method.id)}
            disabled={isLot && analyzingLot}
            className={`group relative p-8 md:p-10 rounded-[3rem] border-2 border-border/20 overflow-hidden transition-all duration-500 bg-background/40 backdrop-blur-3xl shadow-xl hover:shadow-[0_20px_50px_-10px_rgba(14,165,233,0.3)] hover:border-primary/40`}
          >
            {/* Tactical Grid Overlay */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
            
            {/* Dynamic Light Beam */}
            <div className={`absolute -inset-2 opacity-0 group-hover:opacity-30 blur-3xl transition-opacity duration-1000 bg-gradient-to-br ${method.gradient}`} />
            
            <div className="relative flex flex-col items-center text-center gap-6">
              {/* Status Indicators */}
              <div className="absolute -top-4 -right-4 flex flex-col items-end gap-2">
                {isLocked && (
                  <div className="p-2 rounded-2xl bg-warning/20 border border-warning/30 shadow-lg backdrop-blur-xl">
                    <Lock className="w-4 h-4 text-warning" />
                  </div>
                )}
                {isLive && liveAllowed && planType === "pro" && (
                  <Badge className="bg-primary/20 text-primary border-primary/20 font-black text-[10px] px-3 py-1 uppercase tracking-widest shadow-lg">
                    {remainingScans} UNIT REMS
                  </Badge>
                )}
                {isLive && planType === "unlimited" && (
                  <div className="p-2 rounded-2xl bg-warning/20 border border-warning/30 shadow-lg animate-pulse">
                    <Crown className="w-4 h-4 text-warning" />
                  </div>
                )}
              </div>

              {/* Central Processor Icon */}
              <div className={`relative p-5 rounded-[2rem] bg-black/40 border border-white/5 group-hover:scale-110 group-hover:bg-primary/10 group-hover:border-primary/40 transition-all duration-700 shadow-2xl overflow-hidden`}>
                <div className={`absolute inset-0 bg-gradient-to-br ${method.gradient} opacity-0 group-hover:opacity-20 transition-opacity`} />
                {isLot && analyzingLot ? (
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                ) : (
                  <method.icon className={`w-8 h-8 ${method.iconColor} group-hover:scale-125 transition-transform duration-700 group-hover:brightness-125`} />
                )}
              </div>

              <div className="space-y-2">
                <h3 className="font-black text-sm md:text-lg uppercase tracking-[0.4em] text-foreground font-display group-hover:text-primary transition-colors italic">
                  <span>{method.label.split(" ")[0]}</span>
                  {method.label.split(" ")[1] && <span className="text-muted-foreground/40 group-hover:text-primary/60 ml-2">{method.label.split(" ")[1]}</span>}
                </h3>
                <p className="text-[10px] md:text-xs font-black text-muted-foreground uppercase tracking-widest leading-relaxed opacity-60 group-hover:opacity-100 transition-opacity">
                  {isLocked ? "ACCESS RESTRICTED" : method.description}
                </p>
              </div>

              {/* Interaction Hint */}
              <div className="pt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="flex items-center gap-1.5 text-[8px] font-black text-primary uppercase tracking-[0.3em]">
                  <Sparkles className="w-3 h-3" />
                  Establish Link
                </div>
              </div>
            </div>

            {/* Tactical Corner Accents */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-tl-[3rem]" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-br-[3rem]" />
          </motion.button>
        );
      })}
    </motion.div>
  );
}
