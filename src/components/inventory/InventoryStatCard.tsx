import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface InventoryStatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  description: string;
  color: string;
}

export const InventoryStatCard: React.FC<InventoryStatCardProps> = ({
  title,
  value,
  icon: Icon,
  description,
  color,
}) => {
  return (
    <Card className="border-white/5 bg-background/40 backdrop-blur-md overflow-hidden relative group">
      <div className={cn("absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity", color)} />
      <CardContent className="p-5 relative">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-1">{title}</p>
            <h3 className="text-2xl font-black text-foreground font-data tracking-tight">{value}</h3>
            <p className="text-[9px] font-bold text-muted-foreground mt-1 uppercase tracking-wider">{description}</p>
          </div>
          <div className={cn("p-2 rounded-xl bg-white/5 border border-white/5", color.replace('bg-', 'text-'))}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
