import { useMemo } from "react";
import { motion } from "framer-motion";
import { Shield, ShieldCheck, ShieldAlert, TrendingUp, TrendingDown, BarChart2, Target, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { calculatePriceConfidence } from "@/lib/ebay";
import type { PricingStrategy, MarketReportDraft, SoldComparable } from "@/lib/types";

interface ConfidenceBattlecardProps {
  strategy: PricingStrategy;
  marketReport: MarketReportDraft | null;
  comparables: SoldComparable[];
}

export function ConfidenceBattlecard({ strategy, marketReport, comparables }: ConfidenceBattlecardProps) {
  const compsStats = useMemo(() => calculatePriceConfidence(comparables), [comparables]);

  const aiScore = strategy.deepAnalysis?.flipScore ?? 0;
  const marketScore = typeof marketReport?.confidence_score === "number" ? marketReport.confidence_score : 0;
  const compsScore = compsStats.confidenceScore;
  const trendScore =
    marketReport?.price_trend === "up" ? 90 :
    marketReport?.price_trend === "stable" ? 65 :
    marketReport?.price_trend === "down" ? 30 : 50;

  // Weighted overall: AI 35% · market evidence 35% · comps quality 20% · trend 10%
  const overall = Math.round(aiScore * 0.35 + marketScore * 0.35 + compsScore * 0.20 + trendScore * 0.10);

  const tier = overall >= 75 ? "ALPHA" : overall >= 55 ? "BRAVO" : overall >= 35 ? "CHARLIE" : "DELTA";
  const tierLabel =
    tier === "ALPHA" ? "High confidence — full send" :
    tier === "BRAVO" ? "Good confidence — proceed" :
    tier === "CHARLIE" ? "Mixed signals — verify first" :
    "Low confidence — manual check";
  const tierColor =
    overall >= 75 ? "text-success" :
    overall >= 55 ? "text-primary" :
    overall >= 35 ? "text-warning" : "text-destructive";
  const tierBorder =
    overall >= 75 ? "border-success/30" :
    overall >= 55 ? "border-primary/30" :
    overall >= 35 ? "border-warning/30" : "border-destructive/30";
  const tierAccent =
    overall >= 75 ? "from-success/60 via-success/20 to-transparent" :
    overall >= 55 ? "from-primary/60 via-primary/20 to-transparent" :
    overall >= 35 ? "from-warning/60 via-warning/20 to-transparent" :
    "from-destructive/60 via-destructive/20 to-transparent";
  const ShieldIcon = overall >= 75 ? ShieldCheck : overall >= 35 ? Shield : ShieldAlert;

  const signals = [
    {
      label: "AI Flip Score",
      value: aiScore,
      Icon: Zap,
      sub: aiScore >= 70 ? "Strong opportunity" : aiScore >= 50 ? "Moderate opportunity" : "Weak opportunity",
    },
    {
      label: "Market Evidence",
      value: marketScore,
      Icon: BarChart2,
      sub: marketScore >= 70 ? "Strong market data" : marketScore >= 50 ? "Adequate data" : "Limited data",
    },
    {
      label: "Comps Quality",
      value: compsScore,
      Icon: Target,
      sub: compsStats.count > 0 ? `${compsStats.count} sold comp${compsStats.count === 1 ? "" : "s"}` : "No comps found",
    },
    {
      label: "Price Trend",
      value: trendScore,
      Icon: marketReport?.price_trend === "down" ? TrendingDown : TrendingUp,
      sub:
        marketReport?.price_trend === "up" ? "Rising demand" :
        marketReport?.price_trend === "down" ? "Prices falling" :
        "Stable market",
    },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
      <Card className={cn("relative overflow-hidden rounded-[2.5rem] border backdrop-blur-3xl shadow-2xl bg-background/40", tierBorder)}>
        <div className={cn("absolute top-0 left-0 w-1 h-full bg-gradient-to-b", tierAccent)} />
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-[100px] -mr-16 -mt-16 pointer-events-none" />

        <CardContent className="relative p-8 md:p-10 space-y-8">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground opacity-60">
                Confidence Battlecard
              </p>
              <div className="flex items-center gap-4">
                <p className={cn("text-6xl font-black tracking-tighter tabular-nums italic drop-shadow-2xl", tierColor)}>
                  {overall}%
                </p>
                <div className="space-y-1">
                  <Badge className={cn("font-black uppercase tracking-widest text-[10px] px-3 py-1 border bg-transparent", tierBorder, tierColor)}>
                    {tier} CLEARANCE
                  </Badge>
                  <p className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest">{tierLabel}</p>
                </div>
              </div>
            </div>
            <div className={cn("p-3 rounded-2xl border shadow-inner bg-background/40", tierBorder)}>
              <ShieldIcon className={cn("w-8 h-8", tierColor)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {signals.map(({ label, value, Icon, sub }) => {
              const sigColor = value >= 70 ? "text-success" : value >= 50 ? "text-primary" : "text-warning";
              const barColor = value >= 70 ? "bg-success" : value >= 50 ? "bg-primary" : "bg-warning";
              return (
                <div key={label} className="bg-background/40 border border-white/5 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={cn("w-3.5 h-3.5 shrink-0", sigColor)} />
                      <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70">{label}</span>
                    </div>
                    <span className={cn("text-sm font-black tabular-nums shrink-0", sigColor)}>{value}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${value}%` }}
                      transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                      className={cn("h-full rounded-full", barColor)}
                    />
                  </div>
                  <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider">{sub}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
