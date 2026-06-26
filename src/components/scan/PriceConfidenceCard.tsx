import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Shield, TrendingUp, Target, ShieldCheck, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";
import { ResponsiveContainer, LineChart, Line, ReferenceLine, Tooltip, YAxis } from "recharts";
import { formatAud, cn } from "@/lib/utils";
import {
  buildEbaySearchQuery,
  buildEbaySoldUrl,
  buildEbayActiveUrl,
  calculatePriceConfidence,
  type PriceConfidenceStats,
} from "@/lib/ebay";
import type { MarketReportDraft, AnalysisResult, SoldComparable } from "@/lib/types";

interface PriceConfidenceCardProps {
  analysis: AnalysisResult | null;
  marketReport: MarketReportDraft | null;
  comparables: SoldComparable[];
}

const confidenceVisual: Record<
  PriceConfidenceStats["confidenceLevel"],
  { label: string; color: string; bg: string; border: string; icon: typeof Shield }
> = {
  HIGH: {
    label: "High Confidence",
    color: "text-success",
    bg: "bg-success/10",
    border: "border-success/40",
    icon: ShieldCheck,
  },
  MEDIUM: {
    label: "Medium Confidence",
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/40",
    icon: Shield,
  },
  LOW: {
    label: "Low Confidence",
    color: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/40",
    icon: ShieldAlert,
  },
  NONE: {
    label: "No Market Data",
    color: "text-muted-foreground",
    bg: "bg-muted/10",
    border: "border-border/40",
    icon: ShieldAlert,
  },
};

export function PriceConfidenceCard({
  analysis,
  marketReport,
  comparables,
}: PriceConfidenceCardProps) {
  const stats = useMemo(() => calculatePriceConfidence(comparables), [comparables]);
  const suggestedPrice = marketReport?.suggested_price ?? marketReport?.median_price ?? null;

  const ebayQuery = useMemo(
    () =>
      buildEbaySearchQuery({
        title: analysis?.title,
        brand: analysis?.brand,
        model: analysis?.model,
      }),
    [analysis?.title, analysis?.brand, analysis?.model],
  );

  const soldUrl = ebayQuery ? buildEbaySoldUrl(ebayQuery) : null;
  const activeUrl = ebayQuery ? buildEbayActiveUrl(ebayQuery) : null;

  const ebayDataSource = marketReport?.data_sources?.ebay;
  const activeListingCount =
    typeof ebayDataSource?.listings === "number" ? ebayDataSource.listings : null;

  if (stats.count === 0 || suggestedPrice === null) return null;

  const visual = confidenceVisual[stats.confidenceLevel];
  const IconComp = visual.icon;

  const chartData = stats.prices.map((price, idx) => ({
    idx,
    price,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
    >
      <Card
        className={cn(
          "relative overflow-hidden rounded-[2.5rem] border backdrop-blur-3xl shadow-2xl",
          "bg-background/40",
          visual.border,
        )}
      >
        <div
          className={cn(
            "absolute top-0 left-0 w-1 h-full bg-gradient-to-b",
            stats.confidenceLevel === "HIGH"
              ? "from-success/60 via-success/20 to-transparent"
              : stats.confidenceLevel === "MEDIUM"
                ? "from-primary/60 via-primary/20 to-transparent"
                : "from-warning/60 via-warning/20 to-transparent",
          )}
        />
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[120px] -mr-24 -mt-24 pointer-events-none" />

        <CardContent className="relative p-8 md:p-10 space-y-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-xl border shadow-inner", visual.bg, visual.border)}>
                  <IconComp className={cn("w-4 h-4", visual.color)} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground opacity-60">
                    Market-Verified Target
                  </p>
                  <p
                    className={cn(
                      "text-[11px] font-black uppercase tracking-[0.3em]",
                      visual.color,
                    )}
                  >
                    {visual.label}
                  </p>
                </div>
              </div>
              <div className="flex items-baseline gap-4">
                <p className="text-6xl md:text-7xl font-black tracking-tighter tabular-nums font-display italic drop-shadow-2xl">
                  {formatAud(suggestedPrice)}
                </p>
                <Badge
                  className={cn(
                    "font-black uppercase tracking-widest text-[10px] px-3 py-1 border",
                    visual.bg,
                    visual.border,
                    visual.color,
                  )}
                >
                  {stats.confidenceScore}% conf
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-widest bg-white/5 border-white/10 text-foreground/70">
                  <Target className="w-3 h-3 mr-1.5" />
                  {stats.count} sold comp{stats.count === 1 ? "" : "s"}
                </Badge>
                {activeListingCount !== null && activeListingCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] font-black uppercase tracking-widest bg-white/5 border-white/10 text-foreground/70"
                  >
                    <TrendingUp className="w-3 h-3 mr-1.5" />
                    {activeListingCount} live listings
                  </Badge>
                )}
                <Badge
                  variant="secondary"
                  className="text-[10px] font-black uppercase tracking-widest bg-white/5 border-white/10 text-foreground/70"
                >
                  Spread ±{Math.round(stats.coefficientOfVariation * 100)}%
                </Badge>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row md:flex-col gap-3 md:min-w-[200px]">
              {soldUrl && (
                <Button
                  asChild
                  variant="outline"
                  className="h-12 rounded-2xl border-success/30 bg-success/10 hover:bg-success/20 text-success font-black text-[10px] uppercase tracking-[0.25em] justify-center"
                >
                  <a href={soldUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Sold on eBay
                  </a>
                </Button>
              )}
              {activeUrl && (
                <Button
                  asChild
                  variant="outline"
                  className="h-12 rounded-2xl border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary font-black text-[10px] uppercase tracking-[0.25em] justify-center"
                >
                  <a href={activeUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Active on eBay
                  </a>
                </Button>
              )}
            </div>
          </div>

          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[9px] font-black uppercase tracking-[0.4em] text-muted-foreground opacity-60">
                Sold Price Distribution
              </p>
              <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground/70">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  Sold
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-[2px] bg-success" />
                  Target
                </span>
              </div>
            </div>
            <div className="h-24 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                  <YAxis hide domain={["dataMin", "dataMax"]} />
                  <Tooltip
                    cursor={{ stroke: "hsl(var(--primary))", strokeOpacity: 0.2 }}
                    contentStyle={{
                      background: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.75rem",
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "6px 10px",
                    }}
                    formatter={(value: number) => [formatAud(value), "Sold"]}
                    labelFormatter={() => ""}
                  />
                  <ReferenceLine
                    y={suggestedPrice}
                    stroke="hsl(var(--success))"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "hsl(var(--primary))", stroke: "hsl(var(--background))", strokeWidth: 1 }}
                    activeDot={{ r: 5 }}
                    isAnimationActive
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Floor", value: stats.low },
              { label: "Median", value: stats.median, highlight: true },
              { label: "Ceiling", value: stats.high },
            ].map((stat) => (
              <div
                key={stat.label}
                className={cn(
                  "rounded-2xl border p-4 text-center",
                  stat.highlight
                    ? "bg-primary/10 border-primary/30"
                    : "bg-background/60 border-border/40",
                )}
              >
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">
                  {stat.label}
                </p>
                <p
                  className={cn(
                    "font-black text-sm tabular-nums",
                    stat.highlight ? "text-primary" : "text-foreground/90",
                  )}
                >
                  {formatAud(stat.value)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
