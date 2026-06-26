import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BellRing, 
  CheckCircle2, 
  AlertTriangle, 
  Target, 
  Flame, 
  Activity,
  ChevronRight,
  TrendingUp,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface DashboardNotification {
  id: string;
  title: string;
  detail: string;
  tone: "default" | "success" | "warning" | "primary" | "info";
  timestamp?: string;
}

interface IntelligenceFeedProps {
  notifications: DashboardNotification[];
}

export const IntelligenceFeed: React.FC<IntelligenceFeedProps> = ({ notifications }) => {
  return (
    <Card className="border-white/10 bg-background/40 backdrop-blur-xl shadow-2xl relative overflow-hidden group h-full">
      {/* Tactical highlight */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[80px]" />
      
      <CardHeader className="pb-4 border-b border-white/5 bg-white/5">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
              <Activity className="w-4 h-4 text-primary animate-pulse" />
            </div>
            <div>
              <p className="text-[11px] font-black tracking-widest uppercase text-foreground">Intelligence Stream</p>
              <p className="text-[9px] font-bold text-muted-foreground tracking-wide uppercase">Real-time Operational Telemetry</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
            <span className="text-[9px] font-black text-primary uppercase">Live</span>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto no-scrollbar">
          <AnimatePresence mode="popLayout">
            {notifications.map((notification, index) => {
              const Icon =
                notification.tone === "success"
                  ? CheckCircle2
                  : notification.tone === "warning"
                    ? AlertTriangle
                    : notification.tone === "primary"
                      ? Target
                      : notification.tone === "info"
                        ? Zap
                        : Flame;
              
              const toneColors = {
                success: "text-success bg-success/10 border-success/20",
                warning: "text-warning bg-warning/10 border-warning/20",
                primary: "text-primary bg-primary/10 border-primary/20",
                info: "text-info bg-info/10 border-info/20",
                default: "text-muted-foreground bg-muted/10 border-muted/20"
              };

              return (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-5 hover:bg-white/[0.02] transition-colors relative group/item cursor-default"
                >
                  <div className="flex gap-4">
                    <div className={cn(
                      "mt-1 p-2 rounded-xl border shrink-0 transition-transform group-hover/item:scale-110 duration-300",
                      toneColors[notification.tone]
                    )}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-bold text-sm tracking-tight text-foreground/90">{notification.title}</p>
                        <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-tighter">
                          {notification.timestamp || "Active"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        {notification.detail}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/20 self-center group-hover/item:text-primary group-hover/item:translate-x-1 transition-all" />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          
          {notifications.length === 0 && (
            <div className="py-20 flex flex-col items-center justify-center text-center px-10">
              <Activity className="w-10 h-10 text-muted-foreground/20 mb-4" />
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-relaxed">
                Awaiting mission activity... Start a scan to populate stream
              </p>
            </div>
          )}
        </div>
        
        <div className="p-4 bg-white/5 border-t border-white/5">
          <button className="w-full py-2 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center gap-2 group">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground group-hover:text-primary transition-colors">Archive Terminal</span>
            <TrendingUp className="w-3 h-3 text-muted-foreground/40 group-hover:text-primary transition-all" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
};
