import { useEffect, useState } from "react";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { ShareFindButton } from "@/components/ShareFindButton";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Package,
  Plus,
  Search,
  Filter,
  Grid,
  List,
  DollarSign,
  Calendar,
  RefreshCw,
  ChevronRight,
  Store,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { Item, MarketReport } from "@/lib/types";
import { format } from "date-fns";
import { ItemDetailModal } from "@/components/ItemDetailModal";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn, formatAud } from "@/lib/utils";

import { PageTransition } from "@/components/PageTransition";
import { motion, AnimatePresence } from "framer-motion";

// Tactical Inventory Components
import { InventoryStatCard } from "@/components/inventory/InventoryStatCard";
import { InventoryItemCard } from "@/components/inventory/InventoryItemCard";

export default function Inventory() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [items, setItems] = useState<Item[]>([]);
  const [marketReports, setMarketReports] = useState<Record<string, MarketReport>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal state
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);

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
        .order("created_at", { ascending: false });

      if (itemsError) throw itemsError;
      setItems(itemsData || []);

      // Fetch market reports
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
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load inventory");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const categories = [...new Set(items.map((i) => i.category).filter(Boolean))];

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.model?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || item.status === statusFilter;
    const matchesCategory =
      categoryFilter === "all" || item.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "listed":
        return (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-info/10 border border-info/30 shadow-[0_0_10px_rgba(14,165,233,0.1)]">
            <div className="w-1 h-1 rounded-full bg-info animate-pulse" />
            <span className="text-[9px] font-black text-info uppercase tracking-widest leading-none">Deployed</span>
          </div>
        );
      case "sold":
        return (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-success/10 border border-success/30 shadow-[0_0_10px_rgba(34,197,94,0.1)]">
            <div className="w-1 h-1 rounded-full bg-success" />
            <span className="text-[9px] font-black text-success uppercase tracking-widest leading-none">Extracted</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/5 border border-white/20">
            <div className="w-1 h-1 rounded-full bg-white/20" />
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none">Inventory</span>
          </div>
        );
    }
  };

  const handleItemClick = (item: Item) => {
    if (selectedIds.size > 0) {
      toggleSelection(item.id);
    } else {
      setSelectedItem(item);
      setShowItemModal(true);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkSold = async () => {
    const ids = Array.from(selectedIds);
    setLoading(true);
    try {
      const { error } = await supabase.from("items").update({ status: "sold" }).in("id", ids);
      if (error) throw error;
      toast.success(`${ids.length} Targets Extraction Confirmed`);
      setSelectedIds(new Set());
      fetchData();
    } catch (err) {
      toast.error("Bulk extraction failed");
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals
  const totalCost = filteredItems.reduce((sum, item) => sum + (item.purchase_price || 0), 0);
  const totalSales = filteredItems.filter(i => i.status === "sold").reduce((sum, item) => sum + (item.sale_price || 0), 0);
  const totalMarketValue = filteredItems.reduce((sum, item) => {
    const report = marketReports[item.id];
    return sum + (report?.median_price || item.purchase_price || 0);
  }, 0);
  const totalProfit = totalSales - filteredItems.filter(i => i.status === "sold").reduce((sum, item) => sum + (item.purchase_price || 0), 0);

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
                <p className="text-[10px] font-black tracking-[0.3em] text-primary/60 uppercase">System: Intelligence Archives</p>
              </div>
              <h1 className="text-4xl font-black tracking-tight text-foreground uppercase">Inventory Console</h1>
              <p className="text-sm font-bold text-muted-foreground uppercase opacity-60 tracking-wider">
                {filteredItems.length} Records Decoded / {items.length} Total
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl border border-white/5 bg-white/5 hover:bg-white/10"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-primary" : ""}`} />
              </Button>
              <Link to="/scan">
                <Button variant="hero" className="rounded-2xl h-12 px-6 bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20">
                  <Plus className="w-4 h-4 mr-2" />
                  Initiate Scan
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            <InventoryStatCard
              title="Capital Invested"
              value={formatAud(totalCost)}
              icon={Package}
              description="Total Active Deployment"
              color="bg-primary"
            />
            <InventoryStatCard
              title="Assets Value"
              value={formatAud(totalMarketValue)}
              icon={Target}
              description="Projected Market Exit"
              color="bg-info"
            />
            <InventoryStatCard
              title="Extracted Revenue"
              value={formatAud(totalSales)}
              icon={DollarSign}
              description="Confirmed Sales Stream"
              color="bg-success"
            />
            <InventoryStatCard
              title="Net Alpha"
              value={formatAud(totalProfit, { showPlus: true })}
              icon={TrendingUp}
              description="Tactical Profit Realized"
              color={totalProfit >= 0 ? "bg-success" : "bg-destructive"}
            />
          </div>

          {/* Filters */}
          <Card className="mb-10 border-white/5 bg-background/40 backdrop-blur-md overflow-hidden relative group">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1 group/search">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within/search:text-primary transition-colors">
                    <Search className="w-full h-full" />
                  </div>
                  <Input
                    placeholder="SCANNING DATABASE FOR KEYWORDS..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 h-12 bg-white/5 border-white/10 rounded-2xl text-[11px] font-black uppercase tracking-widest placeholder:text-muted-foreground/30 focus:ring-primary/20 focus:border-primary/40 transition-all"
                  />
                </div>
                
                <div className="flex flex-wrap gap-4">
                  <div className="min-w-[160px]">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-12 bg-white/5 border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest">
                        <div className="flex items-center gap-2">
                          <Filter className="w-3.5 h-3.5 text-primary" />
                          <SelectValue placeholder="STATUS" />
                        </div>
                      </SelectTrigger>
                      <SelectContent className="bg-background/95 backdrop-blur-xl border-white/10 rounded-2xl overflow-hidden">
                        <SelectItem value="all" className="text-[10px] font-black uppercase tracking-widest py-3">ALL STATUS</SelectItem>
                        <SelectItem value="pending" className="text-[10px] font-black uppercase tracking-widest py-3">PENDING</SelectItem>
                        <SelectItem value="listed" className="text-[10px] font-black uppercase tracking-widest py-3">DEPLOYED</SelectItem>
                        <SelectItem value="sold" className="text-[10px] font-black uppercase tracking-widest py-3">EXTRACTED</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="min-w-[160px]">
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="h-12 bg-white/5 border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest">
                        <SelectValue placeholder="CATEGORY" />
                      </SelectTrigger>
                      <SelectContent className="bg-background/95 backdrop-blur-xl border-white/10 rounded-2xl overflow-hidden">
                        <SelectItem value="all" className="text-[10px] font-black uppercase tracking-widest py-3">ALL CATEGORIES</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat!} className="text-[10px] font-black uppercase tracking-widest py-3">
                            {cat?.toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex p-1.5 bg-white/5 border border-white/10 rounded-2xl h-12">
                    <Button
                      variant={viewMode === "grid" ? "hero" : "ghost"}
                      size="icon"
                      className={cn(
                        "rounded-xl w-10 h-full transition-all",
                        viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-white/5"
                      )}
                      onClick={() => setViewMode("grid")}
                    >
                      <Grid className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={viewMode === "list" ? "hero" : "ghost"}
                      size="icon"
                      className={cn(
                        "rounded-xl w-10 h-full transition-all",
                        viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-white/5"
                      )}
                      onClick={() => setViewMode("list")}
                    >
                      <List className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative w-16 h-16 mb-4">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                <img src="/ispy-logo.png" alt="Loading..." className="relative w-full h-full object-contain animate-pulse" />
              </div>
              <p className="text-muted-foreground mt-4 text-sm">Loading inventory...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <Card>
              <CardContent className="text-center py-16">
                {items.length === 0 ? (
                  <div className="text-center py-24 relative overflow-hidden">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="relative w-36 h-36 mx-auto mb-10"
                    >
                      <div className="absolute inset-0 bg-primary/20 blur-[50px] rounded-full animate-pulse" />
                      <img src="/mascot-transparent.png" alt="Commander" className="relative w-full h-full object-contain animate-float" />
                    </motion.div>
                    <h3 className="text-3xl font-black mb-4 uppercase tracking-tighter">Archives: <span className="text-primary">Empty</span></h3>
                    <p className="text-sm font-bold text-muted-foreground/60 mb-12 max-w-md mx-auto uppercase tracking-wider leading-relaxed">
                      No asset signatures found in the tactical database. Initiate a fresh recon mission to populate your inventory.
                    </p>
                    <Link to="/scan">
                      <Button variant="premium" className="h-20 px-12 rounded-[2rem] text-[11px] tracking-[0.3em] shadow-2xl shadow-amber-500/20">
                        <Plus className="w-6 h-6 mr-4" />
                        DEPLOY SCANNER LINK
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <>
                    <h3 className="font-semibold mb-2">No items found</h3>
                    <p className="text-muted-foreground">Try adjusting your filters</p>
                  </>
                )}
              </CardContent>
            </Card>
          ) : viewMode === "grid" ? (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              initial="initial"
              animate="animate"
              variants={{ animate: { transition: { staggerChildren: 0.05 } } }}
            >
              <AnimatePresence mode="popLayout">
                {filteredItems.map((item) => (
                  <InventoryItemCard
                    key={item.id}
                    item={item}
                    onClick={() => handleItemClick(item)}
                    onLongPress={() => toggleSelection(item.id)}
                    isSelected={selectedIds.has(item.id)}
                    statusBadge={getStatusBadge(item.status)}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Sale</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className="cursor-pointer"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-secondary overflow-hidden flex-shrink-0">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.title || "Item"}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = "/placeholder.svg";
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-5 h-5 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium truncate max-w-[200px]">
                              {item.title || "Untitled"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {item.brand} {item.model}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{item.category || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.condition || "—"}</Badge>
                      </TableCell>
                      <TableCell>
                        {item.purchase_price
                          ? formatAud(item.purchase_price)
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {item.sale_price ? (
                          <span className="text-success">
                            {formatAud(item.sale_price)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(item.created_at), "MMM d")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      </PageTransition>

      {/* Floating Tactical Action Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4"
          >
            <div className="bg-black/80 backdrop-blur-2xl border border-primary/40 rounded-[2rem] p-4 flex items-center justify-between shadow-[0_0_50px_rgba(0,0,0,0.5)]">
              <div className="flex items-center gap-4 ml-4">
                <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-black">
                  {selectedIds.size}
                </div>
                <div>
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest">Targets Selected</p>
                  <p className="text-white/40 text-[9px] font-bold uppercase">Awaiting Command</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())} className="text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground">Clear</Button>
                <Button variant="ghost" size="sm" onClick={handleBulkSold} className="text-[9px] font-black uppercase tracking-widest text-success hover:bg-success/10 border border-success/20 py-5 px-6 rounded-xl">Extract (Sold)</Button>
                <Link to="/listings">
                  <Button variant="premium" size="sm" className="h-12 px-8 rounded-xl text-[9px] tracking-[0.2em]">DEPLOY TO EBAY</Button>
                </Link>
              </div>
            </div>
          </motion.div>
        ) : items.filter(i => !i.status || i.status === "pending").length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50"
          >
            <Link to="/listings">
              <Button variant="premium" size="lg" className="shadow-2xl rounded-full px-6">
                <Store className="w-4 h-4 mr-2" />
                List {items.filter(i => !i.status || i.status === "pending").length} items for sale
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Item Detail Modal */}
      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          marketReport={marketReports[selectedItem.id]}
          open={showItemModal}
          onOpenChange={setShowItemModal}
          onUpdate={fetchData}
          onDelete={fetchData}
          fullScreen={isMobile}
        />
      )}
            <FeedbackWidget context="inventory" />
      {selectedItem && <ShareFindButton item={selectedItem} autoShow={showItemModal} />}
    </Layout>
  );
}
