import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, ShieldCheck, Target, CheckCircle2, Crown, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface MissionProgressTrackerProps {
  hasImage: boolean;
  hasAnalysis: boolean;
  hasVerifiedData: boolean;
  hasStrategy: boolean;
  onUpgrade: () => void;
}

export function MissionProgressTracker({
  hasImage,
  hasAnalysis,
  hasVerifiedData,
  hasStrategy,
  onUpgrade,
}: MissionProgressTrackerProps) {
  const captureDone = hasImage;
  const verifyDone = hasAnalysis;
  const verifiedDone = hasAnalysis && hasVerifiedData;
  const strategyDone = hasStrategy;

  const steps = [
    {
      key: "capture",
      title: "Capture",
      hint: captureDone ? "Image locked" : "Upload or scan an asset",
      icon: Camera,
      done: captureDone,
      active: !captureDone,
    },
    {
      key: "verify",
      title: "Verify",
      hint: verifyDone
        ? verifiedDone
          ? "Market data verified"
          : "Analysis complete — comps limited"
        : "Run AI analysis to identify the asset",
      icon: ShieldCheck,
      done: verifyDone,
      active: captureDone && !verifyDone,
    },
    {
      key: "strategize",
      title: "Strategize",
      hint: strategyDone
        ? "Pricing strategy locked in"
        : verifiedDone
          ? "Generate the profit strategy"
          : "Unlocks after verification",
      icon: Target,
      done: strategyDone,
      active: verifiedDone && !strategyDone,
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const progressPct = Math.round((completedCount / steps.length) * 100);

  return (
    <Card className="bg-white/5 border-white/5 backdrop-blur-3xl rounded-[2.5rem] p-8 space-y-6 shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[80px]" />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40 mb-1">
            Mission Progress
          </p>
          <h4 className="font-black text-lg uppercase tracking-[0.15em] text-foreground leading-none">
            {progressPct === 100 ? "Mission Complete" : `${completedCount} / ${steps.length} Steps`}
          </h4>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40 mb-1">
            Progress
          </p>
          <p className="text-2xl font-black text-primary tabular-nums italic">{progressPct}%</p>
        </div>
      </div>

      <div className="relative h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="h-full bg-gradient-to-r from-primary via-primary to-success shadow-[0_0_12px_rgba(14,165,233,0.4)]"
        />
      </div>

      <div className="space-y-3 relative">
        {steps.map((step, idx) => {
          const StepIcon = step.icon;
          return (
            <motion.div
              key={step.key}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={cn(
                "relative flex items-start gap-4 p-4 rounded-2xl border transition-all",
                step.done
                  ? "bg-success/5 border-success/20"
                  : step.active
                    ? "bg-primary/5 border-primary/30"
                    : "bg-black/20 border-white/5 opacity-60",
              )}
            >
              <div
                className={cn(
                  "shrink-0 p-2.5 rounded-xl border shadow-inner",
                  step.done
                    ? "bg-success/10 border-success/30 text-success"
                    : step.active
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "bg-muted/20 border-white/5 text-muted-foreground/50",
                )}
              >
                {step.done ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <StepIcon className="w-4 h-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground mb-1">
                  {step.title}
                </p>
                <p className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider leading-relaxed">
                  {step.hint}
                </p>
              </div>
              {step.active && !step.done && (
                <ArrowRight className="w-3.5 h-3.5 text-primary animate-pulse mt-3" />
              )}
            </motion.div>
          );
        })}
      </div>

      <Button
        variant="outline"
        className="w-full border-primary/20 hover:bg-primary/10 text-primary font-black text-[10px] uppercase tracking-[0.4em] py-7 rounded-[1.5rem] shadow-lg"
        onClick={onUpgrade}
      >
        <Crown className="w-4 h-4 mr-3" /> Upgrade Uplink Priority
      </Button>
    </Card>
  );
}
