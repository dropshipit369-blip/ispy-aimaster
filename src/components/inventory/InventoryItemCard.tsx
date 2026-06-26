import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Calendar, DollarSign, ChevronRight, Target, Clock, AlertCircle } from "lucide-react";
import { formatAud, cn } from "@/lib/utils";
import { format } from "date-fns";
import { Item } from "@/lib/types";

interface InventoryItemCardProps {
  item: Item;
  onClick: () => void;
  onLongPress?: () => void;
  isSelected?: boolean;
  statusBadge: React.ReactNode;
}

export const InventoryItemCard: React.FC<InventoryItemCardProps> = ({
  item,
  onClick,
  onLongPress,
  isSelected = false,
  statusBadge,
}) => {
  const handleContextMenu = (e: React.MouseEvent) => {
    if (onLongPress) {
      e.preventDefault();
      onLongPress();
    }
  };
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
    >
      <Card
        onClick={onClick}
        onContextMenu={handleContextMenu}
        className={cn(
          "border-white/5 bg-background/40 backdrop-blur-md overflow-hidden relative group cursor-pointer transition-all duration-500 shadow-xl",
          isSelected ? "border-primary ring-1 ring-primary/50 bg-primary/5" : "hover:border-primary/30"
        )}
      >
        <AnimatePresence>
          {isSelected && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute top-3 right-3 z-20 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-[0_0_15px_rgba(14,165,233,0.5)] border border-white/20"
            >
              <Target className="w-3 h-3 text-white" />
            </motion.div>
          )}
        </AnimatePresence>
        {/* Optical Data Surface */}
        <div className="aspect-[4/3] relative bg-black/40 overflow-hidden">
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.title || "Target"}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80 group-hover:opacity-100"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/5 to-transparent">
              <Package className="w-12 h-12 text-muted-foreground/20" />
            </div>
          )}
          
          <div className="absolute top-3 left-3 flex gap-2">
            {statusBadge}
          </div>
          
          <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-primary/20 backdrop-blur-md border border-primary/30 p-2 rounded-xl">
              <ChevronRight className="w-4 h-4 text-primary" />
            </div>
          </div>

          {/* Grid Overlay */}
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] opacity-20" />
        </div>

        <CardContent className="p-5 space-y-4">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">
              <Target className="w-2.5 h-2.5" />
              Intelligence Asset
            </div>
            <h3 className="font-bold text-lg leading-tight truncate text-foreground/90 group-hover:text-foreground transition-colors">
              {item.title || "Untitled Extraction"}
            </h3>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1 opacity-60">
              {item.brand && `${item.brand} • `}
              {item.category || "General Classification"}
            </p>
          </div>

          <div className="pt-4 border-t border-white/5 grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest leading-none">Cost Focus</p>
              <div className="flex items-center gap-1.5">
                <div className="w-1 h-3 rounded-full bg-white/10" />
                <span className="text-sm font-black text-foreground/80 font-data">
                  {formatAud(item.purchase_price)}
                </span>
              </div>
            </div>
            {item.sale_price ? (
              <div className="space-y-1">
                <p className="text-[8px] font-black text-success/50 uppercase tracking-widest leading-none">Revenue Net</p>
                <div className="flex items-center gap-1.5">
                  <div className="w-1 h-3 rounded-full bg-success/40" />
                  <span className="text-sm font-black text-success font-data">
                    {formatAud(item.sale_price)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest leading-none">Archived</p>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-muted-foreground/30" />
                  <span className="text-[10px] font-bold text-muted-foreground/60 uppercase">
                    {format(new Date(item.created_at), "MMM d")}
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
