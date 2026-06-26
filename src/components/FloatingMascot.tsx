import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Camera, Package, Store, BarChart3, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatAud } from "@/lib/utils";
import {
  loadMascotMemory,
  trackPageVisit,
  dismissTip,
  getContextualTip,
  getMascotTitle,
  type MascotMemory,
} from "@/lib/mascot-memory";

interface AssistantSnapshot {
  totalItems: number;
  pendingItems: number;
  soldItems: number;
  totalProfit: number;
  triggeredAlerts: number;
}

const routeLabels: Record<string, string> = {
  "/dashboard": "Command Center",
  "/scan": "Neural Scan",
  "/inventory": "Asset Vault",
  "/listings": "Export Bay",
  "/membership": "Operator Class",
};

export function FloatingMascot() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [snapshot, setSnapshot] = useState<AssistantSnapshot | null>(null);
  const [memory, setMemory] = useState<MascotMemory>(() => loadMascotMemory());
  const [activeTip, setActiveTip] = useState<{ id: string; text: string } | null>(null);

  const shouldRender =
    !!user && !["/", "/login", "/signup"].includes(location.pathname);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const updated = trackPageVisit(location.pathname);
    setMemory(updated);
  }, [location.pathname]);

  useEffect(() => {
    if (!user?.id) return;

    const loadSnapshot = async () => {
      const [{ data: itemsData }, { count: triggeredAlertsCount }] = await Promise.all([
        supabase
          .from("items")
          .select("status,purchase_price,sale_price")
          .eq("user_id", user.id),
        supabase
          .from("price_alerts")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("triggered", true),
      ]);

      const items = itemsData || [];
      const soldItems = items.filter((item) => item.status === "sold");
      const totalProfit = soldItems.reduce(
        (sum, item) => sum + ((item.sale_price || 0) - (item.purchase_price || 0)),
        0,
      );

      setSnapshot({
        totalItems: items.length,
        pendingItems: items.filter((item) => item.status === "pending" || !item.status).length,
        soldItems: soldItems.length,
        totalProfit,
        triggeredAlerts: triggeredAlertsCount || 0,
      });
    };

    void loadSnapshot();
  }, [user?.id, location.pathname]);

  useEffect(() => {
    if (!snapshot) return;
    const tip = getContextualTip(memory, location.pathname, {
      totalItems: snapshot.totalItems,
      pendingItems: snapshot.pendingItems,
      soldItems: snapshot.soldItems,
    });
    setActiveTip(tip);
  }, [snapshot, location.pathname, memory]);

  const quickActions = useMemo(
    () => [
      { label: "Scan", path: "/scan", icon: Camera },
      { label: "Inventory", path: "/inventory", icon: Package },
      { label: "Listings", path: "/listings", icon: Store },
      { label: "Dashboard", path: "/dashboard", icon: BarChart3 },
    ],
    [],
  );

  const statusLine = snapshot
    ? `${snapshot.totalItems} assets · ${formatAud(snapshot.totalProfit)} realized`
    : "Standing by for your next recon run.";

  if (!shouldRender) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-3 pointer-events-none">
      <AnimatePresence>
        {showTip && activeTip && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className="pointer-events-auto max-w-[min(20rem,calc(100vw-2rem))]"
          >
            <div className="relative rounded-2xl border border-primary/25 bg-card/95 backdrop-blur-xl shadow-2xl p-4 pr-10">
              <div className="absolute -bottom-2 right-8 h-4 w-4 rotate-45 border-r border-b border-primary/25 bg-card/95" />
              <button
                type="button"
                aria-label="Dismiss tip"
                onClick={() => {
                  const updated = dismissTip(activeTip.id);
                  setMemory(updated);
                  setActiveTip(null);
                  setShowTip(false);
                }}
                className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                  {memory.nickname} · Lv.{memory.level} {getMascotTitle(memory.level)}
                </p>
              </div>
              <p className="text-sm leading-relaxed text-foreground/90">{activeTip.text}</p>
              <p className="mt-2 text-[11px] text-muted-foreground">{statusLine}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {quickActions.map((action) => (
                  <Button
                    key={action.path}
                    variant="outline"
                    size="sm"
                    className="justify-start text-xs h-8 border-border/60"
                    onClick={() => {
                      navigate(action.path);
                      setShowTip(false);
                    }}
                  >
                    <action.icon className="w-3 h-3 mr-1.5" />
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isVisible && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => setShowTip((open) => !open)}
            aria-label={`${memory.nickname} field advisor`}
            className="relative group pointer-events-auto"
          >
            <div className="absolute inset-0 bg-primary/25 rounded-full blur-lg animate-pulse-glow group-hover:bg-primary/40 transition-colors" />
            <div className="relative w-16 h-16 sm:w-[4.5rem] sm:h-[4.5rem] rounded-full overflow-hidden border-2 border-primary/60 shadow-2xl bg-background/60 backdrop-blur-sm transition-transform duration-300 group-hover:-translate-y-1">
              <img
                src="/mascot-transparent.png"
                alt={memory.nickname}
                className="w-full h-full object-cover p-1"
                onError={(e) => {
                  e.currentTarget.src = "/mascot.png";
                  e.currentTarget.onerror = null;
                }}
              />
            </div>
            <span className="absolute -top-1 -right-1 flex h-6 w-6">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/40 opacity-50" />
              <span className="relative inline-flex rounded-full h-6 w-6 bg-gradient-to-br from-primary to-amber-500 text-[10px] items-center justify-center text-primary-foreground font-bold shadow-lg">
                {memory.level}
              </span>
            </span>
            <span className="absolute -left-2 top-1/2 -translate-y-1/2 hidden sm:block opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-medium text-primary/80 whitespace-nowrap -translate-x-full pr-2">
              {routeLabels[location.pathname] || "Ops"}
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}