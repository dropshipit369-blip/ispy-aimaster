import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Package,
  TrendingUp,
  DollarSign,
  BarChart3,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  ChevronRight,
  Boxes,
  RefreshCw,
  Target,
  BellRing,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Store,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { Item, MarketReport } from "@/lib/types";
import { ItemDetailModal } from "@/components/ItemDetailModal";
import { StatsDetailModal } from "@/components/StatsDetailModal";
import type { Tables } from "@/integrations/supabase/types";

import { PageTransition } from "@/components/PageTransition";
import { StreakDisplay, generateAchievements } from "@/components/GamificationBadge";
import { motion, AnimatePresence } from "framer-motion";
import { formatAud, cn } from "@/lib/utils";

// Strategic Dashboard Components
import { IntelligenceFeed } from "@/components/dashboard/IntelligenceFeed";
import type { DashboardNotification } from "@/components/dashboard/IntelligenceFeed";
import { PerformanceMetricCard } from "@/components/dashboard/PerformanceMetricCard";
import { OperationalBriefing } from "@/components/dashboard/OperationalBriefing";
import { FinancialEngineCard } from "@/components/dashboard/FinancialEngineCard";

type ScanLog = Tables<"scan_logs">;
type PriceAlert = Tables<"price_alerts">;

const DAY_IN_MS = 24 * 60 * 60 * 1000;

/**
 * Returns a local-timezone YYYY-MM-DD date key for a given ISO timestamp.
 * Using local dates ensures the streak is not broken by UTC timezone offsets
 * (e.g. an Australian user scanning at 11pm AEST would be the previous UTC day).
 */
