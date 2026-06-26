import React from "react";
import { motion } from "framer-motion";
import { Zap, Brain, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MissionProfile } from "@/lib/types";

interface MissionProfileSelectorProps {
  selected: MissionProfile;
  onSelect: (profile: MissionProfile) => void;
}

const profiles = [
  {
    id: "FAST_SCAN" as MissionProfile,
    label: "Fast Scan",
    description: "High-velocity metadata & estimated value",
    icon: Zap,
    color: "text-amber-400",
    bgColor: "bg-amber-400/10",
    borderColor: "border-amber-400/20",
  },
  {
    id: "DEEP_INTEL" as MissionProfile,
    label: "Deep Intel",
    description: "Full marketplace scrape & AI strategy",
    icon: Brain,
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/20",
  },
  {
    id: "STRICT_PROFIT" as MissionProfile,
    label: "Strict Profit",
    description: "Verified sold data & conservative pricing",
    icon: ShieldCheck,
    color: "text-emerald-400",
    bgColor: "bg-emerald-400/10",
    borderColor: "border-emerald-400/20",
  },
];

export function MissionProfileSelector({ selected, onSelect }: MissionProfileSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {profiles.map((profile) => (
        <button
          key={profile.id}
          onClick={() => onSelect(profile.id)}
          className={cn(
            "relative group flex flex-col p-4 rounded-2xl border transition-all duration-300 text-left",
            selected === profile.id
              ? cn("bg-background shadow-lg scale-105 z-10", profile.borderColor.replace('/20', '/50'))
              : "bg-background/40 border-white/5 hover:border-white/10 opacity-70 hover:opacity-100"
          )}
        >
          {selected === profile.id && (
            <motion.div
              layoutId="active-bg"
              className={cn("absolute inset-0 rounded-2xl opacity-5", profile.bgColor)}
            />
          )}
          
          <div className="flex items-center gap-3 mb-2 relative z-10">
            <div className={cn("p-2 rounded-xl border shadow-inner", profile.bgColor, profile.borderColor)}>
              <profile.icon className={cn("w-4 h-4", profile.color)} />
            </div>
            <span className={cn("text-[11px] font-black uppercase tracking-widest", selected === profile.id ? "text-foreground" : "text-muted-foreground")}>
              {profile.label}
            </span>
          </div>
          
          <p className="text-[10px] text-muted-foreground leading-tight px-1 relative z-10">
            {profile.description}
          </p>
          
          {selected === profile.id && (
            <div className={cn("absolute top-3 right-3 w-1.5 h-1.5 rounded-full animate-pulse shadow-[0_0_10px]", profile.id === 'FAST_SCAN' ? 'bg-amber-400 shadow-amber-400' : profile.id === 'DEEP_INTEL' ? 'bg-primary shadow-primary' : 'bg-emerald-400 shadow-emerald-400')} />
          )}
        </button>
      ))}
    </div>
  );
}
