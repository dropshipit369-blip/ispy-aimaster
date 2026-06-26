import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  Upload,
  Sparkles,
  Barcode,
  RefreshCw,
  Layers,
  Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { EbayDraftModal } from "@/components/EbayDraftModal";
import { LiveScanV2 } from "@/components/scanner/LiveScanV2";
import { LotResultsModal } from "@/components/LotResultsModal";
import { AnalysisProgress } from "@/components/AnalysisProgress";
import { ScanHistoryPanel } from "@/components/scanner/ScanHistoryPanel";
import { SoldComparablesCard } from "@/components/scan/SoldComparablesCard";
import { MarketReportCard } from "@/components/scan/MarketReportCard";
import { PriceConfidenceCard } from "@/components/scan/PriceConfidenceCard";
import { ConfidenceBattlecard } from "@/components/scan/ConfidenceBattlecard";
import { ItemAnalysisCard } from "@/components/scan/ItemAnalysisCard";
import { ProfitStrategyCard } from "@/components/scan/ProfitStrategyCard";
import { LotBuilderInput } from "@/components/scan/LotBuilderInput";
import { ListingOptimizerCard } from "@/components/scan/ListingOptimizerCard";
import { MissionProfileSelector } from "@/components/scan/MissionProfileSelector";
import { MissionProgressTracker } from "@/components/scan/MissionProgressTracker";
import { useSubscription } from "@/hooks/useSubscription";
import { motion, AnimatePresence } from "framer-motion";
import { ScanActionFooter } from "@/components/scan/ScanActionFooter";
import { ScanMethodsGrid } from "@/components/scan/ScanMethodsGrid";
import type { MarketReportDraft, PricingStrategy, StrategyMessage, OptimizedListing, AnalysisResult, MissionProfile } from "@/lib/types";
import { invokeSupabaseFunction, parseSupabaseFunctionError } from "@/lib/supabase-functions";
import {
  buildMarketReportInsertPayload,
  getMarketVerificationMessage,
  getVerifiedSoldComparables,
  hasVerifiedMarketData,
} from "@/lib/market-report";
import { cacheScanResult, getFallbackPrice } from "@/lib/price-cache";
import { formatAud, formatAudRange } from "@/lib/utils";

interface LotItem {
  analysis: AnalysisResult;
  marketReport: MarketReportDraft;
}

interface VisionPlusItem {
  key: string;
  label: string;
  boundingBox: { x: number; y: number; width: number; height: number };
}

type UploadMode = "single" | "lot" | "barcode";

const MAX_UPLOAD_FILE_SIZE_MB = 20;
const SINGLE_UPLOAD_MAX_DIMENSION = 1700;
const LOT_UPLOAD_MAX_DIMENSION = 1400;
const BARCODE_UPLOAD_MAX_DIMENSION = 1900;
const SINGLE_UPLOAD_QUALITY = 0.84;
const LOT_UPLOAD_QUALITY = 0.72;
const BARCODE_UPLOAD_QUALITY = 0.88;
const SINGLE_MAX_DATA_URL_SIZE = 5_400_000;
const LOT_MAX_DATA_URL_SIZE = 3_600_000;
const BARCODE_MAX_DATA_URL_SIZE = 4_800_000;

