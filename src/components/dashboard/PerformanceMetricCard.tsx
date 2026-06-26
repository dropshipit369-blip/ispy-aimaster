import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon, ArrowUpRight, ArrowDownRight, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PerformanceMetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: "up" | "down" | null;
  color: string;
  onClick?: () => void;
  index: number;
}

export const PerformanceMetricCard: React.FC<PerformanceMetricCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  color,
  onClick,
  index,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card
        className={cn(
          "relative overflow-hidden group cursor-pointer border-white/5 bg-background/40 backdrop-blur-md transition-all duration-500 hover:border-white/20 hover:shadow-2xl hover:shadow-primary/5",
          onClick && "active:scale-[0.98]"
        )}
        onClick={onClick}
      >
        {/* Tactical background elements */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/[0.02] rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700" />
        <div className={cn(
          "absolute left-0 top-0 w-1 h-full opacity-40 transition-opacity group-hover:opacity-100",
          color === "text-primary" ? "bg-primary" : 
          color === "text-info" ? "bg-info" : 
          color === "text-success" ? "bg-success" : "bg-destructive"
        )} />

        <CardContent className="p-6 relative">
          <div className="flex items-center justify-between mb-4">
            <div className={cn(
              "p-2.5 rounded-2xl border transition-all duration-300 group-hover:scale-110",
              color === "text-primary" ? "bg-primary/10 border-primary/20" : 
              color === "text-info" ? "bg-info/10 border-info/20" : 
              color === "text-success" ? "bg-success/10 border-success/20" : "bg-destructive/10 border-destructive/20"
            )}>
              <Icon className={cn("w-5 h-5", color)} />
            </div>
            
            <div className="flex items-center gap-1.5">
              {trend && (
                <div className={cn(
                  "flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-tighter",
                  trend === "up" ? "text-success bg-success/10 border-success/20" : "text-destructive bg-destructive/10 border-destructive/20"
                )}>
                  {trend === "up" ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                  {trend === "up" ? "Rise" : "Fall"}
                </div>
              )}
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/20 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-black tracking-[0.15em] text-muted-foreground uppercase opacity-60 group-hover:opacity-100 transition-opacity">
              {title}
            </p>
            <div className="text-3xl font-black font-data tracking-tighter text-foreground/90 group-hover:text-foreground transition-colors">
              {value}
            </div>
          </div>

          {/* Micro-sparkline decoration (static for now but looks elite) */}
          <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ delay: 0.5 + (index * 0.1), duration: 1.5 }}
              className={cn(
                "h-full opacity-30",
                color === "text-primary" ? "bg-primary" : 
                color === "text-info" ? "bg-info" : 
                color === "text-success" ? "bg-success" : "bg-destructive"
              )}
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
