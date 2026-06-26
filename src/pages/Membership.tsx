import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  Zap,
  Crown,
  Sparkles,
  Loader2,
  ExternalLink,
  Shield,
  Eye,
  Package,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import { invokeSupabaseFunction, parseSupabaseFunctionError } from "@/lib/supabase-functions";

const plans = [
  {
    id: "free",
    name: "LITE RECON",
    identifier: "OPERATOR_CLASS_III",
    price: "A$0",
    period: "FOREVER",
    description: "ENTRY-LEVEL INTELLIGENCE FOR CASUAL OPERATIONS",
    features: [
      "5 Neural Scans / Month",
      "Single Item Analysis",
      "Standard CSV Exports",
      "L1 Market Intelligence",
      "Inventory Logging",
      "Basic Logistics Tracking",
    ],
    limitations: [],
    icon: Package,
    gradient: "from-slate-500/10 to-transparent",
    popular: false,
    cta: "INITIATE RECON",
    urgency: null as string | null,
  },
  {
    id: "pro",
    name: "TACTICAL SCAN",
    identifier: "OPERATOR_CLASS_II",
    price: "A$19",
    period: "/MONTH",
    description: "ENHANCED TELEMETRY FOR ACTIVE DEALERS",
    features: [
      "Everything in Lite Recon, plus:",
      "50 Neural Scans / Month",
      "30-Item Multi-Scanner",
      "L2 Pricing Prediction",
      "Priority AI Processing",
      "Advanced Repricing Engine",
    ],
    limitations: [],
    icon: Zap,
    gradient: "from-primary/20 via-primary/5 to-transparent",
    popular: true,
    cta: "UPGRADE TO TACTICAL",
    urgency: "OPERATIONAL STANDARD",
  },
  {
    id: "unlimited",
    name: "GLOBAL COMMAND",
    identifier: "OPERATOR_CLASS_I",
    price: "A$49",
    period: "/MONTH",
    description: "UNRESTRICTED ACCESS TO THE GLOBAL INTEL FEED",
    features: [
      "Everything in Tactical, plus:",
      "Unlimited Neural Scans",
      "L3 Real-time Data Feed",
      "Bulk Payload Exports",
      "Direct Support Uplink",
      "Early Access: Alpha Tools",
    ],
    limitations: [],
    icon: Crown,
    gradient: "from-amber-500/20 via-amber-500/5 to-transparent",
    popular: false,
    cta: "TAKE COMMAND",
    urgency: "BEST VALUE FOR VOLUME",
  },
];

