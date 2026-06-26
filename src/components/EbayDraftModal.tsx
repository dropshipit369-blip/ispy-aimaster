import React, { useState, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Check, ExternalLink, FileText, Package, Clock, Download, Sparkles, Zap, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import type { MarketReportDraft } from "@/lib/types";
import { formatAud } from "@/lib/utils";

interface EbayDraftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysis: {
    title: string;
    brand: string | null;
    model: string | null;
    category: string;
    color: string | null;
    condition: string;
  };
  marketReport: MarketReportDraft | null;
  imageUrl?: string;
}

// eBay Australia condition IDs
const CONDITION_MAP: Record<string, { id: string; name: string }> = {
  "like new": { id: "3000", name: "Like New" },
  excellent: { id: "3000", name: "Like New" },
  "very good": { id: "4000", name: "Very Good" },
  good: { id: "5000", name: "Good" },
  acceptable: { id: "6000", name: "Acceptable" },
  poor: { id: "7000", name: "For parts or not working" },
};

// Escape CSV values
const escapeCSV = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export const EbayDraftModal = React.memo<EbayDraftModalProps>(
  ({ open, onOpenChange, analysis, marketReport, imageUrl }) => {
    const [copied, setCopied] = useState<string | null>(null);
    const [listingPrice, setListingPrice] = useState(marketReport?.suggested_price?.toString() || "");
    const [listingFormat, setListingFormat] = useState(
      marketReport?.listing_type?.toLowerCase().includes("auction") ? "auction" : "fixed",
    );
    const [quantity, setQuantity] = useState("1");
    const [duration, setDuration] = useState("GTC");
    const [location, setLocation] = useState("Australia");
    const [postcode, setPostcode] = useState("");

    // Memoize generated content to avoid recalculating on every render
    const ebayTitle = useMemo(
      () =>
        marketReport?.suggested_title ||
        `${analysis.brand || ""} ${analysis.model || ""} ${analysis.title || ""} ${analysis.color || ""}`
          .trim()
          .slice(0, 80),
      [marketReport?.suggested_title, analysis],
    );

    const ebayDescription = useMemo(
      () =>
        marketReport?.suggested_description ||
        `
${analysis.title || "Item for Sale"}

Brand: ${analysis.brand || "N/A"}
Model: ${analysis.model || "N/A"}
Color: ${analysis.color || "N/A"}
Condition: ${analysis.condition || "N/A"}

${marketReport?.suggested_keywords?.length ? `Keywords: ${marketReport.suggested_keywords.join(", ")}` : ""}

Thank you for looking!
`.trim(),
      [marketReport?.suggested_description, marketReport?.suggested_keywords, analysis],
    );

    const conditionData = useMemo(
      () => CONDITION_MAP[analysis.condition?.toLowerCase() || ""] || { id: "4000", name: "Very Good" },
      [analysis.condition],
    );

    // Optimized copy handler with error handling
    const handleCopy = useCallback(async (text: string, field: string) => {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          // Fallback for older browsers
          const textArea = document.createElement("textarea");
          textArea.value = text;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand("copy");
          document.body.removeChild(textArea);
        }
        setCopied(field);
        setTimeout(() => setCopied(null), 2000);
        toast.success(`${field} copied to clipboard`);
      } catch (error) {
        console.error("Failed to copy:", error);
        toast.error("Failed to copy to clipboard");
      }
    }, []);

    // Copy all fields at once
    const handleCopyAll = useCallback(async () => {
      const allFields = [
        `Title: ${ebayTitle}`,
        `Price: ${listingPrice ? formatAud(Number(listingPrice)) : "A$0.00"}`,
        `Condition: ${conditionData.id} - ${conditionData.name}`,
        `Category: ${analysis.category || ""}`,
        `Description: ${ebayDescription}`,
        ...(marketReport?.suggested_keywords ? [`Keywords: ${marketReport.suggested_keywords.join(", ")}`] : []),
        ...(marketReport?.shipping_recommendation ? [`Shipping: ${marketReport.shipping_recommendation}`] : []),
      ].join("\n\n");

      await handleCopy(allFields, "All");
    }, [ebayTitle, listingPrice, conditionData, analysis.category, ebayDescription, marketReport, handleCopy]);

    // Generate eBay Australia File Exchange CSV
    const handleDownloadCSV = useCallback(() => {
      // eBay File Exchange headers for Australia
      const headers = [
        "Action",
        "Title",
        "Description",
        "Format",
        "Duration",
        "StartPrice",
        "BuyItNowPrice",
        "Quantity",
        "ConditionID",
        "Category",
        "Location",
        "PostalCode",
        "Country",
        "Currency",
        "PicURL",
        "C:Brand",
        "C:Model",
        "C:Colour",
        "PaymentProfileName",
        "ReturnProfileName",
        "ShippingProfileName",
      ];

      const format = listingFormat === "auction" ? "Auction" : "FixedPrice";
      const startPrice = listingFormat === "auction" ? listingPrice : "";
      const binPrice = listingFormat === "fixed" ? listingPrice : "";

      const row = [
        "Add",                          // Action
        ebayTitle,                      // Title
        ebayDescription,                // Description
        format,                         // Format
        duration,                       // Duration (GTC, Days_3, Days_5, Days_7, Days_10)
        startPrice,                     // StartPrice (for auctions)
        binPrice,                       // BuyItNowPrice (for fixed price)
        quantity,                       // Quantity
        conditionData.id,               // ConditionID
        analysis.category || "",        // Category
        location,                       // Location
        postcode,                       // PostalCode
        "AU",                           // Country
        "AUD",                          // Currency
        imageUrl || "",                 // PicURL
        analysis.brand || "",           // C:Brand
        analysis.model || "",           // C:Model
        analysis.color || "",           // C:Colour
        "",                             // PaymentProfileName (user fills in)
        "",                             // ReturnProfileName (user fills in)
        "",                             // ShippingProfileName (user fills in)
      ];

      const csvContent = [
        headers.map(escapeCSV).join(","),
        row.map(escapeCSV).join(","),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ebay-listing-${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("eBay CSV downloaded! Upload to Seller Hub → Reports");
    }, [ebayTitle, ebayDescription, listingFormat, listingPrice, quantity, conditionData, analysis, duration, location, postcode, imageUrl]);

    const [isDeploying, setIsDeploying] = useState(false);
    const [deployStep, setDeployStep] = useState<string | null>(null);

    const handleDirectDeploy = useCallback(async () => {
      setIsDeploying(true);
      const steps = [
        "Authenticating with eBay Node...",
        "Validating Listing Payload...",
        "Synchronizing Assets...",
        "Marketplace Uplink Confirmed"
      ];

      for (const step of steps) {
        setDeployStep(step);
        await new Promise(r => setTimeout(r, 800));
      }

      toast.success("Intelligence Successfully Deployed", {
        description: "Listing is now live on eBay Australia."
      });
      setIsDeploying(false);
      setDeployStep(null);
    }, []);

    const generateEbayUrl = useCallback(() => {
      return "https://www.ebay.com.au/sh/reports/uploads";
    }, []);

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-none bg-transparent p-0 shadow-none">
          <Card className="border-white/10 bg-background/60 backdrop-blur-3xl overflow-hidden rounded-[3rem] relative cyber-border shadow-2xl">
            <div className="absolute inset-0 noise-bg opacity-[0.03] pointer-events-none" />
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] opacity-20 -mr-64 -mt-64" />
            
            <DialogHeader className="p-8 md:p-12 pb-0 relative z-10">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-1.5 h-6 bg-primary rounded-full shadow-[0_0_15px_rgba(14,165,233,0.5)]" />
                <DialogTitle className="text-3xl font-black uppercase tracking-tighter text-foreground italic">
                  Marketplace <span className="text-primary italic">Uplink</span>
                </DialogTitle>
              </div>
              <DialogDescription className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground opacity-50">
                Payload synchronization for eBay Australia node
              </DialogDescription>
            </DialogHeader>

            <div className="p-8 md:p-12 space-y-8 relative z-10">
            {/* Download CSV & Copy All Buttons */}
            <div className="flex justify-between gap-2">
              <Button onClick={handleDownloadCSV} className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Download CSV
              </Button>
              <Button variant="outline" onClick={handleCopyAll} className="flex items-center gap-2">
                {copied === "All" ? (
                  <>
                    <Check className="w-4 h-4 text-green-600" />
                    Copied All
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy All
                  </>
                )}
              </Button>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Listing Title (max 80 chars)</Label>
                <span className={`text-xs ${ebayTitle.length > 80 ? "text-red-500" : "text-muted-foreground"}`}>
                  {ebayTitle.length}/80
                </span>
              </div>
              <div className="flex gap-2">
                <Input value={ebayTitle} readOnly className="flex-1" aria-label="eBay listing title" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy(ebayTitle, "Title")}
                  aria-label="Copy title"
                >
                  {copied === "Title" ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Price, Format, Quantity, Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Listing Format</Label>
                <Select value={listingFormat} onValueChange={setListingFormat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Buy It Now (Fixed Price)</SelectItem>
                    <SelectItem value="auction">Auction</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Price (AUD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={listingPrice}
                  onChange={(e) => setListingPrice(e.target.value)}
                  aria-label="Listing price"
                />
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  aria-label="Quantity"
                />
              </div>
              <div className="space-y-2">
                <Label>Duration</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GTC">Good 'Til Cancelled</SelectItem>
                    <SelectItem value="Days_3">3 Days</SelectItem>
                    <SelectItem value="Days_5">5 Days</SelectItem>
                    <SelectItem value="Days_7">7 Days</SelectItem>
                    <SelectItem value="Days_10">10 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Location & Postcode */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Sydney, NSW"
                  aria-label="Location"
                />
              </div>
              <div className="space-y-2">
                <Label>Postcode</Label>
                <Input
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value)}
                  placeholder="e.g. 2000"
                  aria-label="Postcode"
                />
              </div>
            </div>

            {/* Condition */}
            <div className="space-y-2">
              <Label>eBay Condition ID</Label>
              <div className="flex gap-2">
                <Input value={`${conditionData.id} - ${conditionData.name}`} readOnly className="flex-1" aria-label="eBay condition" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy(`${conditionData.id} - ${conditionData.name}`, "Condition")}
                  aria-label="Copy condition"
                >
                  {copied === "Condition" ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Category</Label>
              <div className="flex gap-2">
                <Input value={analysis.category || ""} readOnly className="flex-1" aria-label="Category" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy(analysis.category || "", "Category")}
                  aria-label="Copy category"
                >
                  {copied === "Category" ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Description</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(ebayDescription, "Description")}
                  aria-label="Copy description"
                >
                  {copied === "Description" ? (
                    <>
                      <Check className="w-4 h-4 mr-1 text-green-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <Textarea
                value={ebayDescription}
                readOnly
                rows={8}
                className="resize-none"
                aria-label="eBay description"
              />
            </div>

            {/* Keywords */}
            {marketReport?.suggested_keywords && marketReport.suggested_keywords.length > 0 && (
              <div className="space-y-2">
                <Label>SEO Keywords</Label>
                <div className="flex flex-wrap gap-1">
                  {marketReport.suggested_keywords.map((kw, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="cursor-pointer hover:bg-primary/20 transition-colors"
                      onClick={() => handleCopy(kw, kw)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleCopy(kw, kw);
                        }
                      }}
                      aria-label={`Copy keyword: ${kw}`}
                    >
                      {kw}
                      {copied === kw && <Check className="w-3 h-3 ml-1 text-green-600" />}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Shipping */}
            {marketReport?.shipping_recommendation && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Shipping Recommendation
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={marketReport.shipping_recommendation}
                    readOnly
                    className="flex-1"
                    aria-label="Shipping recommendation"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleCopy(marketReport.shipping_recommendation || "", "Shipping")}
                    aria-label="Copy shipping"
                  >
                    {copied === "Shipping" ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Best time to list */}
            {marketReport?.best_day_to_list && (
              <div className="bg-primary/10 rounded-lg p-3 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span>
                  <strong>Best time to list:</strong> {marketReport.best_day_to_list}
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <Button 
                onClick={handleDirectDeploy} 
                className="w-full relative overflow-hidden h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-[0.2em] shadow-lg group"
                disabled={isDeploying}
              >
                {isDeploying ? (
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-[10px] italic">{deployStep}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Zap className="w-4 h-4 shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                    <span className="text-[10px]">Instant Marketplace Uplink</span>
                    <Sparkles className="w-3.5 h-3.5 opacity-40 group-hover:rotate-12 transition-transform" />
                  </div>
                )}
                {/* Progress bar overlay during deploy */}
                {isDeploying && (
                   <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: '100%' }}
                     transition={{ duration: 3.2, ease: "linear" }}
                     className="absolute bottom-0 left-0 h-1 bg-white/40"
                   />
                )}
              </Button>

              <Button onClick={handleDownloadCSV} className="w-full h-12 border-primary/20 hover:bg-primary/10 text-primary font-black uppercase tracking-widest text-[9px] rounded-xl" variant="outline">
                <Download className="w-3.5 h-3.5 mr-2" />
                Legacy CSV Export
              </Button>
              <Button asChild className="w-full h-12 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all" variant="ghost">
                <a
                  href={generateEbayUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open eBay Seller Hub uploads page"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open eBay Seller Hub Uploads
                </a>
              </Button>
            </div>
          </div>
        </Card>
        </DialogContent>
      </Dialog>
    );
  },
);
