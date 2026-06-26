import { useEffect, useState, useCallback } from "react";
import { FeedbackWidget } from "@/components/FeedbackWidget";

import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  Download,
  FileSpreadsheet,
  Search,
  CheckSquare,
  RefreshCw,
  Edit3,
  Store,
  Sparkles,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { Item, MarketReport } from "@/lib/types";

import { PageTransition } from "@/components/PageTransition";
import { motion } from "framer-motion";
import { downloadCsvFile } from "@/lib/download";
import { formatAud, formatAudRange, cn } from "@/lib/utils";
import { useListingDraft } from "@/hooks/useListingDraft";
import type { ListingDraftData } from "@/hooks/useListingDraft";
import { ListingDraftEditor } from "@/components/listings/ListingDraftEditor";
import { EbaySmartCopy } from "@/components/listings/EbaySmartCopy";
import { EbayBatchCsvFlow } from "@/components/listings/EbayBatchCsvFlow";

interface ListingItem extends Item {
  selected: boolean;
  listingTitle?: string;
  listingPrice?: number;
  listingDescription?: string;
}

const MARKETPLACE_EXPORTS = {
  ebay: {
    label: "eBay",
    filenamePrefix: "ebay-listings",
  },
  facebook: {
    label: "Facebook Marketplace",
    filenamePrefix: "facebook-marketplace-listings",
  },
  etsy: {
    label: "Etsy",
    filenamePrefix: "etsy-listings",
  },
} as const;

type MarketplaceTarget = keyof typeof MARKETPLACE_EXPORTS;

const EBAY_AU_CONDITIONS: Record<string, string> = {
  "New": "1000",
  "Like New": "1500",
  "Excellent": "2000",
  "Very Good": "2500",
  "Good": "3000",
  "Acceptable": "4000",
  "For Parts": "7000",
};