export default function Scan() {
  const { user } = useAuth();
  const { planType, canUseLiveScanner, incrementScanUsage, getRemainingScans } = useSubscription();
  const navigate = useNavigate();

  // Refs for file inputs
  const singleCameraInputRef = useRef<HTMLInputElement>(null);
  const singleFileInputRef = useRef<HTMLInputElement>(null);
  const lotCameraInputRef = useRef<HTMLInputElement>(null);
  const lotFileInputRef = useRef<HTMLInputElement>(null);
  const barcodeCameraInputRef = useRef<HTMLInputElement>(null);
  const barcodeFileInputRef = useRef<HTMLInputElement>(null);

  // States
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [singleAnalysisStartTime, setSingleAnalysisStartTime] = useState<number | undefined>(undefined);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [marketReport, setMarketReport] = useState<MarketReportDraft | null>(null);
  const [purchasePrice, setPurchasePrice] = useState("");
  const [listingPrice, setListingPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [showEbayModal, setShowEbayModal] = useState(false);
  const [showLiveScanner, setShowLiveScanner] = useState(false);
  const [additionalContext, setAdditionalContext] = useState("");
  const [isRethinking, setIsRethinking] = useState(false);
  const [missionProfile, setMissionProfile] = useState<MissionProfile>('DEEP_INTEL');

  const scanMethods = [
    { id: "single", label: "Single Unit", icon: Camera, description: "Neural reconnaissance of individual assets", gradient: "from-primary/40 to-transparent", iconColor: "text-primary" },
    { id: "lot", label: "Multi Target", icon: Layers, description: "Bulk extraction from high-density arrays", gradient: "from-primary/40 to-transparent", iconColor: "text-primary" },
    { id: "barcode", label: "Registry Link", icon: Barcode, description: "Instant uplink via UPC/EAN registry", gradient: "from-primary/40 to-transparent", iconColor: "text-primary" },
    { id: "live", label: "Live Feed", icon: Zap, description: "Real-time spatial pricing overlay", gradient: "from-primary/40 to-transparent", iconColor: "text-primary" },
  ];

  const [lotImagePreview, setLotImagePreview] = useState<string | null>(null);
  const [analyzingLot, setAnalyzingLot] = useState(false);
  const [lotAnalysisStartTime, setLotAnalysisStartTime] = useState<number | undefined>(undefined);
  const [lotItems, setLotItems] = useState<LotItem[]>([]);
  const [showLotResults, setShowLotResults] = useState(false);
  const [strategy, setStrategy] = useState<PricingStrategy | null>(null);
  const [strategyChat, setStrategyChat] = useState<StrategyMessage[]>([]);
  const [strategyInput, setStrategyInput] = useState("");
  const [isStrategyLoading, setIsStrategyLoading] = useState(false);
  const [isStrategyRefining, setIsStrategyRefining] = useState(false);
  const [lotBuilderItems, setLotBuilderItems] = useState<string[]>([]);
  const [lotBuilderInput, setLotBuilderInput] = useState("");
  const [visionPlusSingleEnabled, setVisionPlusSingleEnabled] = useState(true);
  const [isVisionPlusSingleScanning, setIsVisionPlusSingleScanning] = useState(false);
  const [optimizedListing, setOptimizedListing] = useState<OptimizedListing | null>(null);
  const [isListingOptimizing, setIsListingOptimizing] = useState(false);
  const [selectedTitleIndex, setSelectedTitleIndex] = useState(0);
  const [strategyDetailExpanded, setStrategyDetailExpanded] = useState(true);
  const [uploadNotes, setUploadNotes] = useState("");
  const [lastAnalyzeError, setLastAnalyzeError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [showSingleSourcePicker, setShowSingleSourcePicker] = useState(false);
  const [showLotSourcePicker, setShowLotSourcePicker] = useState(false);
  const [showBarcodeSourcePicker, setShowBarcodeSourcePicker] = useState(false);
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);

  const refreshHistory = useCallback(() => {
    setHistoryRefreshTrigger(prev => prev + 1);
  }, []);

  const scrollViewportToTop = useCallback((behavior: ScrollBehavior = "auto") => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, left: 0, behavior });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  // Sync scroll on overlay transitions
  useEffect(() => {
    if (showSingleSourcePicker || showLotSourcePicker || showBarcodeSourcePicker || showBarcodeScanner || showLiveScanner) {
      scrollViewportToTop("auto");
    }
  }, [scrollViewportToTop, showSingleSourcePicker, showLotSourcePicker, showBarcodeSourcePicker, showBarcodeScanner, showLiveScanner]);

  useEffect(() => {
    if (imagePreview) {
      scrollViewportToTop("smooth");
    }
  }, [imagePreview, scrollViewportToTop]);

  const loadImageFromObjectUrl = (objectUrl: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Unable to process image."));
      img.src = objectUrl;
    });

  const prepareImageForUpload = async (file: File, mode: UploadMode): Promise<string> => {
    const maxDimension = mode === "lot" ? LOT_UPLOAD_MAX_DIMENSION : mode === "barcode" ? BARCODE_UPLOAD_MAX_DIMENSION : SINGLE_UPLOAD_MAX_DIMENSION;
    const initialQuality = mode === "lot" ? LOT_UPLOAD_QUALITY : mode === "barcode" ? BARCODE_UPLOAD_QUALITY : SINGLE_UPLOAD_QUALITY;
    const maxDataUrlSize = mode === "lot" ? LOT_MAX_DATA_URL_SIZE : mode === "barcode" ? BARCODE_MAX_DATA_URL_SIZE : SINGLE_MAX_DATA_URL_SIZE;

    const objectUrl = URL.createObjectURL(file);
    try {
      const img = await loadImageFromObjectUrl(objectUrl);
      const longestEdge = Math.max(img.width, img.height);
      const scale = Math.min(1, maxDimension / longestEdge);
      const targetWidth = Math.max(1, Math.round(img.width * scale));
      const targetHeight = Math.max(1, Math.round(img.height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Unable to process image.");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      let quality = initialQuality;
      let dataUrl = canvas.toDataURL("image/webp", quality);
      while (dataUrl.length > maxDataUrlSize && quality > 0.45) {
        quality = Math.max(0.45, quality - 0.08);
        dataUrl = canvas.toDataURL("image/webp", quality);
      }
      return dataUrl;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  };

  const handleSingleLikeFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, mode: UploadMode) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > MAX_UPLOAD_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`Image is too large. Max ${MAX_UPLOAD_FILE_SIZE_MB}MB.`);
      return;
    }

    try {
      setImageFile(file);
      const preparedImage = await prepareImageForUpload(file, mode);
      setImagePreview(preparedImage);
      // Reset analysis states
      setAnalysis(null);
      setMarketReport(null);
      setStrategy(null);
      setStrategyChat([]);
      setOptimizedListing(null);
      setUploadNotes("");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Processing failed.";
      toast.error(msg);
    }
  };

  const handleSingleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => handleSingleLikeFileSelect(e, "single");
  const handleBarcodeFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => handleSingleLikeFileSelect(e, "barcode");

  const handleBarcodeDetected = (code: string, format: string, snapshotDataUrl?: string) => {
    setScannedBarcode(code);
    setShowBarcodeScanner(false);
    setAnalysis(null);
    setMarketReport(null);
    setStrategy(null);
    setStrategyChat([]);
    toast.success(`Barcode detected: ${code}`);

    if (snapshotDataUrl) {
      setImagePreview(snapshotDataUrl);
      void handleAnalyze(undefined, snapshotDataUrl, code);
    }
  };

  const handleLotFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setLotAnalysisStartTime(Date.now());
    setAnalyzingLot(true);
    try {
      const preparedImage = await prepareImageForUpload(file, "lot");
      setLotImagePreview(preparedImage);
      await handleAnalyzeLot(preparedImage, true);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Lot analysis failed.";
      toast.error(msg);
      setAnalyzingLot(false);
    }
  };

  const handleAnalyzeLot = async (imageData: string, preserveStartTime = false) => {
    if (!user) return;
    if (!preserveStartTime) setLotAnalysisStartTime(Date.now());
    setAnalyzingLot(true);
    try {
      const { data, error } = await invokeSupabaseFunction<{ items: LotItem[]; totalItems: number }>("analyze-lot", { image: imageData });
      if (error) throw error;
      
      const items = data.items || [];
      for (const item of items) {
        await supabase.from("scan_logs").insert({
          user_id: user.id,
          name: item.analysis?.title || "Unknown Item",
          brand: item.analysis?.brand || null,
          model: item.analysis?.model || null,
          low_price: item.marketReport?.low_price || null,
          median_price: item.marketReport?.median_price || null,
          high_price: item.marketReport?.high_price || null,
        });
      }
      setLotItems(items);
      setShowLotResults(true);
      refreshHistory();
      toast.success(`Found ${data.totalItems} items!`);
    } catch (error: unknown) {
      const msg = await parseSupabaseFunctionError(error, "Failed to analyze lot");
      toast.error(msg);
    } finally {
      setAnalyzingLot(false);
      setLotAnalysisStartTime(undefined);
    }
  };

  const handleGenerateStrategy = async () => {
    if (!analysis || !marketReport) return;
    if (!hasVerifiedMarketData(marketReport)) {
      toast.error(getMarketVerificationMessage(marketReport));
      return;
    }
    setIsStrategyLoading(true);
    try {
      const { data, error } = await invokeSupabaseFunction<{ strategy?: PricingStrategy }>("pricing-strategy", {
        analysis,
        marketReport,
        additionalItems: lotBuilderItems.map(name => ({ name })),
      });
      if (error) throw error;
      if (!data?.strategy) throw new Error("No strategy returned.");
      setStrategy(data.strategy);
      setStrategyChat([{ role: "assistant", text: data.strategy.reasoning || "Strategy generated.", timestamp: Date.now() }]);
    } catch (error: unknown) {
      const msg = await parseSupabaseFunctionError(error, "Failed to generate strategy");
      toast.error(msg);
    } finally {
      setIsStrategyLoading(false);
    }
  };

  const handleRefineStrategy = async () => {
    if (!analysis || !strategy || !strategyInput.trim()) return;
    const userMsg: StrategyMessage = { role: "user", text: strategyInput.trim(), timestamp: Date.now() };
    setStrategyInput("");
    setStrategyChat(prev => [...prev, userMsg]);
    setIsStrategyRefining(true);
    try {
      const { data, error } = await invokeSupabaseFunction<{ strategy?: PricingStrategy }>("refine-pricing", {
        analysis,
        currentStrategy: strategy,
        userFeedback: userMsg.text,
        chatHistory: [...strategyChat, userMsg],
        marketReport,
      });
      if (error) throw error;
      if (!data?.strategy) throw new Error("No refined strategy returned.");
      setStrategy(prev => (prev ? { ...prev, ...data.strategy } : data.strategy!));
      setStrategyChat(prev => [...prev, { role: "assistant", text: data.strategy!.reasoning || "Strategy updated.", timestamp: Date.now() }]);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (error: unknown) {
      const msg = await parseSupabaseFunctionError(error, "Failed to refine strategy");
      toast.error(msg);
    } finally {
      setIsStrategyRefining(false);
    }
  };

  const handleOptimizeListing = async () => {
    if (!analysis || !strategy) return;
    setIsListingOptimizing(true);
    try {
      const { data, error } = await invokeSupabaseFunction<{ listing?: OptimizedListing }>("optimize-listing", {
        analysis,
        price: strategy.recommendedPrice,
      });
      if (error) throw error;
      if (!data?.listing) throw new Error("No listing returned.");
      setOptimizedListing(data.listing);
    } catch (error: unknown) {
      const msg = await parseSupabaseFunctionError(error, "Failed to optimize listing");
      toast.error(msg);
    } finally {
      setIsListingOptimizing(false);
    }
  };

  const cropImageToBox = (dataUrl: string, box: { x: number; y: number; width: number; height: number }): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas failure"));
        const sx = Math.max(0, Math.round(img.width * box.x));
        const sy = Math.max(0, Math.round(img.height * box.y));
        const sw = Math.max(1, Math.round(img.width * box.width));
        const sh = Math.max(1, Math.round(img.height * box.height));
        canvas.width = sw; canvas.height = sh;
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
        resolve(canvas.toDataURL("image/jpeg", 0.9));
      };
      img.src = dataUrl;
    });
  };

  const handleAnalyze = async (rethinkContext?: string, imageOverride?: string, barcodeOverride?: string | null) => {
    const imageToAnalyze = imageOverride || imagePreview;
    if (!imageToAnalyze || !user) return;

    const isRethink = !!rethinkContext;
    if (!isRethink) setSingleAnalysisStartTime(Date.now());
    if (isRethink) setIsRethinking(true); else setAnalyzing(true);
    setLastAnalyzeError(null);

    try {
      let analysisImage = imageToAnalyze;
      if (visionPlusSingleEnabled && !rethinkContext) {
        setIsVisionPlusSingleScanning(true);
        try {
          const { data, error } = await invokeSupabaseFunction<{ items?: VisionPlusItem[] }>("vision-plus", { image: imageToAnalyze });
          if (!error && data?.items?.[0]) {
            analysisImage = await cropImageToBox(imageToAnalyze, data.items[0].boundingBox);
          }
        } catch (err) { console.warn("Vision+ failed", err); } finally { setIsVisionPlusSingleScanning(false); }
      }

      const { data, error } = await invokeSupabaseFunction<{ analysis: AnalysisResult; marketReport: MarketReportDraft }>("analyze-item", {
        image: analysisImage,
        userId: user.id,
        barcode: barcodeOverride ?? scannedBarcode,
        additionalContext: rethinkContext || uploadNotes || undefined,
        missionProfile: missionProfile,
      });

      if (error) throw error;
      if (!data?.analysis || !data?.marketReport) {
        throw new Error("Analysis response missing expected fields.");
      }
      setAnalysis(data.analysis);
      setMarketReport(data.marketReport);
      setStrategy(null);
      setOptimizedListing(null);

      if (!isRethink) {
        await supabase.from("scan_logs").insert({
          user_id: user.id,
          name: data.analysis?.title || "Unknown Item",
          low_price: data.marketReport?.low_price || null,
          median_price: data.marketReport?.median_price || null,
          high_price: data.marketReport?.high_price || null,
          confidence: data.marketReport?.confidence_score || null,
        });
        refreshHistory();
      }

      toast.success(isRethink ? "Re-analysis complete!" : "Analysis complete!");
    } catch (error: unknown) {
      const msg = await parseSupabaseFunctionError(error, "Analysis failed");
      setLastAnalyzeError(msg);
      toast.error(msg);
    } finally {
      setAnalyzing(false);
      setIsRethinking(false);
      setSingleAnalysisStartTime(undefined);
    }
  };

  const handleRethink = () => {
    if (!additionalContext.trim()) return toast.error("Provide context.");
    handleAnalyze(additionalContext);
  };

  const handleSaveItem = async () => {
    if (!user || !analysis || !imagePreview) return;
    setSaving(true);
    try {
      const base64Data = imagePreview.split(",")[1];
      const byteArray = new Uint8Array(atob(base64Data).split("").map(c => c.charCodeAt(0)));
      const blob = new Blob([byteArray], { type: "image/jpeg" });
      const fileName = `${user.id}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage.from("item-images").upload(fileName, blob);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("item-images").getPublicUrl(fileName);
      
      const { data: item, error: itemError } = await supabase.from("items").insert({
        user_id: user.id, image_url: urlData.publicUrl, title: analysis.title, brand: analysis.brand,
        model: analysis.model, category: analysis.category, purchase_price: purchasePrice ? parseFloat(purchasePrice) : null,
        barcode: scannedBarcode || null, notes: uploadNotes.trim() || null, status: "pending"
      }).select().single();
      if (itemError) throw itemError;

      if (marketReport && item) {
        await supabase.from("market_reports").insert(buildMarketReportInsertPayload(marketReport, item.id, listingPrice));
      }
      refreshHistory();
      toast.success("Intelligence Logged", {
        description: "Asset successfully synchronized with command center.",
        action: {
          label: "View Inventory",
          onClick: () => navigate("/inventory")
        }
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Save failed.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleAddLotBuilderItem = () => {
    if (!lotBuilderInput.trim()) return;
    setLotBuilderItems(prev => [...prev, lotBuilderInput.trim()]);
    setLotBuilderInput("");
  };

  const handleRemoveLotBuilderItem = (idx: number) => setLotBuilderItems(prev => prev.filter((_, i) => i !== idx));

  const verifiedMarketDataAvailable = useMemo(() => hasVerifiedMarketData(marketReport), [marketReport]);
  const marketVerificationMessage = useMemo(() => getMarketVerificationMessage(marketReport), [marketReport]);
  const soldComparableExamples = useMemo(() => getVerifiedSoldComparables(marketReport).slice(0, 8), [marketReport]);


  return (
    <Layout>
      <div className="relative min-h-screen bg-background text-foreground overflow-hidden">
        {/* Tactical Grid Background */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]" />
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-primary/10 to-transparent opacity-30" />
          <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[150px] opacity-20" />
        </div>

        <div className="relative z-10 container max-w-7xl mx-auto px-4 py-12 space-y-12">
          {/* Operational Header */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-12 border-b border-white/5">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-1 bg-primary rounded-full shadow-[0_0_10px_rgba(14,165,233,0.5)]" />
                <Badge className="bg-primary/10 text-primary border-primary/20 font-black tracking-[0.3em] uppercase text-[10px] px-3">Mission Alpha</Badge>
              </div>
              <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-foreground font-display italic uppercase text-shimmer">
                Intelligence <span className="text-primary/80">Recon</span>
              </h1>
              <p className="text-xs font-black text-muted-foreground uppercase tracking-[0.5em] opacity-50">Advanced Asset Scanning & Market Synthesis Node</p>
            </div>
            
            <div className="flex items-center gap-6 bg-white/5 backdrop-blur-xl rounded-[2rem] p-6 border border-white/5 shadow-2xl">
              <div className="text-right">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 opacity-40">Operational Quota</p>
                <p className="text-2xl font-black text-foreground tabular-nums">{getRemainingScans()} <span className="text-[10px] text-primary">UNIT REMS</span></p>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
                <RefreshCw className="w-6 h-6 text-primary animate-pulse" />
              </div>
            </div>
          </motion.div>

          {/* Onboarding CTA — shown in empty state */}
          {!imagePreview && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative group cursor-pointer"
              onClick={() => setShowSingleSourcePicker(true)}
              role="button"
              tabIndex={0}
              aria-label="Start your first scan"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setShowSingleSourcePicker(true);
                }
              }}
            >
              <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-[3rem] opacity-30 group-hover:opacity-50 transition-opacity" />
              <Card className="relative bg-background/40 border-primary/30 backdrop-blur-3xl rounded-[3rem] overflow-hidden p-8 flex flex-col md:flex-row items-center gap-8 group-hover:border-primary/50 transition-all">
                <div className="p-6 rounded-2xl bg-primary/10 border border-primary/20">
                  <Sparkles className="w-12 h-12 text-primary animate-pulse" />
                </div>
                <div className="flex-1 text-center md:text-left space-y-2">
                  <h3 className="text-2xl font-black uppercase tracking-tight">Your Mission Begins Here</h3>
                  <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider opacity-60">Scan your first asset to unlock real-time profit telemetry & market intelligence.</p>
                </div>
                <Button variant="premium" className="h-16 px-10 rounded-2xl text-[10px] tracking-[0.2em]">
                  START FIRST RECON
                </Button>
              </Card>
            </motion.div>
          )}

          <div className="grid lg:grid-cols-12 gap-10">
            {/* Primary Analysis Column */}
            <div className="lg:col-span-8 space-y-10">
              <AnimatePresence mode="wait">
                {!imagePreview ? (
                  <motion.div key="methods" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="space-y-10">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-1 h-4 bg-primary rounded-full shadow-[0_0_10px_rgba(14,165,233,0.5)]" />
                        <h2 className="text-[11px] font-black tracking-[0.4em] uppercase text-foreground/60">Tactical Mission Profile</h2>
                      </div>
                      <MissionProfileSelector 
                        selected={missionProfile} 
                        onSelect={setMissionProfile} 
                      />
                    </div>

                      <ScanMethodsGrid 
                        methods={scanMethods}
                        onMethodClick={(id) => {
                          if (id === "single") setShowSingleSourcePicker(true);
                          if (id === "lot") setShowLotSourcePicker(true);
                          if (id === "barcode") setShowBarcodeSourcePicker(true);
                          if (id === "live") {
                            if (!canUseLiveScanner().allowed) return toast.error("Pro feature required.");
                            setShowLiveScanner(true);
                          }
                        }}
                        analyzingLot={analyzingLot}
                        canUseLiveScanner={canUseLiveScanner}
                        getRemainingScans={getRemainingScans}
                        planType={planType}
                      />
                    
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="max-w-2xl mx-auto w-full"
                    >
                      <LotBuilderInput 
                        lotBuilderInput={lotBuilderInput}
                        setLotBuilderInput={setLotBuilderInput}
                        lotBuilderItems={lotBuilderItems}
                        onAddItem={handleAddLotBuilderItem}
                        onRemoveItem={handleRemoveLotBuilderItem}
                      />
                    </motion.div>
                    
                    <div className="grid md:grid-cols-2 gap-6 opacity-60">
                      <Card className="bg-white/5 border-white/5 rounded-[2rem] p-8 space-y-4">
                        <div className="p-4 w-fit rounded-2xl bg-primary/10 border border-primary/20"><Layers className="w-6 h-6 text-primary" /></div>
                        <h4 className="font-black text-xs uppercase tracking-widest">Multi-Target Protocol</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">Extract value from high-density arrays. Ideal for inventory bulk intake.</p>
                      </Card>
                      <Card className="bg-white/5 border-white/5 rounded-[2rem] p-8 space-y-4">
                        <div className="p-4 w-fit rounded-2xl bg-primary/10 border border-primary/20"><Zap className="w-6 h-6 text-primary" /></div>
                        <h4 className="font-black text-xs uppercase tracking-widest">Neural Live Link</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">Real-time object detection and pricing overlay via mobile uplink.</p>
                      </Card>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
                    {/* Visual Capture Card */}
                    <Card className="bg-black/40 border-primary/20 backdrop-blur-3xl rounded-[3rem] overflow-hidden shadow-2xl relative">
                      <div className="aspect-[21/9] relative overflow-hidden">
                        <img src={imagePreview} alt="Asset" className="w-full h-full object-cover grayscale-[0.3] brightness-75 transition-all duration-700 hover:grayscale-0" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                        {/* Target Markers */}
                        <div className="absolute top-8 left-8 space-y-2">
                          <p className="text-[10px] font-black text-primary uppercase tracking-[0.5em] drop-shadow-md">Visual Signature Locked</p>
                          <p className="text-2xl font-black text-white uppercase tracking-tighter italic">Ready for Analysis</p>
                        </div>
                        <div className="absolute top-8 right-8">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setImagePreview(null)}
                            aria-label="Clear image and restart scan"
                            className="rounded-xl bg-black/40 border border-white/10 text-white/60 hover:text-white backdrop-blur-md h-8 text-[9px] font-black uppercase tracking-widest"
                          >
                            Abort
                          </Button>
                        </div>
                      </div>

                      {!analysis && (
                        <CardContent className="p-12 text-center">
                          <AnalysisProgress isAnalyzing={analyzing} startTime={singleAnalysisStartTime} type="single" />
                          {!analyzing && (
                            <div className="mt-8 space-y-6">
                              {lastAnalyzeError && (
                                <div
                                  role="alert"
                                  className="max-w-xl mx-auto flex items-start gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/30 text-left"
                                >
                                  <div className="p-2 rounded-xl bg-destructive/20 border border-destructive/30 shrink-0">
                                    <RefreshCw className="w-4 h-4 text-destructive" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-destructive mb-1">
                                      Analysis Failed
                                    </p>
                                    <p className="text-xs font-bold text-foreground/80 leading-relaxed">{lastAnalyzeError}</p>
                                  </div>
                                </div>
                              )}
                              <Button
                                onClick={() => handleAnalyze()}
                                aria-label={lastAnalyzeError ? "Retry analysis" : "Start analysis"}
                                className="px-12 h-16 rounded-[2rem] bg-primary hover:bg-primary/90 text-primary-foreground font-black text-lg uppercase tracking-widest shadow-[0_0_40px_rgba(14,165,233,0.3)] transition-all active:scale-95 group"
                              >
                                {lastAnalyzeError ? (
                                  <>
                                    <RefreshCw className="w-6 h-6 mr-4 group-hover:rotate-180 transition-transform" />
                                    Retry Neural Uplink
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="w-6 h-6 mr-4 group-hover:rotate-12 transition-transform" />
                                    Initiate Neural Uplink
                                  </>
                                )}
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      )}
                    </Card>

                    {analysis && (
                      <div className="space-y-10">
                        {verifiedMarketDataAvailable && (
                          <PriceConfidenceCard
                            analysis={analysis}
                            marketReport={marketReport}
                            comparables={soldComparableExamples}
                          />
                        )}

                        {strategy && (
                          <ConfidenceBattlecard
                            strategy={strategy}
                            marketReport={marketReport}
                            comparables={soldComparableExamples}
                          />
                        )}

                        <div className="grid md:grid-cols-2 gap-10">
                          <div className="space-y-10">
                            <ItemAnalysisCard analysis={analysis} />
                            <MarketReportCard
                              marketReport={marketReport}
                              verifiedMarketDataAvailable={verifiedMarketDataAvailable}
                              marketVerificationMessage={marketVerificationMessage}
                              analysis={analysis}
                            />
                            <SoldComparablesCard
                              comparables={soldComparableExamples}
                              analysisHint={analysis}
                            />
                          </div>
                          <div className="space-y-10">
                            <ProfitStrategyCard
                              strategy={strategy}
                              marketReport={marketReport}
                              verifiedMarketDataAvailable={verifiedMarketDataAvailable}
                              marketVerificationMessage={marketVerificationMessage}
                              isStrategyLoading={isStrategyLoading}
                              handleGenerateStrategy={handleGenerateStrategy}
                              strategyDetailExpanded={strategyDetailExpanded}
                              setStrategyDetailExpanded={setStrategyDetailExpanded}
                              strategyChat={strategyChat}
                              isStrategyRefining={isStrategyRefining}
                              chatEndRef={chatEndRef}
                              strategyInput={strategyInput}
                              setStrategyInput={setStrategyInput}
                              handleRefineStrategy={handleRefineStrategy}
                            />
                            <ListingOptimizerCard
                              optimizedListing={optimizedListing}
                              isListingOptimizing={isListingOptimizing}
                              onOptimize={handleOptimizeListing}
                              selectedTitleIndex={selectedTitleIndex}
                              onTitleSelect={setSelectedTitleIndex}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Tactical Sidebar */}
            <div className="lg:col-span-4 space-y-10">
              <MissionProgressTracker
                hasImage={!!imagePreview}
                hasAnalysis={!!analysis}
                hasVerifiedData={verifiedMarketDataAvailable}
                hasStrategy={!!strategy}
                onUpgrade={() => navigate('/membership')}
              />

              <ScanHistoryPanel userId={user!.id} refreshTrigger={historyRefreshTrigger} />
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <AnimatePresence>
          {analysis && (
            <ScanActionFooter 
              analysis={analysis}
              marketReport={marketReport}
              onRethink={handleRethink} 
              onSave={handleSaveItem} 
              onEbayDraft={() => setShowEbayModal(true)} 
              saving={saving}
              purchasePrice={purchasePrice} 
              setPurchasePrice={setPurchasePrice} 
              listingPrice={listingPrice} 
              setListingPrice={setListingPrice}
              isRethinking={isRethinking}
              verifiedMarketDataAvailable={verifiedMarketDataAvailable}
              marketVerificationMessage={marketVerificationMessage}
              defaultProfitPlatform="ebay"
            />
          )}
        </AnimatePresence>

        {/* Modals & Inputs */}
        <LotResultsModal 
          open={showLotResults} 
          onOpenChange={setShowLotResults} 
          items={lotItems} 
          imagePreview={imagePreview || ""} 
          userId={user!.id}
        />
        {analysis && (
          <EbayDraftModal
            open={showEbayModal}
            onOpenChange={setShowEbayModal}
            analysis={analysis}
            marketReport={marketReport}
          />
        )}
        {showBarcodeScanner && (
          <BarcodeScanner 
            onClose={() => setShowBarcodeScanner(false)} 
            onBarcodeDetected={handleBarcodeDetected} 
          />
        )}
        {showLiveScanner && (
          <LiveScanV2 
            onClose={() => setShowLiveScanner(false)} 
            userId={user!.id}
          />
        )}

        <AnimatePresence>
          {showSingleSourcePicker && <SourcePicker title="Tactical Recon" onClose={() => setShowSingleSourcePicker(false)} onCamera={() => singleCameraInputRef.current?.click()} onUpload={() => singleFileInputRef.current?.click()} />}
          {showLotSourcePicker && <SourcePicker title="Bulk Logistics" onClose={() => setShowLotSourcePicker(false)} onCamera={() => lotCameraInputRef.current?.click()} onUpload={() => lotFileInputRef.current?.click()} />}
          {showBarcodeSourcePicker && <SourcePicker title="Trace Protocol" onClose={() => setShowBarcodeSourcePicker(false)} onCamera={() => barcodeCameraInputRef.current?.click()} onUpload={() => barcodeFileInputRef.current?.click()} />}
        </AnimatePresence>

        <input type="file" accept="image/*" capture="environment" ref={singleCameraInputRef} onChange={handleSingleFileSelect} className="hidden" aria-label="Camera Recon" title="Camera Recon" />
        <input type="file" accept="image/*" ref={singleFileInputRef} onChange={handleSingleFileSelect} className="hidden" aria-label="Upload Scan" title="Upload Scan" />
        <input type="file" accept="image/*" capture="environment" ref={lotCameraInputRef} onChange={handleLotFileSelect} className="hidden" aria-label="Bulk Camera" title="Bulk Camera" />
        <input type="file" accept="image/*" ref={lotFileInputRef} onChange={handleLotFileSelect} className="hidden" aria-label="Bulk Upload" title="Bulk Upload" />
        <input type="file" accept="image/*" capture="environment" ref={barcodeCameraInputRef} onChange={handleBarcodeFileSelect} className="hidden" aria-label="Barcode Camera" title="Barcode Camera" />
        <input type="file" accept="image/*" ref={barcodeFileInputRef} onChange={handleBarcodeFileSelect} className="hidden" aria-label="Barcode Upload" title="Barcode Upload" />
        
        <FeedbackWidget />
      </div>
    </Layout>
  );
}

const SourcePicker = ({ title, onClose, onCamera, onUpload }: { title: string, onClose: () => void, onCamera: () => void, onUpload: () => void }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-3xl">
    <div className="absolute inset-0" onClick={onClose} />
    <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="relative bg-background border border-white/10 rounded-[3rem] p-12 max-w-lg w-full shadow-2xl overflow-hidden">
      <div className="absolute top-0 left-0 w-1.5 h-full bg-primary shadow-[0_0_20px_rgba(14,165,233,0.5)]" />
      <div className="absolute -top-32 -right-32 w-64 h-64 bg-primary/10 rounded-full blur-[100px]" />
      <div className="relative space-y-10">
        <div className="text-center space-y-3">
          <Badge className="bg-primary/10 text-primary border-primary/20 font-black tracking-widest uppercase text-[9px] px-3 py-1">Interface Select</Badge>
          <h2 className="text-4xl font-black text-foreground uppercase tracking-tight">{title}</h2>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <Button onClick={() => { onCamera(); onClose(); }} className="flex flex-col h-48 gap-4 rounded-3xl bg-white/5 border border-white/10 hover:bg-primary/20 hover:border-primary/40 transition-all group">
            <div className="p-5 rounded-2xl bg-primary/10 group-hover:scale-110 transition-transform shadow-inner border border-primary/20"><Camera className="w-10 h-10 text-primary shadow-[0_0_10px_rgba(14,165,233,0.3)]" /></div>
            <span className="font-black text-[10px] uppercase tracking-[0.3em]">Device Sensor</span>
          </Button>
          <Button onClick={() => { onUpload(); onClose(); }} className="flex flex-col h-48 gap-4 rounded-3xl bg-white/5 border border-white/10 hover:bg-primary/20 hover:border-primary/40 transition-all group">
            <div className="p-5 rounded-2xl bg-primary/10 group-hover:scale-110 transition-transform shadow-inner border border-primary/20"><Upload className="w-10 h-10 text-primary shadow-[0_0_10px_rgba(14,165,233,0.3)]" /></div>
            <span className="font-black text-[10px] uppercase tracking-[0.3em]">Data Stream</span>
          </Button>
        </div>
        <Button variant="ghost" onClick={onClose} className="w-full h-14 rounded-2xl font-black text-[10px] uppercase tracking-[0.5em] hover:bg-white/5 text-muted-foreground/60 transition-all">Abort Uplink</Button>
      </div>
    </motion.div>
  </motion.div>
);