export default function Membership() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { planType, subscribed, scansUsed, scansLimit, loading, checkSubscription } = useSubscription();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast.success("Welcome to your new plan! Your membership is now active.");
      checkSubscription();
    } else if (searchParams.get("canceled") === "true") {
      toast.info("Checkout was canceled. No charges were made.");
    }
  }, [searchParams, checkSubscription]);

  const handleCheckout = async (selectedPlan: string) => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (selectedPlan === "free") return;

    setCheckoutLoading(selectedPlan);
    try {
      const { data, error } = await invokeSupabaseFunction<{ url?: string }>("create-checkout", {
        body: { planType: selectedPlan },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error: unknown) {
      console.error("Checkout error:", error);
      toast.error(await parseSupabaseFunctionError(error, "Failed to start checkout"));
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await invokeSupabaseFunction<{ url?: string }>("customer-portal");

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error: unknown) {
      console.error("Portal error:", error);
      toast.error(await parseSupabaseFunctionError(error, "Failed to open subscription portal"));
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <Layout>
      <PageTransition>
      <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-background via-background to-muted/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16 relative"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-12 w-64 h-64 bg-primary/10 blur-[100px] rounded-full pointer-events-none" />
            
            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white/5 border border-white/10 mb-8 backdrop-blur-md">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-black text-foreground uppercase tracking-[0.3em]">Neural Link Status: Authorized</span>
            </div>
            
            <h1 className="text-5xl sm:text-7xl font-black mb-6 tracking-tighter text-foreground uppercase">
              Expand Your <span className="text-primary italic">Intelligence</span>
            </h1>
            <p className="text-base font-bold text-muted-foreground max-w-2xl mx-auto uppercase tracking-wider opacity-60 leading-relaxed">
              Elevate your operational clearance. Access higher-density telemetry / real-time market synchronization / unlimited profit extraction.
            </p>
          </motion.div>

          {/* Current Plan Status */}
          {user && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-12"
            >
              <Card className="bg-background/40 backdrop-blur-md border border-white/5 overflow-hidden group relative">
                <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-30" />
                <CardContent className="flex flex-col sm:flex-row items-center justify-between p-8 gap-6">
                  <div className="flex items-center gap-6">
                    <div className="p-5 rounded-2xl bg-white/5 border border-white/10 group-hover:border-primary/50 transition-colors duration-500">
                      {planType === "unlimited" ? (
                        <Crown className="w-8 h-8 text-primary" />
                      ) : planType === "pro" ? (
                        <Zap className="w-8 h-8 text-primary" />
                      ) : (
                        <Package className="w-8 h-8 text-muted-foreground/40" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                        <p className="text-[10px] font-black text-primary/60 uppercase tracking-widest">Active Authentication</p>
                      </div>
                      <p className="text-2xl font-black uppercase tracking-tight text-foreground">{planType}</p>
                      {(planType === "pro" || planType === "free") && scansLimit > 0 && (
                        <div className="mt-3 flex items-center gap-4">
                          <div className="flex-1 min-w-[200px] h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${(scansUsed / scansLimit) * 100}%` }}
                              className="h-full bg-primary/40 shadow-[0_0_10px_rgba(14,165,233,0.3)]" 
                            />
                          </div>
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">
                            {scansUsed} <span className="mx-1">/</span> {scansLimit} <span className="ml-2 text-foreground/40">SCANS CONSUMED</span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="ghost"
                      className="h-12 px-6 rounded-2xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest hover:bg-white/10"
                      onClick={() => checkSubscription()}
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin text-primary" : ""}`} />
                      Refresh Data
                    </Button>
                    {subscribed && (
                      <Button
                        variant="ghost"
                        className="h-12 px-6 rounded-2xl bg-primary/10 border border-primary/20 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/20"
                        onClick={handleManageSubscription}
                        disabled={portalLoading}
                      >
                        {portalLoading ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <ExternalLink className="w-4 h-4 mr-2" />
                        )}
                        Strategic Billing Hub
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, index) => {
              const isCurrentPlan = planType === plan.id;
              const Icon = plan.icon;

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.1 }}
                  className="relative group"
                >
                  <Card 
                    className={cn(
                      "relative h-full flex flex-col border-white/5 bg-background/40 backdrop-blur-md transition-all duration-500 overflow-hidden",
                      isCurrentPlan 
                        ? "border-primary/50 ring-1 ring-primary/20 shadow-2xl shadow-primary/10" 
                        : plan.popular 
                          ? "border-primary/30 shadow-xl shadow-primary/5 hover:border-primary/50"
                          : "hover:border-white/20"
                    )}
                  >
                    <div className={cn(
                      "absolute inset-0 bg-gradient-to-br opacity-20 pointer-events-none transition-opacity duration-500",
                      plan.gradient,
                      "group-hover:opacity-40"
                    )} />
                    
                    {plan.popular && !isCurrentPlan && (
                      <div className="absolute -right-12 top-6 rotate-45 bg-primary px-12 py-1 shadow-xl">
                        <span className="text-[9px] font-black text-primary-foreground uppercase tracking-widest italic">POPULAR CHOICE</span>
                      </div>
                    )}
                    
                    {isCurrentPlan && (
                      <div className="absolute top-0 right-0 p-4">
                        <div className="px-3 py-1 rounded-full bg-success/10 border border-success/30 text-[9px] font-black text-success uppercase tracking-widest italic">CURRENT CLEARANCE</div>
                      </div>
                    )}

                    <CardHeader className="p-8 pb-4 relative">
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 group-hover:scale-110 transition-transform duration-500">
                          <Icon className="w-6 h-6 text-primary" />
                        </div>
                        <div className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">{plan.identifier}</div>
                      </div>
                      
                      <CardTitle className="text-2xl font-black uppercase tracking-tight text-foreground mb-4">
                        {plan.name}
                      </CardTitle>
                      
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-4xl font-black text-foreground font-data">{plan.price}</span>
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{plan.period}</span>
                      </div>
                      
                      <CardDescription className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider leading-relaxed">
                        {plan.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="p-8 pt-6 flex-1 relative">
                      <div className="h-px bg-white/5 w-full mb-8" />
                      <ul className="space-y-4">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-start gap-4 group/item">
                            <div className="p-1 rounded-md bg-white/5 border border-white/10 group-hover/item:border-primary/40 transition-colors mt-0.5">
                              <Check className="w-3 h-3 text-primary" />
                            </div>
                            <span className="text-xs font-bold text-foreground/70 uppercase tracking-tight group-hover/item:text-foreground transition-colors">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>

                    <div className="p-8 pt-0 relative mt-auto">
                      {plan.urgency && !isCurrentPlan && (
                        <div className="flex items-center gap-2 justify-center mb-6">
                          <div className="w-1 h-1 rounded-full bg-primary/40" />
                          <p className="text-[9px] font-black text-primary/60 uppercase tracking-widest">{plan.urgency}</p>
                          <div className="w-1 h-1 rounded-full bg-primary/40" />
                        </div>
                      )}
                      
                      {isCurrentPlan ? (
                        <Button className="w-full h-14 rounded-2xl border-white/10 bg-white/5 text-[11px] font-black uppercase tracking-[0.2em]" variant="outline" disabled>
                          Access Authorized
                        </Button>
                      ) : (
                        <Button
                          className={cn(
                            "w-full h-14 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all duration-300",
                            plan.popular 
                              ? "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(14,165,233,0.3)] hover:scale-[1.02] active:scale-[0.98]" 
                              : "bg-white/5 text-foreground hover:bg-white/10"
                          )}
                          onClick={() => handleCheckout(plan.id)}
                          disabled={checkoutLoading === plan.id}
                        >
                          {checkoutLoading === plan.id ? (
                            <><Loader2 className="w-4 h-4 mr-3 animate-spin" /> Uplinking...</>
                          ) : (
                            <><Sparkles className="w-4 h-4 mr-3" /> {plan.cta}</>
                          )}
                        </Button>
                      )}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Features Comparison */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-24"
          >
            <div className="text-center mb-10">
              <h3 className="text-xl font-black text-foreground uppercase tracking-[0.2em] mb-3">Tactical Capabilities</h3>
              <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest italic">Core Module Performance Specs</p>
            </div>
            
            <div className="grid sm:grid-cols-3 gap-6">
              <div className="bg-background/40 backdrop-blur-md border border-white/5 rounded-3xl p-8 text-center group relative overflow-hidden">
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Zap className="w-10 h-10 text-primary mx-auto mb-6 group-hover:scale-110 transition-transform duration-500" />
                <h4 className="text-sm font-black text-foreground uppercase tracking-widest mb-3">Real-time Detection</h4>
                <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider leading-relaxed">
                  Identify operational assets instantly via high-fidelity neural scan protocols.
                </p>
              </div>
              <div className="bg-background/40 backdrop-blur-md border border-white/5 rounded-3xl p-8 text-center group relative overflow-hidden">
                <div className="absolute inset-0 bg-success/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <TrendingUp className="w-10 h-10 text-success mx-auto mb-6 group-hover:scale-110 transition-transform duration-500" />
                <h4 className="text-sm font-black text-foreground uppercase tracking-widest mb-3">Market Telemetry</h4>
                <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider leading-relaxed">
                  Synchronize with global pricing feeds for frame-accurate market value extraction.
                </p>
              </div>
              <div className="bg-background/40 backdrop-blur-md border border-white/5 rounded-3xl p-8 text-center group relative overflow-hidden">
                <div className="absolute inset-0 bg-info/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Package className="w-10 h-10 text-info mx-auto mb-6 group-hover:scale-110 transition-transform duration-500" />
                <h4 className="text-sm font-black text-foreground uppercase tracking-widest mb-3">Bulk Extraction</h4>
                <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider leading-relaxed">
                  Process up to 30 unique asset signatures in a single deployment session.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      </PageTransition>
    </Layout>
  );
}