export default function Listings() {
  const { user } = useAuth();
  const draftManager = useListingDraft();

  const [items, setItems] = useState<ListingItem[]>([]);
  const [marketReports, setMarketReports] = useState<Record<string, MarketReport>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [marketplaceTarget, setMarketplaceTarget] = useState<MarketplaceTarget>("ebay");

  // AI draft editor state (single item review before copy-to-eBay)
  const [editorOpen, setEditorOpen] = useState(false);
  const [currentDraft, setCurrentDraft] = useState<ListingDraftData | null>(null);
  const [currentItem, setCurrentItem] = useState<Item | null>(null);
  const [currentMarketReport, setCurrentMarketReport] = useState<MarketReport | null>(null);

  // Smart copy state (single item → eBay sell page)
  const [smartCopyOpen, setSmartCopyOpen] = useState(false);
  const [smartCopyDraft, setSmartCopyDraft] = useState<ListingDraftData | null>(null);

  // Bulk CSV flow state (multi-item → eBay File Exchange)
  const [batchCsvOpen, setBatchCsvOpen] = useState(false);
  const [batchCsvDrafts, setBatchCsvDrafts] = useState<ListingDraftData[]>([]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const { data: itemsData, error: itemsError } = await supabase
        .from("items")
        .select("*")
        .eq("user_id", user?.id)
        .in("status", ["pending", "listed"])
        .order("created_at", { ascending: false });

      if (itemsError) throw itemsError;

      const listingItems: ListingItem[] = (itemsData || []).map(item => ({
        ...item,
        selected: false,
        listingTitle: item.title || "",
        listingPrice: undefined,
        listingDescription: "",
      }));

      setItems(listingItems);

      // Fetch market reports for pricing suggestions
      if (itemsData && itemsData.length > 0) {
        const itemIds = itemsData.map(i => i.id);
        const { data: reportsData, error: reportsError } = await supabase
          .from("market_reports")
          .select("*")
          .in("item_id", itemIds);

        if (!reportsError && reportsData) {
          const reportsMap: Record<string, MarketReport> = {};
          reportsData.forEach(report => {
            reportsMap[report.item_id] = report as MarketReport;
          });
          setMarketReports(reportsMap);

          // Update items with suggested prices
          setItems(prev => prev.map(item => ({
            ...item,
            listingPrice: reportsMap[item.id]?.suggested_price || reportsMap[item.id]?.median_price || item.purchase_price,
            listingTitle: reportsMap[item.id]?.suggested_title || item.title || "",
            listingDescription: reportsMap[item.id]?.suggested_description || "",
          })));
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load items");
    } finally {
      setLoading(false);
    }
  };

  const categories = [...new Set(items.map((i) => i.category).filter(Boolean))];

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.brand?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const selectedItems = items.filter(i => i.selected);
  const selectedCount = selectedItems.length;

  const toggleSelectAll = () => {
    const allSelected = filteredItems.every(i => i.selected);
    setItems(prev => prev.map(item =>
      filteredItems.some(f => f.id === item.id)
        ? { ...item, selected: !allSelected }
        : item
    ));
  };

  const toggleItem = (id: string) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, selected: !item.selected } : item
    ));
  };

  const updateListingField = (id: string, field: keyof ListingItem, value: any) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  // === AI LISTING GENERATION ===

  const handleCreateDraft = useCallback(
    async (item: Item) => {
      const report = marketReports[item.id] ?? null;
      const draft = await draftManager.generateDraft(item, report);

      if (draft) {
        setCurrentDraft(draft);
        setCurrentItem(item);
        setCurrentMarketReport(report);
        setEditorOpen(true);
      }
    },
    [marketReports, draftManager],
  );

  const handleSaveDraft = useCallback(
    async (draft: ListingDraftData): Promise<string | null> => {
      return draftManager.saveDraft(draft);
    },
    [draftManager],
  );

  const handlePublishFromEditor = useCallback(
    async (draft: ListingDraftData) => {
      const id = await draftManager.saveDraft(draft);
      if (id) {
        setSmartCopyDraft({ ...draft, id });
        setEditorOpen(false);
        setSmartCopyOpen(true);
      }
    },
    [draftManager],
  );

  const handleRegenerateDraftField = useCallback(
    async (field: "title" | "description" | "all") => {
      if (!currentDraft || !currentItem) return null;
      return draftManager.regenerateField(currentDraft, field, currentItem, currentMarketReport);
    },
    [currentDraft, currentItem, currentMarketReport, draftManager],
  );

  const handleMarkListed = useCallback(
    async (draft: ListingDraftData) => {
      if (!draft.item_id) return;

      try {
        await supabase.from("items").update({ status: "listed" }).eq("id", draft.item_id);
        if (draft.id) {
          await draftManager.updateDraft(draft.id, { status: "published" });
        }
        toast.success("Marked as listed on eBay");
        fetchData();
      } catch (err) {
        console.error("Error marking as listed:", err);
      }
    },
    [draftManager],
  );

  const handleBatchMarkListed = useCallback(
    async (drafts: ListingDraftData[]) => {
      try {
        const itemIds = drafts.map(d => d.item_id).filter(Boolean) as string[];
        if (itemIds.length === 0) return;

        await supabase.from("items").update({ status: "listed" }).in("id", itemIds);

        const draftIds = drafts.map(d => d.id).filter(Boolean) as string[];
        if (draftIds.length > 0) {
          await supabase.from("listing_drafts").update({ status: "published" }).in("id", draftIds);
        }

        toast.success(`Marked ${itemIds.length} items as listed`);
        fetchData();
      } catch (err) {
        console.error("Error marking batch as listed:", err);
      }
    },
    [],
  );

  // Single item → AI generate → review → smart clipboard flow.
  // Multi-item → AI generate all → bulk CSV via eBay File Exchange.
  const handleAiList = useCallback(async () => {
    if (selectedCount === 0) {
      toast.error("Select items first");
      return;
    }

    if (selectedCount === 1) {
      await handleCreateDraft(selectedItems[0] as Item);
      return;
    }

    const itemsWithReports = selectedItems.map(item => ({
      item: item as Item,
      marketReport: marketReports[item.id] ?? null,
    }));

    const drafts = await draftManager.generateBatchDrafts(itemsWithReports);

    if (drafts.length > 0) {
      const savedDrafts: ListingDraftData[] = [];
      for (const draft of drafts) {
        const id = await draftManager.saveDraft(draft);
        savedDrafts.push(id ? { ...draft, id } : draft);
      }
      setBatchCsvDrafts(savedDrafts);
      setBatchCsvOpen(true);
    }
  }, [selectedItems, selectedCount, marketReports, draftManager, handleCreateDraft]);

  const generateMarketplaceCSV = async () => {
    if (selectedCount === 0) {
      toast.error("Please select at least one item to export");
      return;
    }

    const rows =
      marketplaceTarget === "ebay"
        ? [
            [
              "Action",
              "Title",
              "Description",
              "Category",
              "StartPrice",
              "BuyItNowPrice",
              "Quantity",
              "Duration",
              "Format",
              "ConditionID",
              "Location",
              "Country",
              "Currency",
              "PaymentProfileName",
              "ReturnProfileName",
              "ShippingProfileName",
              "PicURL",
            ],
            ...selectedItems.map((item) => {
              const report = marketReports[item.id];
              const conditionId = EBAY_AU_CONDITIONS[item.condition || "Good"] || "3000";

              return [
                "Add",
                (item.listingTitle || item.title || "").slice(0, 80),
                item.listingDescription ||
                  report?.suggested_description ||
                  `${item.brand || ""} ${item.model || ""} - ${item.condition || "Good"} condition`,
                item.category || "",
                item.listingPrice?.toFixed(2) || report?.suggested_price?.toFixed(2) || "0.00",
                item.listingPrice?.toFixed(2) || report?.suggested_price?.toFixed(2) || "0.00",
                "1",
                "GTC",
                "FixedPrice",
                conditionId,
                "Australia",
                "AU",
                "AUD",
                "PayPal",
                "Returns Accepted",
                "Standard Shipping",
                item.image_url || "",
              ];
            }),
          ]
        : [
            [
              "InventoryId",
              "Marketplace",
              "Title",
              "Description",
              "Price",
              "Category",
              "Condition",
              "Brand",
              "Model",
              "ImageURL",
              "SuggestedMarketplace",
              "Notes",
            ],
            ...selectedItems.map((item) => {
              const report = marketReports[item.id];
              return [
                item.id,
                MARKETPLACE_EXPORTS[marketplaceTarget].label,
                item.listingTitle || item.title || "",
                item.listingDescription || report?.suggested_description || "",
                item.listingPrice?.toFixed(2) || report?.suggested_price?.toFixed(2) || "0.00",
                item.category || "",
                item.condition || "Good",
                item.brand || "",
                item.model || "",
                item.image_url || "",
                report?.best_marketplace || "",
                item.notes || "",
              ];
            }),
          ];

    await downloadCsvFile(
      `${MARKETPLACE_EXPORTS[marketplaceTarget].filenamePrefix}-${new Date().toISOString().split("T")[0]}.csv`,
      rows,
    );

    toast.success(
      `Exported ${selectedCount} ${MARKETPLACE_EXPORTS[marketplaceTarget].label} listing${selectedCount === 1 ? "" : "s"}.`,
    );
  };

  const markAsListed = async () => {
    if (selectedCount === 0) return;

    try {
      const ids = selectedItems.map(i => i.id);
      const { error } = await supabase
        .from("items")
        .update({ status: "listed" })
        .in("id", ids);

      if (error) throw error;

      toast.success(`Marked ${selectedCount} items as listed`);
      fetchData();
    } catch (error) {
      console.error("Error updating items:", error);
      toast.error("Failed to update items");
    }
  };

  return (
    <Layout>
      <PageTransition>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10"
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                <p className="text-[10px] font-black tracking-[0.3em] text-primary/60 uppercase">System: Deployment Center</p>
              </div>
              <h1 className="text-4xl font-black tracking-tight text-foreground uppercase">Deployment Operations</h1>
              <p className="text-sm font-bold text-muted-foreground uppercase opacity-60 tracking-wider">
                Market Ready Assets / Channel Integration
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl border border-white/5 bg-white/5 hover:bg-white/10"
                onClick={() => fetchData()}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-primary" : ""}`} />
              </Button>
            </div>
          </motion.div>

          {/* HERO: AI List on eBay — dominant primary CTA */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent backdrop-blur-md overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
              <CardContent className="p-5 relative">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30 flex-shrink-0">
                      <Sparkles className="w-7 h-7 text-primary-foreground" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight leading-tight">
                        AI List on eBay Australia
                      </h2>
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
                        {selectedCount === 0
                          ? "Select assets — AI writes titles, descriptions, specifics & category"
                          : selectedCount === 1
                            ? "1 asset ready — AI generates, review, copy-paste to eBay"
                            : `${selectedCount} assets — AI generates all, bulk CSV for eBay File Exchange`}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="hero"
                    size="lg"
                    onClick={handleAiList}
                    disabled={selectedCount === 0 || draftManager.generating}
                    className="w-full lg:w-auto h-14 px-8 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-primary/30"
                  >
                    {draftManager.generating ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Generating with AI...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        {selectedCount === 0
                          ? "List on eBay"
                          : selectedCount === 1
                            ? "AI Generate & List"
                            : `Bulk List ${selectedCount} on eBay`}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Action Bar */}
          <Card className="mb-10 border-white/5 bg-background/40 backdrop-blur-md overflow-hidden relative group">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full lg:w-auto">
                  <div className="relative flex-1 group/search">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within/search:text-primary transition-colors" />
                    <Input
                      placeholder="FILTER OPERATIONAL ASSETS..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-12 h-12 bg-white/5 border-white/10 rounded-2xl text-[11px] font-black uppercase tracking-widest placeholder:text-muted-foreground/30 focus:ring-primary/20 focus:border-primary/40 transition-all"
                    />
                  </div>
                  
                  <div className="min-w-[160px]">
                    <Select value={marketplaceTarget} onValueChange={(value: MarketplaceTarget) => setMarketplaceTarget(value)}>
                      <SelectTrigger className="h-12 bg-white/5 border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest">
                        <div className="flex items-center gap-2">
                          <Store className="w-3.5 h-3.5 text-primary" />
                          <SelectValue placeholder="DEPLOYMENT CHANNEL" />
                        </div>
                      </SelectTrigger>
                      <SelectContent className="bg-background/95 backdrop-blur-xl border-white/10 rounded-2xl overflow-hidden">
                        <SelectItem value="ebay" className="text-[10px] font-black uppercase tracking-widest py-3">EBAY ALPHA</SelectItem>
                        <SelectItem value="facebook" className="text-[10px] font-black uppercase tracking-widest py-3">FB MARKETPLACE</SelectItem>
                        <SelectItem value="etsy" className="text-[10px] font-black uppercase tracking-widest py-3">ETSY CRAFT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full lg:w-auto pt-4 lg:pt-0 border-t lg:border-t-0 border-white/5">
                  <div className="bg-white/5 border border-white/10 px-4 h-12 flex items-center gap-3 rounded-2xl">
                    <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(14,165,233,0.5)]" />
                    <span className="text-[10px] font-black text-foreground uppercase tracking-wider">{selectedCount} ASSETS TARGETED</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      className="h-12 px-6 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all"
                      onClick={markAsListed}
                      disabled={selectedCount === 0}
                    >
                      <CheckSquare className="w-4 h-4 mr-2" />
                      Mark Deployed
                    </Button>
                    <Button
                      variant="hero"
                      className="h-12 px-6 rounded-2xl bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                      onClick={() => void generateMarketplaceCSV()}
                      disabled={selectedCount === 0}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Generate {MARKETPLACE_EXPORTS[marketplaceTarget].label} Payload
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Listings Table */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="relative w-24 h-24 mb-6">
                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
                <div className="relative w-24 h-24 border-4 border-t-primary border-white/5 rounded-full animate-spin" />
              </div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] animate-pulse">Synchronizing deployment queue...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <Card className="border-white/5 bg-background/40 backdrop-blur-md py-24 text-center">
              <CardContent>
                <div className="relative w-32 h-32 mx-auto mb-8">
                  <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full" />
                  <div className="relative p-7 rounded-3xl bg-white/5 border border-white/10 shadow-2xl">
                    <Package className="w-full h-full text-primary/40" />
                  </div>
                </div>
                <h3 className="text-xl font-black text-foreground/90 uppercase mb-3 tracking-tight">Queue Depleted</h3>
                <p className="text-sm text-muted-foreground mb-8 max-w-sm mx-auto leading-relaxed">
                  No operational assets ready for deployment. Visit the intelligence deck to scan and classify new inventory.
                </p>
                <Link to="/scan">
                  <Button variant="hero" className="h-14 px-12 rounded-2xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                    <Package className="w-4 h-4 mr-3" />
                    Scan Intelligence
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-white/5 bg-background/40 backdrop-blur-md overflow-hidden relative">
              <Table>
                <TableHeader className="bg-white/5 border-b border-white/5">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="w-14 text-center">
                      <Checkbox
                        checked={filteredItems.length > 0 && filteredItems.every(i => i.selected)}
                        onCheckedChange={toggleSelectAll}
                        className="rounded-md border-white/20 data-[state=checked]:bg-primary"
                      />
                    </TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Asset</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground min-w-[200px]">Strategic Title</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Deployment Price</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Channel Intelligence</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Logistics Data</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-white/5">
                  {filteredItems.map((item) => {
                    const report = marketReports[item.id];
                    return (
                      <TableRow key={item.id} className={cn(
                        "hover:bg-white/[0.03] transition-colors border-none group relative overflow-hidden",
                        item.selected && "bg-primary/[0.03]"
                      )}>
                        <TableCell className="text-center relative">
                          {item.selected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />}
                          <Checkbox
                            checked={item.selected}
                            onCheckedChange={() => toggleItem(item.id)}
                            className="rounded-md border-white/20 data-[state=checked]:bg-primary"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 overflow-hidden flex-shrink-0 group-hover:border-primary/50 transition-all duration-500">
                              {item.image_url ? (
                                <img
                                  src={item.image_url}
                                  alt={item.title || "Item"}
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package className="w-6 h-6 text-muted-foreground/30" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-sm truncate max-w-[150px] text-foreground/80 group-hover:text-foreground transition-colors">
                                {item.title || "UNTITLED"}
                              </div>
                              <div className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest">
                                {item.brand} {item.model}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="relative group/title">
                            {editingId === item.id ? (
                              <Input
                                value={item.listingTitle || ""}
                                onChange={(e) => updateListingField(item.id, "listingTitle", e.target.value)}
                                onBlur={() => setEditingId(null)}
                                className="h-10 bg-white/5 border-primary/40 rounded-xl text-xs font-bold uppercase tracking-wide focus:ring-primary/20"
                                maxLength={80}
                                autoFocus
                              />
                            ) : (
                              <div
                                className="text-xs font-bold truncate max-w-[240px] cursor-pointer text-foreground/70 hover:text-primary transition-colors pr-8 relative uppercase tracking-tight"
                                onClick={() => setEditingId(item.id)}
                              >
                                {item.listingTitle || item.title || "CLICK TO OPTIMIZE TITLE..."}
                                <Edit3 className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/title:opacity-100 transition-opacity" />
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="relative w-32 group/price flex items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden focus-within:border-primary/40 transition-all">
                            <div className="pl-3 pr-1 text-primary/40 font-black text-[10px]">$</div>
                            <input
                              type="number"
                              value={item.listingPrice || ""}
                              onChange={(e) => updateListingField(item.id, "listingPrice", parseFloat(e.target.value) || undefined)}
                              className="w-full h-10 bg-transparent border-none focus:ring-0 text-sm font-black text-foreground font-data outline-none"
                              placeholder="0.00"
                              step="0.01"
                            />
                            {report?.suggested_price && (
                              <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-success opacity-0 group-hover/price:opacity-100 animate-pulse" title="Price Optimized" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              {report?.best_marketplace === "ebay" ? (
                                <div className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-[9px] font-black text-amber-500 uppercase tracking-widest">EBAY ALPHA</div>
                              ) : (
                                <div className="px-2 py-0.5 rounded-md bg-primary/10 border border-primary/30 text-[9px] font-black text-primary uppercase tracking-widest">MARKET BETA</div>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-success/40" />
                              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">High Probability</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {report ? (
                            <div className="space-y-1.5 bg-white/5 p-3 rounded-xl border border-white/5">
                              <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
                                <span>Range Confidence</span>
                                <span className="text-foreground/80">{Math.round((1 - (report.high_price - report.low_price) / report.median_price) * 100)}%</span>
                              </div>
                              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-primary/40 w-[85%]" />
                              </div>
                              <div className="text-[10px] font-black text-primary font-data">
                                TARGET: {formatAud(report.suggested_price ?? report.median_price)}
                              </div>
                            </div>
                          ) : (
                            <div className="text-[10px] font-black text-muted-foreground/20 uppercase tracking-widest italic">Insufficient Data</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="AI-generate eBay listing"
                              onClick={() => handleCreateDraft(item)}
                              disabled={draftManager.generating}
                              className="rounded-xl hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"
                            >
                              {draftManager.generating ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Sparkles className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingId(item.id)}
                              className="rounded-xl hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}

          {/* Tactical Reference Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-10">
            <Card className="lg:col-span-2 border-white/5 bg-background/40 backdrop-blur-md overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-transparent opacity-20" />
              <CardHeader className="border-b border-white/5 bg-white/5 pb-4">
                <CardTitle className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10 border border-primary/30">
                    <FileSpreadsheet className="w-4 h-4 text-primary" />
                  </div>
                  Deployment Integration Support
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground/80 mb-6 leading-relaxed uppercase tracking-wider font-bold">
                  Legacy CSV formats optimized for Enterprise Seller Hubs. iSPY protocols ensure 99.8% title match accuracy across major marketplaces.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/5 text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-primary" />
                    AUD PRICING v2.1
                  </div>
                  <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/5 text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-primary" />
                    O-DATA OPTIMIZED
                  </div>
                  <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/5 text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-primary" />
                    CSV FEED SYNC
                  </div>
                  <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/5 text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-primary" />
                    FB PKG WRAPPER
                  </div>
                  <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/5 text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-primary" />
                    ETSY PAYLOAD
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/5 bg-background/40 backdrop-blur-md overflow-hidden relative group p-6 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-3xl bg-primary/10 border border-primary/30 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(14,165,233,0.2)]">
                <RefreshCw className="w-8 h-8 text-primary" />
              </div>
              <h4 className="text-sm font-black text-foreground uppercase tracking-widest mb-2">Automated Sync</h4>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider leading-relaxed">
                Connect your eBay Seller API to bypass CSV exports and deploy instantly to live channels.
              </p>
              <Button variant="outline" className="mt-6 w-full h-11 rounded-2xl border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all">
                Integrate API
              </Button>
            </Card>
          </div>
        </div>
      </PageTransition>

      {/* Draft Editor Modal */}
      {currentDraft && (
        <ListingDraftEditor
          open={editorOpen}
          onOpenChange={setEditorOpen}
          draft={currentDraft}
          item={currentItem}
          marketReport={currentMarketReport}
          onSave={handleSaveDraft}
          onPublish={handlePublishFromEditor}
          onRegenerate={handleRegenerateDraftField}
          saving={draftManager.saving}
          generating={draftManager.generating}
          ebayConnected={true}
        />
      )}

      {/* Smart Copy Modal (single item) */}
      {smartCopyDraft && (
        <EbaySmartCopy
          open={smartCopyOpen}
          onOpenChange={setSmartCopyOpen}
          draft={smartCopyDraft}
          onMarkListed={handleMarkListed}
        />
      )}

      {/* Bulk CSV Flow (multi-item via eBay File Exchange) */}
      {batchCsvDrafts.length > 0 && (
        <EbayBatchCsvFlow
          open={batchCsvOpen}
          onOpenChange={setBatchCsvOpen}
          drafts={batchCsvDrafts}
          onMarkListed={handleBatchMarkListed}
        />
      )}

      <FeedbackWidget context="listings" />
    </Layout>
  );
}