const getDateKey = (value: string) => {
  const d = new Date(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const calculateCurrentStreak = (scanDates: string[]) => {
  if (scanDates.length === 0) return 0;

  const uniqueDays = Array.from(new Set(scanDates.map(getDateKey))).sort((a, b) => b.localeCompare(a));

  // Use local-date today to avoid timezone-induced streak resets
  const now = new Date();
  const todayKey = getDateKey(now.toISOString());
  const yesterdayDate = new Date(now.getTime() - DAY_IN_MS);
  const yesterdayKey = getDateKey(yesterdayDate.toISOString());

  // Streak is valid only if the user has scanned today or yesterday
  if (uniqueDays[0] !== todayKey && uniqueDays[0] !== yesterdayKey) return 0;

  let streak = 0;
  // Walk backwards through unique days, counting consecutive days
  let expectedDate = new Date(
    uniqueDays[0].slice(0, 4) + "-" + uniqueDays[0].slice(5, 7) + "-" + uniqueDays[0].slice(8, 10) + "T12:00:00"
  );

  for (const day of uniqueDays) {
    const expectedKey = getDateKey(expectedDate.toISOString());
    if (day !== expectedKey) break;
    streak += 1;
    expectedDate = new Date(expectedDate.getTime() - DAY_IN_MS);
  }

  return streak;
};

export default function Dashboard() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [marketReports, setMarketReports] = useState<Record<string, MarketReport>>({});
  const [scanLogs, setScanLogs] = useState<ScanLog[]>([]);
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal states
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [statsModal, setStatsModal] = useState<{
    open: boolean;
    title: string;
    filter: "all" | "listed" | "sold" | "profit";
  }>({ open: false, title: "", filter: "all" });

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [
        { data: itemsData, error: itemsError },
        { data: scanLogsData, error: scanLogsError },
        { data: priceAlertsData, error: priceAlertsError },
      ] = await Promise.all([
        supabase
          .from("items")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("scan_logs")
          .select("*")
          .eq("user_id", user.id)
          .order("scanned_at", { ascending: false })
          .limit(100),
        supabase
          .from("price_alerts")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(25),
      ]);

      if (itemsError) throw itemsError;
      if (scanLogsError) throw scanLogsError;
      if (priceAlertsError) throw priceAlertsError;

      setItems(itemsData || []);
      setScanLogs(scanLogsData || []);
      setPriceAlerts(priceAlertsData || []);

      if (itemsData && itemsData.length > 0) {
        const itemIds = itemsData.map((i) => i.id);
        const { data: reportsData, error: reportsError } = await supabase
          .from("market_reports")
          .select("*")
          .in("item_id", itemIds);

        if (!reportsError && reportsData) {
          const reportsMap: Record<string, MarketReport> = {};
          reportsData.forEach((report) => {
            reportsMap[report.item_id] = report as MarketReport;
          });
          setMarketReports(reportsMap);
        }
      } else {
        setMarketReports({});
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  const [liveEvents, setLiveEvents] = useState<DashboardNotification[]>([]);

  useEffect(() => {
    if (!user?.id) return;

    // Tactical initial event
    setLiveEvents([{
      id: "init",
      title: "Neural Link Established",
      detail: "Secure satellite uplink active. Command center synchronized.",
      tone: "info",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);

    const channel = supabase
      .channel(`dashboard-live-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "items", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const item = payload.new as Tables<"items">;
          const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          
          if (payload.eventType === "INSERT") {
            toast.success(`${item.title || "New item"} added to inventory.`);
            setLiveEvents(prev => [{
              id: `ins-${Date.now()}`,
              title: "Asset Acquisition",
              detail: `${item.title || "New asset"} identified and logged to inventory.`,
              tone: "success",
              timestamp
            }, ...prev].slice(0, 10));
          }
          if (payload.eventType === "UPDATE") {
            if (item.status === "sold") {
              toast.success(`${item.title || "Item"} marked as sold.`);
              setLiveEvents(prev => [{
                id: `sold-${Date.now()}`,
                title: "Asset Liquidation",
                detail: `Revenue realized for ${item.title}. Profit matrix updated.`,
                tone: "primary",
                timestamp
              }, ...prev].slice(0, 10));
            } else {
              setLiveEvents(prev => [{
                id: `upd-${Date.now()}`,
                title: "Telemetry Update",
                detail: `System parameters modified for ${item.title}.`,
                tone: "info",
                timestamp
              }, ...prev].slice(0, 10));
            }
          }
          void fetchData();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scan_logs", filter: `user_id=eq.${user.id}` },
        () => {
          setLiveEvents(prev => [{
            id: `scan-${Date.now()}`,
            title: "Recon Sweep Complete",
            detail: "Neural scanner return processed. Market data cached.",
            tone: "primary",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }, ...prev].slice(0, 10));
          void fetchData();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "price_alerts", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const alert = payload.new as Tables<"price_alerts">;
          const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          
          if (alert.triggered) {
            toast.info(`Price alert triggered for one of your tracked items.`);
            setLiveEvents(prev => [{
              id: `alert-${Date.now()}`,
              title: "Target Intercept",
              detail: `Market price threshold breached for tracked asset.`,
              tone: "warning",
              timestamp
            }, ...prev].slice(0, 10));
          }
          void fetchData();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchData, user?.id]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const totalItems = items.length;
  const listedItems = items.filter(i => i.status === "listed");
  const soldItems = items.filter(i => i.status === "sold");

  const totalCost = items.reduce((sum, i) => sum + (i.purchase_price || 0), 0);
  const totalRevenue = soldItems.reduce((sum, i) => sum + (i.sale_price || 0), 0);
  const totalProfit = totalRevenue - soldItems.reduce((sum, i) => sum + (i.purchase_price || 0), 0);
  const roi = totalCost > 0 ? ((totalProfit / totalCost) * 100).toFixed(1) : "0";
  const daysActive = useMemo(() => Array.from(new Set(scanLogs.map((scan) => getDateKey(scan.scanned_at)))).length, [scanLogs]);
  const currentStreak = useMemo(() => calculateCurrentStreak(scanLogs.map((scan) => scan.scanned_at)), [scanLogs]);

  // Gamification — achievements track in the background and surface as pop-ups on unlock.
  const achievements = generateAchievements({
    totalScans: scanLogs.length,
    totalItems,
    totalSold: soldItems.length,
    totalProfit,
    daysActive,
    currentStreak,
  });

  // Track which achievements have already triggered a pop-up toast this session.
  const notifiedAchievementIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    achievements
      .filter((a) => a.unlocked && !notifiedAchievementIds.current.has(a.id))
      .forEach((a) => {
        notifiedAchievementIds.current.add(a.id);
        toast(`Achievement unlocked: ${a.title}`, {
          description: a.description,
          duration: 6000,
        });
      });
  }, [achievements]);
  const triggeredAlerts = priceAlerts.filter((alert) => alert.triggered);
  const notifications = useMemo<DashboardNotification[]>(() => {
    const next: DashboardNotification[] = [];
    const pendingItems = items.filter((item) => item.status === "pending");
    const recentSoldItems = [...soldItems]
      .sort((a, b) => (b.sold_at || "").localeCompare(a.sold_at || ""))
      .slice(0, 2);

    if (triggeredAlerts.length > 0) {
      next.push({
        id: "alerts",
        title: "Triggered price alerts",
        detail: `${triggeredAlerts.length} tracked item${triggeredAlerts.length === 1 ? "" : "s"} hit your target price.`,
        tone: "warning",
      });
    }

    if (recentSoldItems.length > 0) {
      next.push({
        id: "sales",
        title: "Recent sales activity",
        detail: recentSoldItems.map((item) => item.title || "Untitled item").join(", "),
        tone: "success",
      });
    }

    if (pendingItems.length > 0) {
      next.push({
        id: "pending",
        title: "Listings ready to publish",
        detail: `${pendingItems.length} item${pendingItems.length === 1 ? "" : "s"} are still pending in inventory.`,
        tone: "primary",
      });
    }

    if (currentStreak > 1) {
      next.push({
        id: "streak",
        title: "Current scan streak",
        detail: `You're on a ${currentStreak}-day streak with ${daysActive} active scan day${daysActive === 1 ? "" : "s"} total.`,
        tone: "default",
      });
    }

    if (next.length === 0 && liveEvents.length === 0) {
      next.push({
        id: "quiet",
        title: "Quiet dashboard",
        detail: "Scan or list an item to start generating activity notifications here.",
        tone: "default",
      });
    }

    return [...liveEvents, ...next].slice(0, 6);
  }, [currentStreak, daysActive, items, soldItems, triggeredAlerts, liveEvents]);

  const stats = [
    {
      title: "Total Items",
      value: totalItems,
      icon: Package,
      trend: null as string | null,
      color: "text-primary",
      filter: "all" as const
    },
    {
      title: "Listed",
      value: listedItems.length,
      icon: Clock,
      trend: null as string | null,
      color: "text-info",
      filter: "listed" as const
    },
    {
      title: "Sold",
      value: soldItems.length,
      icon: TrendingUp,
      trend: null as string | null,
      color: "text-success",
      filter: "sold" as const
    },
    {
      title: "Total Profit",
      value: formatAud(totalProfit),
      icon: DollarSign,
      trend: totalProfit >= 0 ? "up" : "down",
      color: totalProfit >= 0 ? "text-success" : "text-destructive",
      filter: "profit" as const
    },
  ];

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "listed":
        return <Badge variant="secondary">Listed</Badge>;
      case "sold":
        return <Badge className="bg-success/20 text-success border-success/30">Sold</Badge>;
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const handleStatClick = (filter: "all" | "listed" | "sold" | "profit") => {
    const titles: Record<string, string> = {
      all: "All Items",
      listed: "Listed Items",
      sold: "Sold Items",
      profit: "Items with Sales",
    };
    setStatsModal({ open: true, title: titles[filter], filter });
  };

  const getFilteredItems = () => {
    switch (statsModal.filter) {
      case "listed":
        return listedItems;
      case "sold":
        return soldItems;
      case "profit":
        return soldItems;
      default:
        return items;
    }
  };

  const handleItemClick = (item: Item) => {
    setSelectedItem(item);
    setShowItemModal(true);
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
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <p className="text-[10px] font-black tracking-[0.3em] text-primary uppercase">Console Status: Operational</p>
              </div>
              <h1 className="text-4xl font-black tracking-tight text-foreground uppercase text-shimmer">Mission Control</h1>
              <p className="text-sm font-bold text-muted-foreground uppercase opacity-60 tracking-wider">Enterprise Intelligence Dashboard</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-white/5 p-1 rounded-2xl border border-white/5 flex items-center gap-1">
                <StreakDisplay count={currentStreak} />
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-xl hover:bg-white/10"
                  onClick={handleRefresh}
                  disabled={refreshing}
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-primary" : ""}`} />
                </Button>
              </div>
              <Link to="/scan">
                <Button variant="hero" className="rounded-2xl h-12 px-6 bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20">
                  <Plus className="w-4 h-4 mr-2" />
                  New Recon
                </Button>
              </Link>
            </div>
          </motion.div>
          {/* Primary Operations Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <div className="lg:col-span-2 space-y-8">
              {/* Reseller Score — progress bar drives completion psychology */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="border-white/5 bg-background/40 backdrop-blur-md overflow-hidden relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-transparent opacity-20" />
                  <CardContent className="p-6 relative">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-foreground/80">Command Readiness Score</span>
                      </div>
                      <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                        {Math.min(100, Math.round(
                          (Math.min(totalItems, 20) / 20 * 25) +
                          (Math.min(listedItems.length, 10) / 10 * 25) +
                          (Math.min(soldItems.length, 5) / 5 * 25) +
                          (Math.min(currentStreak, 7) / 7 * 25)
                        ))}% CALIBRATED
                      </span>
                    </div>
                    <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <motion.div
                        className="h-full bg-gradient-to-r from-primary via-amber-500 to-success shadow-[0_0_15px_rgba(14,165,233,0.5)]"
                        initial={{ width: 0 }}
                        animate={{
                          width: `${Math.min(100, Math.round(
                            (Math.min(totalItems, 20) / 20 * 25) +
                            (Math.min(listedItems.length, 10) / 10 * 25) +
                            (Math.min(soldItems.length, 5) / 5 * 25) +
                            (Math.min(currentStreak, 7) / 7 * 25)
                          ))}%`,
                        }}
                        transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
                      />
                    </div>
                    <div className="grid grid-cols-4 gap-2 mt-4 text-[9px] font-bold text-muted-foreground/60 uppercase tracking-tight">
                      <div className={cn("px-2 py-1 rounded-lg border border-white/5 bg-white/5", totalItems >= 20 ? "text-success border-success/20 bg-success/5" : "")}>
                        {Math.min(totalItems, 20)}/20 RECON
                      </div>
                      <div className={cn("px-2 py-1 rounded-lg border border-white/5 bg-white/5", listedItems.length >= 10 ? "text-success border-success/20 bg-success/5" : "")}>
                        {Math.min(listedItems.length, 10)}/10 DEPLOYED
                      </div>
                      <div className={cn("px-2 py-1 rounded-lg border border-white/5 bg-white/5", soldItems.length >= 5 ? "text-success border-success/20 bg-success/5" : "")}>
                        {Math.min(soldItems.length, 5)}/5 CONFIRMED
                      </div>
                      <div className={cn("px-2 py-1 rounded-lg border border-white/5 bg-white/5", currentStreak >= 7 ? "text-success border-success/20 bg-success/5" : "")}>
                        {Math.min(currentStreak, 7)}/7 STREAK
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                {stats.map((stat, i) => (
                  <PerformanceMetricCard
                    key={stat.title}
                    index={i}
                    title={stat.title}
                    value={stat.value}
                    icon={stat.icon}
                    trend={stat.trend as "up" | "down" | null}
                    color={stat.color}
                    onClick={() => handleStatClick(stat.filter)}
                  />
                ))}
              </div>

              {/* ROI & Financial Engine */}
              <FinancialEngineCard
                roi={roi}
                totalCost={formatAud(totalCost)}
                totalRevenue={formatAud(totalRevenue)}
                totalProfit={formatAud(totalProfit)}
              />

              {/* Operational Briefing (Next Action) */}
              <AnimatePresence mode="wait">
                {(() => {
                  const pendingItems = items.filter(i => !i.status || i.status === "pending");
                  let actionData: { title: string; description: string; path: string; buttonText: string; icon: typeof Plus };

                  if (totalItems === 0) {
                    actionData = {
                      title: "Initiate First Recon",
                      description: "Capture optical data of resale targets. System AI handles identification and valuation automatically.",
                      path: "/scan",
                      buttonText: "Begin Scan",
                      icon: Camera,
                    };
                  } else if (pendingItems.length >= 3) {
                    actionData = {
                      title: "Critical Logistics: Deployment",
                      description: `${pendingItems.length} inventory targets identified but not yet deployed to market channels.`,
                      path: "/inventory",
                      buttonText: "View Logistics",
                      icon: Store,
                    };
                  } else if (currentStreak === 0) {
                    actionData = {
                      title: "Maintain Operational Tempo",
                      description: "Mission activity is lower than average. Perform a scan today to restore your command streak.",
                      path: "/scan",
                      buttonText: "Deploy Scanner",
                      icon: Camera,
                    };
                  } else {
                    actionData = {
                      title: "Continuous Growth Protocol",
                      description: "Your market intelligence is peaking. Maintain recon frequency to maximize profit extraction.",
                      path: "/scan",
                      buttonText: "More Intel",
                      icon: Plus,
                    };
                  }

                  return (
                    <motion.div
                      key={actionData.title}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.02 }}
                    >
                      <OperationalBriefing {...actionData} />
                    </motion.div>
                  );
                })()}
              </AnimatePresence>
            </div>

            <div className="lg:col-span-1">
              {/* Intelligence Feed */}
              <IntelligenceFeed notifications={notifications} />
            </div>
          </div>

          {/* Achievements are now background trackers that pop up as toasts when unlocked */}

          {/* Items List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            <Card className="border-white/5 bg-background/40 backdrop-blur-md overflow-hidden relative group cyber-border shadow-2xl">
              <div className="absolute inset-0 noise-bg opacity-[0.02] pointer-events-none" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6 border-b border-white/5 bg-white/5">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                    <Package className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black tracking-widest uppercase text-foreground">Evidence Log</p>
                    <p className="text-[9px] font-bold text-muted-foreground tracking-wide uppercase">Recent Operational Extracts</p>
                  </div>
                </CardTitle>
                <Link to="/inventory">
                  <Button variant="ghost" size="sm" className="h-8 px-4 rounded-xl hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-all">
                    Access Archives
                    <ChevronRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-24">
                    <div className="relative w-24 h-24 mb-6">
                      <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
                      <div className="relative w-24 h-24 border-4 border-t-primary border-white/5 rounded-full animate-spin" />
                    </div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] animate-pulse">Syncing encrypted data stream...</p>
                  </div>
                ) : items.length === 0 ? (
                  <div className="text-center py-24 relative overflow-hidden group">
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="relative w-40 h-40 mx-auto mb-8"
                    >
                      <div className="absolute inset-0 bg-primary/20 blur-[60px] rounded-full animate-pulse-glow" />
                      <img src="/mascot-transparent.png" alt="Intelligence Officer" className="relative w-full h-full object-contain animate-float drop-shadow-[0_0_30px_rgba(14,165,233,0.3)]" />
                    </motion.div>
                    <h3 className="text-3xl font-black mb-4 uppercase tracking-tighter italic">Optical Sensors: <span className="text-primary">Inert</span></h3>
                    <p className="text-sm font-bold text-muted-foreground/60 mb-10 max-w-sm mx-auto uppercase tracking-wider leading-relaxed">
                      Your intelligence database is empty. Deploy the neural scanner to begin market extraction and build your command records.
                    </p>
                    <Link to="/scan">
                      <Button variant="premium" className="h-16 px-12 rounded-2xl text-[10px] tracking-[0.3em] shadow-2xl shadow-amber-500/20">
                        <Camera className="w-5 h-5 mr-4" />
                        INITIATE RECON BATTLESPACE
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    <AnimatePresence>
                      {items.slice(0, 5).map((item, index) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => handleItemClick(item)}
                          className="flex items-center gap-5 p-5 hover:bg-white/[0.03] transition-all duration-300 cursor-pointer group relative overflow-hidden"
                        >
                          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 overflow-hidden flex-shrink-0 group-hover:border-primary/50 group-hover:shadow-[0_0_15px_rgba(14,165,233,0.3)] transition-all duration-500">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.title || "Item"}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                onError={(e) => {
                                  e.currentTarget.src = "/placeholder.svg";
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-7 h-7 text-muted-foreground/30" />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[9px] font-black text-primary uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Select</span>
                              <div className="font-bold text-base truncate text-foreground/90 group-hover:text-foreground transition-colors">{item.title || "Untitled Intelligence"}</div>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium uppercase tracking-tight opacity-60 group-hover:opacity-100 transition-opacity">
                              {item.brand && (
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10",
                                  item.brand && "text-primary/80"
                                )}>
                                  {item.brand}
                                </span>
                              )}
                              <span>{item.category || "Unclassified"}</span>
                            </div>
                          </div>
                          
                          <div className="text-right flex items-center gap-6">
                            <div className="flex flex-col items-end gap-1.5">
                              {getStatusBadge(item.status)}
                              {item.sale_price ? (
                                <div className="text-base font-black text-success font-data tracking-tighter">
                                  {formatAud(item.sale_price)}
                                </div>
                              ) : item.purchase_price ? (
                                <div className="text-sm font-bold text-muted-foreground/40 font-data">
                                  COST {formatAud(item.purchase_price)}
                                </div>
                              ) : null}
                            </div>
                            <div className="w-8 h-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-muted-foreground/0 group-hover:text-primary group-hover:bg-primary/10 group-hover:border-primary/20 transition-all duration-300">
                              <ArrowRight className="w-4 h-4 translate-x-[-4px] group-hover:translate-x-0 transition-transform" />
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {items.length > 5 && (
                      <Link to="/inventory" className="block p-4 hover:bg-white/[0.02] bg-white/[0.01] transition-colors text-center">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 hover:text-primary transition-colors">
                          Access Extended Records ({items.length - 5} Items)
                        </span>
                      </Link>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </PageTransition>

      {/* Stats Detail Modal */}
      <StatsDetailModal
        open={statsModal.open}
        onOpenChange={(open) => setStatsModal({ ...statsModal, open })}
        title={statsModal.title}
        items={getFilteredItems()}
        onItemClick={handleItemClick}
      />

      {/* Item Detail Modal */}
      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          marketReport={marketReports[selectedItem.id]}
          open={showItemModal}
          onOpenChange={setShowItemModal}
          onUpdate={fetchData}
          onDelete={fetchData}
        />
      )}
            <FeedbackWidget context="dashboard" />
    </Layout>
  );
}
