import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, RefreshCw, ExternalLink, CheckCircle2, Wallet, Tag, Info, AlertTriangle, Sparkles } from "lucide-react";
import { ProfitCalculator } from "@/components/ProfitCalculator";
import type { AnalysisResult, MarketReportDraft } from "@/lib/types";

interface ScanActionFooterProps {
  analysis: AnalysisResult | null;
  marketReport: MarketReportDraft | null;
  purchasePrice: string;
  setPurchasePrice: (val: string) => void;
  listingPrice: string;
  setListingPrice: (val: string) => void;
  onSave: () => Promise<void>;
  onEbayDraft: () => void;
  onRethink: (context: string) => void;
  saving: boolean;
  isRethinking: boolean;
  verifiedMarketDataAvailable: boolean;
  marketVerificationMessage: string;
  defaultProfitPlatform: string;
}

export function ScanActionFooter({
  analysis,
  marketReport,
  purchasePrice,
  setPurchasePrice,
  listingPrice,
  setListingPrice,
  onSave,
  onEbayDraft,
  onRethink,
  saving,
  isRethinking,
  verifiedMarketDataAvailable,
  marketVerificationMessage,
  defaultProfitPlatform,
}: ScanActionFooterProps) {
  const [additionalContext, setAdditionalContext] = useState("");
  const [isFocused, setIsFocused] = useState<string | null>(null);

  if (!analysis || !marketReport) return null;

  const handleRethinkSubmit = () => {
    if (!additionalContext.trim()) return;
    onRethink(additionalContext);
    setAdditionalContext("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pb-12"
    >
      <Card className="border-primary/30 bg-black/40 backdrop-blur-3xl shadow-[0_0_100px_-20px_rgba(14,165,233,0.1)] overflow-hidden rounded-[3rem] relative ring-1 ring-white/10">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[120px] opacity-30 -mr-48 -mt-48" />
        
        <CardContent className="p-8 md:p-12 space-y-12">
          {/* Tactical Header Overlay */}
          <div className="flex items-center gap-4 mb-2">
            <div className="w-1.5 h-6 bg-primary rounded-full shadow-[0_0_15px_rgba(14,165,233,0.5)]" />
            <h4 className="font-black text-xs uppercase tracking-[0.5em] text-foreground italic">Execution Protocol</h4>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-4 group">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-primary" />
                  <Label className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">Investment Cost</Label>
                </div>
                <span className="text-[9px] font-black text-primary/40 uppercase tracking-widest leading-none">Primary Cost</span>
              </div>
              <div className={`relative transition-all duration-500 ${isFocused === 'purchase' ? 'scale-[1.03]' : ''}`}>
                <div className={`absolute -inset-1 bg-gradient-to-r from-primary to-transparent rounded-2xl blur-md transition-opacity duration-500 ${isFocused === 'purchase' ? 'opacity-20' : 'opacity-0'}`} />
                <div className="relative flex items-center">
                  <span className="absolute left-6 font-black text-primary/40 text-xl tracking-tighter">$</span>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={purchasePrice}
                    onFocus={() => setIsFocused('purchase')}
                    onBlur={() => setIsFocused(null)}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    className="pl-12 h-20 bg-white/5 border-white/10 focus:border-primary/50 focus:ring-primary/20 rounded-2xl font-black text-2xl tabular-nums shadow-2xl transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 group text-right md:text-left">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-success" />
                  <Label className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">Listing Price</Label>
                </div>
                <span className="text-[9px] font-black text-success/40 uppercase tracking-widest leading-none">Realized Value</span>
              </div>
              <div className={`relative transition-all duration-500 ${isFocused === 'listing' ? 'scale-[1.03]' : ''}`}>
                <div className={`absolute -inset-1 bg-gradient-to-r from-success to-transparent rounded-2xl blur-md transition-opacity duration-500 ${isFocused === 'listing' ? 'opacity-20' : 'opacity-0'}`} />
                <div className="relative flex items-center">
                  <span className="absolute left-6 font-black text-success/40 text-xl tracking-tighter">$</span>
                  <Input
                    type="number"
                    placeholder={marketReport.suggested_price?.toFixed(2) || "0.00"}
                    value={listingPrice}
                    onFocus={() => setIsFocused('listing')}
                    onBlur={() => setIsFocused(null)}
                    onChange={(e) => setListingPrice(e.target.value)}
                    className="pl-12 h-20 bg-white/5 border-white/10 focus:border-success/50 focus:ring-success/20 rounded-2xl font-black text-2xl tabular-nums shadow-2xl transition-all"
                  />
                </div>
              </div>
              {!verifiedMarketDataAvailable && (
                <div className="flex items-center justify-end md:justify-start gap-2 mt-3 px-2 text-warning italic">
                  <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
                  <p className="text-[10px] font-black uppercase tracking-widest">{marketVerificationMessage}</p>
                </div>
              )}
            </div>
          </div>

          {/* Profit Synthesis Card */}
          <div className="relative pt-6">
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <ProfitCalculator
              suggestedPrice={verifiedMarketDataAvailable ? marketReport.suggested_price ?? marketReport.median_price ?? undefined : undefined}
              lowPrice={verifiedMarketDataAvailable ? marketReport.low_price ?? undefined : undefined}
              highPrice={verifiedMarketDataAvailable ? marketReport.high_price ?? undefined : undefined}
              defaultPlatform={defaultProfitPlatform}
              initialCostPrice={purchasePrice}
              initialSellingPrice={listingPrice}
              onCostPriceChange={setPurchasePrice}
              onSellingPriceChange={setListingPrice}
            />
          </div>

          {/* Strategic Commits */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Button 
              variant="outline" 
              className="h-20 rounded-[1.5rem] border-white/10 bg-white/5 backdrop-blur-3xl hover:bg-white/10 hover:border-primary/40 transition-all font-black uppercase tracking-[0.4em] text-[10px] group shadow-xl"
              onClick={onEbayDraft}
            >
              <ExternalLink className="w-5 h-5 mr-4 text-primary group-hover:scale-125 transition-transform" />
              Prepare Marketplace Uplink
            </Button>
            <Button
              className="h-20 rounded-[1.5rem] bg-gradient-to-r from-primary via-info to-primary bg-[length:200%_auto] hover:bg-right text-primary-foreground font-black uppercase tracking-[0.5em] text-[11px] shadow-[0_20px_40px_-10px_rgba(14,165,233,0.3)] transition-all duration-700 active:scale-[0.98] group relative overflow-hidden"
              onClick={onSave}
              disabled={saving}
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <AnimatePresence mode="wait">
                {saving ? (
                  <motion.div key="saving" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-center"><Loader2 className="w-6 h-6 mr-4 animate-spin" /> Committing Log...</motion.div>
                ) : (
                  <motion.div key="ready" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-center"><CheckCircle2 className="w-6 h-6 mr-4 group-hover:rotate-12 transition-transform" /> Finalize Asset Recon</motion.div>
                )}
              </AnimatePresence>
            </Button>
          </div>
        </CardContent>

        {/* Correction Feedback Loop */}
        <div className="bg-white/5 border-t border-white/10 p-8 md:p-12 relative overflow-hidden">
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -mr-32 -mb-32" />
          <div className="relative space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin-slow" />
                <Label className="text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground italic">Feedback Re-Optimization</Label>
              </div>
              <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest border-white/10 text-muted-foreground/40">Active Neural Link</Badge>
            </div>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 relative group">
                <div className="absolute -inset-1 bg-primary/20 rounded-[1.5rem] blur opacity-0 group-focus-within:opacity-100 transition duration-1000" />
                <Textarea
                  placeholder="Identify missed details, condition adjustments, or model variations for neural recalibration..."
                  value={additionalContext}
                  onChange={(e) => setAdditionalContext(e.target.value)}
                  className="relative min-h-[100px] bg-black/40 border-white/10 rounded-[1.5rem] p-6 text-sm font-black uppercase tracking-wider placeholder:text-muted-foreground/30 transition-all focus:border-primary/50 shadow-inner leading-relaxed"
                />
              </div>
              <Button
                variant="outline"
                onClick={handleRethinkSubmit}
                disabled={isRethinking || !additionalContext.trim()}
                className="h-auto px-10 border-white/10 bg-white/5 hover:bg-primary/20 hover:border-primary/40 rounded-[1.5rem] transition-all shrink-0 group relative overflow-hidden"
              >
                <div className="relative flex flex-col items-center gap-3">
                  {isRethinking ? (
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  ) : (
                    <>
                      <Sparkles className="w-8 h-8 text-primary group-hover:scale-125 transition-transform duration-500 shadow-[0_0_15px_rgba(14,165,233,0.3)]" />
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Optimize</span>
                    </>
                  )}
                </div>
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
