import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Camera,
  TrendingUp,
  DollarSign,
  BarChart3,
  Zap,
  Shield,
  ArrowRight,
  Crown,
  Sparkles,
  Eye,
  Layers,
  CheckCircle2
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";

import { AnimatedCounter } from "@/components/AnimatedCounter";
import { motion, useInView } from "framer-motion";
import { useRef, CSSProperties } from "react";
import { PageTransition } from "@/components/PageTransition";
import { staggerContainer, staggerItem } from "@/lib/animations";

const features = [
  {
    icon: Camera,
    title: "Neural Vision Analysis",
    description: "Advanced L3 vision protocols identify assets, classify condition, and extract telemetry data instantly.",
    gradient: "from-primary/20 via-primary/5 to-transparent",
  },
  {
    icon: TrendingUp,
    title: "Global Market Feed",
    description: "Real-time synchronization with eBay AU and international pricing feeds for frame-accurate valuation.",
    gradient: "from-info/20 via-info/5 to-transparent",
  },
  {
    icon: DollarSign,
    title: "Predictive Pricing",
    description: "Condition-adjusted pricing engines calculate optimal deployment values across multiple channels.",
    gradient: "from-success/20 via-success/5 to-transparent",
  },
  {
    icon: Eye,
    title: "Tactical Scanner",
    description: "High-density mobile scanner with real-time AR profit overlays and asset classification.",
    gradient: "from-warning/20 via-warning/5 to-transparent",
  },
  {
    icon: Layers,
    title: "Asset Lot Optimization",
    description: "Bundle intelligence logs multiple items into tactical lots for maximum ROI extraction.",
    gradient: "from-purple-500/20 via-purple-500/5 to-transparent",
  },
  {
    icon: Shield,
    title: "Operation Analytics",
    description: "Full-spectrum performance tracking and ROI telemetry for your entire merchant operation.",
    gradient: "from-primary/20 via-primary/5 to-transparent",
  }
];

const stats = [
  { value: "3", label: "Neural Engines" },
  { value: "4", label: "Scan Protocols" },
  { value: "2", label: "Global Feeds" },
  { value: "AUD", label: "Currency Base" }
];

const steps = [
  { number: "01", title: "ACQUIRE", description: "Target asset and initiate high-fidelity neural scan" },
  { number: "02", title: "ANALYZE", description: "Cross-reference global feeds for real-time market intel" },
  { number: "03", title: "DEPLOY", description: "Optimize pricing strategy and uplink to live marketplaces" },
];

function AnimatedSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function Landing() {
  const featuresRef = useRef(null);
  const featuresInView = useInView(featuresRef, { once: true, margin: "-50px" });

  return (
    <Layout showHeader={false}>
      <PageTransition>
        <div className="min-h-screen">
          {/* Hero Section */}
          <section className="relative overflow-hidden pt-32 pb-40">
            {/* Tactical Grid Background */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
            
            {/* Background Glows */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/10 blur-[120px] rounded-full opacity-50" />
            
            <div className="relative z-10 max-w-7xl mx-auto px-6">
              <div className="text-center max-w-4xl mx-auto">
                {/* Tactical Badge */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white/5 border border-white/10 mb-12 backdrop-blur-md"
                >
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-[10px] font-black text-foreground uppercase tracking-[0.3em]">System: Strategic Intelligence Deck</span>
                </motion.div>

                {/* Main Headline */}
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.8 }}
                  className="text-6xl md:text-8xl font-black mb-8 leading-[0.9] tracking-tighter text-foreground uppercase"
                >
                  Know The <br />
                  <span className="text-primary italic">Actual Value</span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-base font-bold text-muted-foreground mb-12 max-w-2xl mx-auto uppercase tracking-wider opacity-60 leading-relaxed"
                >
                  Deploy Advanced Neural Scanning Protocols. Extract Real-Time Market Intelligence. Optimize Every Operation.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="flex flex-col sm:flex-row items-center justify-center gap-5"
                >
                  <Button variant="premium" className="h-20 px-12 rounded-[2rem] text-sm uppercase tracking-[0.3em] shadow-2xl shadow-amber-500/20 hover:scale-[1.05] active:scale-[0.95] transition-all group" asChild>
                    <Link to="/signup">
                      INITIATE SYSTEM
                      <ArrowRight className="w-5 h-5 ml-4 group-hover:translate-x-2 transition-transform" />
                    </Link>
                  </Button>
                  <Button variant="ghost" className="h-20 px-10 rounded-[2rem] bg-white/5 border border-white/5 font-black text-[10px] uppercase tracking-[0.2em] transition-all" asChild>
                    <Link to="/membership">
                      <Zap className="w-4 h-4 mr-3 text-primary" />
                      VIEW TACTICAL PLANS
                    </Link>
                  </Button>
                </motion.div>

                {/* Price Anchoring */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="mt-12 flex flex-wrap items-center justify-center gap-8 opacity-40 grayscale"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Typical ROI: 3.5x</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Avg Profit/Item: $42</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Cost/Month: <span className="text-foreground">$19</span></span>
                  </div>
                </motion.div>
              </div>

              {/* Stats Grid */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-32 max-w-4xl mx-auto"
              >
                {stats.map((stat, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.9 + i * 0.1 }}
                    className="text-center group border-l border-white/5 pl-8 first:border-none"
                  >
                    <div className="text-4xl font-black text-foreground font-data mb-2">
                      <AnimatedCounter value={stat.value} duration={2.5} />
                    </div>
                    <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-40">{stat.label}</div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </section>

          {/* How it Works - 3 Steps */}
          <AnimatedSection>
            <section className="py-40 px-6 relative">
              <div className="absolute inset-0 bg-white/[0.02] -skew-y-3 pointer-events-none" />
              <div className="max-w-5xl mx-auto relative">
                <div className="text-center mb-24">
                  <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tight text-foreground uppercase">
                    Operational <span className="text-primary italic">Protocols</span>
                  </h2>
                  <p className="text-[10px] font-bold text-muted-foreground/60 max-w-xl mx-auto uppercase tracking-[0.3em]">
                    System workflow for maximum asset extraction.
                  </p>
                </div>

                <div className="grid md:grid-cols-3 gap-12">
                  {steps.map((step, i) => (
                    <motion.div
                      key={step.number}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.15 }}
                      className="relative group lg:px-6"
                    >
                      <div className="text-8xl font-black text-white/[0.02] mb-[-4rem] font-display transition-all duration-500 group-hover:text-primary/[0.05] tracking-tighter">
                        {step.number}
                      </div>
                      <h3 className="text-xl font-black mb-3 text-foreground uppercase tracking-tight relative z-10">{step.title}</h3>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider leading-relaxed opacity-60">{step.description}</p>
                      
                      {i < steps.length - 1 && (
                        <div className="hidden lg:block absolute top-12 right-0 translate-x-1/2 w-24 h-px bg-gradient-to-r from-primary/40 to-transparent opacity-20" />
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>
          </AnimatedSection>

          {/* Features Section */}
          <section className="py-40 px-6 bg-white/[0.01] border-y border-white/5" ref={featuresRef}>
            <div className="max-w-7xl mx-auto">
              <AnimatedSection>
                <div className="text-center mb-24">
                  <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tight text-foreground uppercase">
                    Full Spectrum <br />
                    <span className="text-primary italic">Capabilities</span>
                  </h2>
                  <p className="text-[10px] font-bold text-muted-foreground/60 max-w-2xl mx-auto uppercase tracking-[0.3em]">
                    Integrated tools for elite merchant logistics.
                  </p>
                </div>
              </AnimatedSection>

              <motion.div
                variants={staggerContainer}
                initial="initial"
                animate={featuresInView ? "animate" : "initial"}
                className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
              >
                {features.map((feature, i) => (
                  <motion.div key={i} variants={staggerItem}>
                    <Card className={`group relative h-full bg-background/40 backdrop-blur-md border border-white/5 transition-all duration-500 hover:border-primary/40 overflow-hidden rounded-[2.5rem]`}>
                      <div className={cn(
                        "absolute inset-0 bg-gradient-to-br opacity-5 group-hover:opacity-20 transition-opacity duration-500",
                        feature.gradient
                      )} />
                      <CardContent className="p-10 relative">
                        <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:border-primary/40 transition-all duration-500">
                          <feature.icon className="w-8 h-8 text-primary shadow-[0_0_15px_rgba(14,165,233,0.3)]" />
                        </div>
                        <h3 className="text-xl font-black mb-4 text-foreground uppercase tracking-tight">{feature.title}</h3>
                        <p className="text-xs font-bold text-muted-foreground uppercase leading-relaxed tracking-wider opacity-60 group-hover:opacity-100 transition-opacity">{feature.description}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </section>

          {/* Social Proof / Trust */}
          <AnimatedSection>
            <section className="py-20 px-6">
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-12">
                  <h2 className="text-3xl md:text-4xl font-bold mb-4">
                    Built for <span className="gradient-text">Australian Resellers</span>
                  </h2>
                </div>
                <div className="grid sm:grid-cols-3 gap-6">
                  {[
                    { label: "Live Connectors", value: "2", desc: "eBay Australia & 1stDibs — Completed/Sold listings only" },
                    { label: "Scan Types", value: "4", desc: "Photo, Live, Barcode, and Lot scanning" },
                    { label: "AI Models", value: "3", desc: "Vision, Pricing, and Strategy AI" },
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      className="text-center p-6 rounded-2xl bg-card/50 border border-border/50"
                    >
                      <div className="text-4xl font-bold text-primary mb-1">{item.value}</div>
                      <div className="font-semibold mb-1">{item.label}</div>
                      <div className="text-xs text-muted-foreground">{item.desc}</div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>
          </AnimatedSection>

          {/* CTA Section */}
          <AnimatedSection>
            <section className="py-40 px-6">
              <div className="max-w-4xl mx-auto text-center">
                <div className="relative group">
                  <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full opacity-50 group-hover:opacity-100 transition-opacity duration-1000" />
                  
                  <Card className="relative border-white/5 bg-background/40 backdrop-blur-3xl overflow-hidden rounded-[3rem] p-4">
                    <CardContent className="p-16 border border-white/5 rounded-[2.5rem]">
                      <div className="relative w-40 h-40 mx-auto mb-10">
                        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
                        <img src="/logo.png" alt="Ispy.ai Logo" className="relative w-full h-full object-contain block group-hover:scale-110 transition-transform duration-700" />
                      </div>
                      
                      <h2 className="text-5xl md:text-6xl font-black mb-6 tracking-tight text-foreground uppercase">
                        Ready To <span className="text-primary italic">Command</span>?
                      </h2>
                      <p className="text-sm font-bold text-muted-foreground mb-12 max-w-xl mx-auto uppercase tracking-wider opacity-60 leading-relaxed">
                        Join the elite tier of modern merchants. Start your operational uplink today.
                      </p>
                      
                      <Button variant="premium" className="h-24 px-20 rounded-[2.5rem] text-sm uppercase tracking-[0.3em] shadow-[0_0_50px_rgba(245,158,11,0.2)] hover:scale-[1.05] active:scale-[0.95] transition-all group/btn" asChild>
                        <Link to="/signup">
                          ACTIVATE FULL COMMAND
                          <ArrowRight className="w-6 h-6 ml-5 group-hover/btn:translate-x-2 transition-transform" />
                        </Link>
                      </Button>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.3em]">
                        <span className="flex items-center justify-center gap-2"><div className="w-1 h-1 rounded-full bg-primary/40" /> FREE START</span>
                        <span className="flex items-center justify-center gap-2"><div className="w-1 h-1 rounded-full bg-primary/40" /> NO INTEL LIMITS</span>
                        <span className="flex items-center justify-center gap-2"><div className="w-1 h-1 rounded-full bg-primary/40" /> MOBILE OPTIMIZED</span>
                        <span className="flex items-center justify-center gap-2"><div className="w-1 h-1 rounded-full bg-primary/40" /> L3 NEURAL ENGINE</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </section>
          </AnimatedSection>

          {/* Footer */}
          <footer className="py-8 px-6 border-t border-border/50">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
                  <img src="/logo.png" alt="Ispy.ai" className="w-8 h-8 object-cover" />
                </div>
                <span className="font-semibold gradient-text">Ispy.ai</span>
              </div>
              <p className="text-sm text-muted-foreground">
                &copy; {new Date().getFullYear()} Ispy.ai. All rights reserved.
              </p>
            </div>
          </footer>
        </div>
      </PageTransition>
    </Layout>
  );
}
