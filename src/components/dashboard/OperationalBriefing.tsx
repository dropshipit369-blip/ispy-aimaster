import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  LucideIcon, 
  Terminal,
  ShieldCheck,
  Zap,
  LayoutDashboard
} from "lucide-react";

interface OperationalBriefingProps {
  title: string;
  description: string;
  path: string;
  buttonText: string;
  icon: LucideIcon;
}

export const OperationalBriefing: React.FC<OperationalBriefingProps> = ({
  title,
  description,
  path,
  buttonText,
  icon: Icon,
}) => {
  return (
    <Card className="border-primary/20 bg-background/40 backdrop-blur-md overflow-hidden relative group">
      {/* Animated scanline */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          animate={{ y: ["-100%", "200%"] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="w-full h-[50%] bg-gradient-to-b from-transparent via-primary/5 to-transparent opacity-20"
        />
      </div>

      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row items-stretch">
          <div className="p-6 md:p-8 bg-primary/10 flex items-center justify-center shrink-0 border-b md:border-b-0 md:border-r border-primary/20">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
              <div className="relative p-4 rounded-2xl bg-black/40 border border-primary/30 shadow-2xl">
                <Icon className="w-8 h-8 text-primary group-hover:scale-110 transition-transform duration-500" />
              </div>
            </div>
          </div>
          
          <div className="p-6 md:p-8 flex-1 flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <Terminal className="w-3 h-3 text-primary/60" />
                <p className="text-[10px] font-black tracking-[0.2em] text-primary/80 uppercase">Strategic Briefing</p>
              </div>
              <h3 className="text-xl font-black tracking-tight text-foreground/90 uppercase">{title}</h3>
              <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
                {description}
              </p>
            </div>
            
            <div className="shrink-0 flex flex-col items-center gap-3">
              <Link to={path} className="w-full md:w-auto">
                <Button 
                  variant="hero" 
                  size="lg"
                  className="w-full md:w-auto px-8 h-12 rounded-2xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <Zap className="w-3.5 h-3.5 mr-2" />
                  {buttonText}
                  <ArrowRight className="w-3.5 h-3.5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3 h-3 text-success/60" />
                <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-tighter">Secure Command Link Active</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
