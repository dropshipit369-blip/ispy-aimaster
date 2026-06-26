import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, TrendingUp, DollarSign, ArrowUpRight, ShieldCheck, Target } from "lucide-react";

interface FinancialEngineCardProps {
  roi: string | number;
  totalCost: string;
  totalRevenue: string;
  totalProfit: string;
}

export const FinancialEngineCard: React.FC<FinancialEngineCardProps> = ({
  roi,
  totalCost,
  totalRevenue,
  totalProfit,
}) => {
  return (
    <Card className="border-white/10 bg-background/40 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
      {/* Dynamic scanlines and gradients */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-amber-500/5 to-success/10 opacity-30 group-hover:opacity-50 transition-opacity duration-700" />
      
      <div className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-transparent via-primary to-transparent"
          animate={{ x: ["-100%", "200%"] }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <CardContent className="p-8 relative">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-10">
          <div className="flex items-center gap-10 w-full lg:w-auto">
            <div className="relative shrink-0">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150" />
              <div className="relative flex flex-col items-center">
                <div className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-1">Yield</div>
                <div className="text-6xl font-black text-foreground tracking-tighter font-data">
                  {roi}<span className="text-3xl text-primary/60">%</span>
                </div>
                <div className="flex items-center gap-1.5 mt-2 bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
                  <TrendingUp className="w-3 h-3 text-primary" />
                  <span className="text-[9px] font-black text-primary uppercase tracking-widest">Active ROI</span>
                </div>
              </div>
            </div>

            <div className="h-20 w-px bg-white/5 hidden md:block" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 flex-1">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Target className="w-3 h-3 text-muted-foreground/40" />
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none">Capital Deployment</p>
                </div>
                <p className="text-2xl font-black text-foreground/90 font-data tracking-tight">{totalCost}</p>
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full w-[40%] bg-primary/40" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ArrowUpRight className="w-3 h-3 text-success/50" />
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none">Operational Revenue</p>
                </div>
                <p className="text-2xl font-black text-success/90 font-data tracking-tight">{totalRevenue}</p>
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full w-[60%] bg-success/40" />
                </div>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-48 p-6 bg-white/5 border border-white/5 rounded-3xl flex flex-col items-center justify-center text-center shadow-inner group/profit">
            <DollarSign className="w-6 h-6 text-primary mb-3 group-hover/profit:scale-110 transition-transform" />
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Net Extraction</p>
            <p className="text-xl font-black text-foreground font-data">{totalProfit}</p>
            <div className="mt-4 pt-4 border-t border-white/5 w-full">
              <div className="flex items-center justify-center gap-2 text-[9px] font-bold text-muted-foreground/40 uppercase">
                <ShieldCheck className="w-3 h-3" />
                Verified
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
