# iSpy.ai Premium Overhaul — UltraPlan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform iSpy.ai from a functional resale tool into a world-class premium product — eliminate dead code, upgrade every UI surface, make the mascot an adaptive learning companion, and deploy psychological engagement patterns that drive retention and revenue from sourcing to shipping.

**Architecture:** React + Supabase PWA. All changes are frontend-first (components, pages, hooks, CSS). No backend schema changes. Mascot evolution uses localStorage for user behavior tracking. Engagement patterns use existing Supabase tables + client-side state.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion, Supabase, React Router v6

---

## Phase 0: Dead Code Purge & Cleanup

### Task 0.1: Delete Unused shadcn/ui Components

**Files:**
- Delete: `src/components/ui/accordion.tsx`
- Delete: `src/components/ui/alert-dialog.tsx`
- Delete: `src/components/ui/avatar.tsx`
- Delete: `src/components/ui/calendar.tsx`
- Delete: `src/components/ui/carousel.tsx`
- Delete: `src/components/ui/command.tsx`
- Delete: `src/components/ui/context-menu.tsx`
- Delete: `src/components/ui/hover-card.tsx`
- Delete: `src/components/ui/menubar.tsx`
- Delete: `src/components/ui/navigation-menu.tsx`
- Delete: `src/components/ui/pagination.tsx`
- Delete: `src/components/ui/radio-group.tsx`
- Delete: `src/components/ui/resizable.tsx`
- Delete: `src/components/ui/slider.tsx`
- Delete: `src/components/ui/toggle-group.tsx`

- [ ] **Step 1: Verify zero imports for each component**

Run: `grep -rl "ui/accordion\|ui/alert-dialog\|ui/avatar\|ui/calendar\|ui/carousel\|ui/command\|ui/context-menu\|ui/hover-card\|ui/menubar\|ui/navigation-menu\|ui/pagination\|ui/radio-group\|ui/resizable\|ui/slider\|ui/toggle-group" src/ --include="*.tsx" --include="*.ts" | grep -v "src/components/ui/"`

Expected: No results (zero imports outside `src/components/ui/`)

- [ ] **Step 2: Delete all 15 unused UI component files**

```bash
cd src/components/ui
rm accordion.tsx alert-dialog.tsx avatar.tsx calendar.tsx carousel.tsx command.tsx context-menu.tsx hover-card.tsx menubar.tsx navigation-menu.tsx pagination.tsx radio-group.tsx resizable.tsx slider.tsx toggle-group.tsx
```

- [ ] **Step 3: Run build to verify nothing breaks**

Run: `npm run build`
Expected: Build succeeds with zero errors

- [ ] **Step 4: Commit**

```bash
git add -A src/components/ui/
git commit -m "chore: remove 15 unused shadcn/ui components — reduce bundle size"
```

---

### Task 0.2: Delete Dead/Legacy Components

**Files:**
- Delete: `src/components/ScanLogModal.tsx` (only imported by legacy LiveScanner.tsx)
- Delete: `src/components/LiveScanner.tsx` (superseded by scanner/LiveScanV2.tsx)
- Delete: `src/components/NavLink.tsx` (only used by WalkAwaySummary internal — not a real nav link)
- Delete: `src/components/scanner/ConditionSelector.tsx` (not imported anywhere)
- Delete: `src/components/scanner/ConfidenceProfile.tsx` (not imported anywhere)
- Delete: `src/components/scanner/LotBuilder.tsx` (not imported anywhere)
- Delete: `src/components/scanner/PriceComparison.tsx` (not imported anywhere)
- Delete: `src/pages/Install.tsx` (not in router, dead page)
- Delete: `src/pages/DebugAuth.tsx` (debug-only, not for production)

- [ ] **Step 1: Verify LiveScanner.tsx is truly superseded**

Check that `Scan.tsx` imports `LiveScanV2` (not `LiveScanner`):
```bash
grep -n "LiveScanner\|LiveScanV2" src/pages/Scan.tsx
```
Expected: Only `LiveScanV2` import on line 52. If `LiveScanner` is also imported in Scan.tsx, remove that import line too.

- [ ] **Step 2: Check if LiveScanner is imported in useSubscription.ts**

```bash
grep -n "LiveScanner" src/hooks/useSubscription.ts
```
If imported, it's likely a type reference. Remove the import.

- [ ] **Step 3: Delete all dead files**

```bash
rm src/components/ScanLogModal.tsx
rm src/components/LiveScanner.tsx
rm src/components/NavLink.tsx
rm src/components/scanner/ConditionSelector.tsx
rm src/components/scanner/ConfidenceProfile.tsx
rm src/components/scanner/LotBuilder.tsx
rm src/components/scanner/PriceComparison.tsx
rm src/pages/Install.tsx
rm src/pages/DebugAuth.tsx
```

- [ ] **Step 4: Remove DebugAuth route from App.tsx**

In `src/App.tsx`, remove lines 206-211 (the `/debug-auth` route).

- [ ] **Step 5: Remove any dead imports from files that referenced deleted components**

Check and clean:
- `src/hooks/useSubscription.ts` — remove LiveScanner import if present
- `src/components/scanner/WalkAwaySummary.tsx` — remove NavLink import if present, replace with inline `<a>` or `<Link>`

- [ ] **Step 6: Build and verify**

Run: `npm run build`
Expected: Build succeeds with zero errors

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: delete 9 dead/legacy components and debug pages"
```

---

### Task 0.3: Consolidate Duplicate ItemDetail Components

Currently there are 3 item detail components:
- `src/components/ItemDetailModal.tsx` — used by Dashboard + Inventory (dialog-based)
- `src/components/scanner/ItemDetailModal.tsx` — used by LiveScanV2 (scanner context)
- `src/components/scanner/ItemDetailDrawer.tsx` — used by Index.tsx (spatial scanner)

**Decision:** Keep all 3 because they serve different contexts (dashboard vs. scanner vs. spatial). But rename for clarity.

**Files:**
- Modify: `src/components/ItemDetailModal.tsx` (add comment header)
- Modify: `src/components/scanner/ItemDetailModal.tsx` (add comment header)
- Modify: `src/components/scanner/ItemDetailDrawer.tsx` (add comment header)

- [ ] **Step 1: Add clarifying comment to each file**

In `src/components/ItemDetailModal.tsx` line 1, add:
```typescript
/** Item detail modal for Dashboard and Inventory pages — full edit capabilities. */
```

In `src/components/scanner/ItemDetailModal.tsx` line 1, add:
```typescript
/** Item detail modal for LiveScanV2 — scanner-context with quick-save actions. */
```

In `src/components/scanner/ItemDetailDrawer.tsx` line 1, add:
```typescript
/** Item detail drawer for spatial scanner (Index page) — mobile-optimized slide-up. */
```

- [ ] **Step 2: Build verify**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/components/ItemDetailModal.tsx src/components/scanner/ItemDetailModal.tsx src/components/scanner/ItemDetailDrawer.tsx
git commit -m "docs: clarify purpose of 3 ItemDetail component variants"
```

---

## Phase 1: UI Upgrade — Buttons, Cards, Navigation

### Task 1.1: Upgrade Button Component with Premium Variants

**Files:**
- Modify: `src/components/ui/button.tsx`

- [ ] **Step 1: Add premium button variants and micro-interactions**

Replace the full `buttonVariants` definition in `src/components/ui/button.tsx` with:

```typescript
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 hover:shadow-glow hover:-translate-y-0.5",
        destructive:
          "bg-destructive text-destructive-foreground shadow-md hover:bg-destructive/90 hover:-translate-y-0.5",
        outline:
          "border border-border bg-transparent hover:bg-secondary hover:text-secondary-foreground hover:border-primary/30 hover:-translate-y-0.5",
        secondary:
          "bg-secondary text-secondary-foreground shadow-md hover:bg-secondary/80 hover:-translate-y-0.5",
        ghost:
          "hover:bg-secondary hover:text-secondary-foreground",
        link:
          "text-primary underline-offset-4 hover:underline",
        hero:
          "bg-gradient-to-r from-primary via-amber-500 to-primary bg-[length:200%_100%] text-primary-foreground shadow-lg hover:shadow-glow-lg hover:scale-[1.03] hover:bg-[position:100%_0] active:scale-[0.98] transition-all duration-500",
        glass:
          "bg-card/50 backdrop-blur-md border border-border/50 text-foreground hover:bg-card/70 hover:border-primary/30 hover:-translate-y-0.5",
        success:
          "bg-success text-success-foreground shadow-md hover:bg-success/90 hover:-translate-y-0.5",
        premium:
          "bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 bg-[length:200%_100%] text-black font-bold shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.03] hover:bg-[position:100%_0] active:scale-[0.98] transition-all duration-500",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 rounded-lg px-3.5",
        lg: "h-12 rounded-xl px-8 text-base",
        xl: "h-14 rounded-2xl px-10 text-lg",
        icon: "h-10 w-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);
```

Key changes:
- `rounded-lg` → `rounded-xl` base (softer, more premium)
- `font-medium` → `font-semibold` (bolder text)
- Added `active:scale-[0.97]` globally for tactile press feedback
- Added `hover:-translate-y-0.5` lift effect on most variants
- `hero` variant: animated gradient sweep via `bg-[length:200%]` + `hover:bg-[position:100%_0]`
- New `premium` variant: gold gradient with glow shadow for upgrade CTAs
- `icon` size now uses `rounded-xl`
- Default size padding increased slightly (`px-4` → `px-5`)

- [ ] **Step 2: Build and visually verify**

Run: `npm run build`
Run: `npm run dev` and check buttons across Dashboard, Scan, Landing, Membership pages

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/button.tsx
git commit -m "ui: upgrade button component — premium variants, micro-interactions, animated gradients"
```

---

### Task 1.2: Upgrade Global CSS — Premium Feel

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Add premium animation keyframes and utility classes**

Append the following at the end of `src/index.css`:

```css
/* Premium micro-interaction animations */
@keyframes gradient-x {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

@keyframes entrance-pop {
  0% { opacity: 0; transform: scale(0.9) translateY(8px); }
  60% { transform: scale(1.02) translateY(-2px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}

@keyframes subtle-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

@keyframes glow-ring {
  0%, 100% { box-shadow: 0 0 0 0 hsl(var(--primary) / 0.4); }
  50% { box-shadow: 0 0 0 8px hsl(var(--primary) / 0); }
}

.animate-gradient-x {
  animation: gradient-x 3s ease infinite;
  background-size: 200% 200%;
}

.animate-entrance-pop {
  animation: entrance-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.animate-subtle-bounce {
  animation: subtle-bounce 2s ease-in-out infinite;
}

.animate-glow-ring {
  animation: glow-ring 2s ease-in-out infinite;
}

/* Premium card hover state */
.card-interactive {
  @apply transition-all duration-300 cursor-pointer;
}

.card-interactive:hover {
  @apply -translate-y-1 shadow-lg border-primary/30;
  box-shadow: 0 8px 30px hsl(var(--primary) / 0.1), 0 4px 12px rgba(0,0,0,0.05);
}

.card-interactive:active {
  @apply scale-[0.99] translate-y-0;
}

/* Premium text shimmer for headings */
.text-shimmer {
  background: linear-gradient(
    110deg,
    hsl(var(--foreground)) 35%,
    hsl(var(--primary)) 50%,
    hsl(var(--foreground)) 65%
  );
  background-size: 200% 100%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: shimmer 3s linear infinite;
}

/* Focus ring upgrade */
*:focus-visible {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
  border-radius: inherit;
}

/* Smooth page transitions */
.page-enter {
  opacity: 0;
  transform: translateY(12px);
}

.page-enter-active {
  opacity: 1;
  transform: translateY(0);
  transition: all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
```

- [ ] **Step 2: Build verify**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "ui: add premium animations, card hover effects, text shimmer, glow ring"
```

---

### Task 1.3: Upgrade Header Navigation — Premium Polish

**Files:**
- Modify: `src/components/layout/Header.tsx`

- [ ] **Step 1: Upgrade desktop nav links with count badges and richer hover states**

In `src/components/layout/Header.tsx`, replace the desktop nav `<Link>` element (inside `navLinks.map`, around lines 97-117) with:

```tsx
<Link
  key={link.path}
  to={link.path}
  aria-current={isActive(link.path) ? 'page' : undefined}
  className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${isActive(link.path)
    ? 'bg-primary/15 text-primary shadow-sm'
    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/80 hover:-translate-y-0.5'
    }`}
>
  <link.icon className={`h-4 w-4 transition-transform duration-300 ${isActive(link.path) ? 'scale-110' : 'group-hover:scale-110'}`} />
  {link.label}
  {isActive(link.path) && (
    <motion.div
      layoutId="nav-indicator"
      className="absolute inset-0 rounded-xl bg-primary/10 border border-primary/20"
      style={{ zIndex: -1 }}
      transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
    />
  )}
</Link>
```

Key changes:
- `rounded-lg` → `rounded-xl`
- `font-medium` → `font-semibold`
- Added `shadow-sm` to active state
- Added `hover:-translate-y-0.5` micro-lift
- Active indicator now has `border border-primary/20` for subtle definition
- Smoother spring with less bounce (0.15 instead of 0.2)

- [ ] **Step 2: Upgrade mobile nav items with pill shape and slide animation**

In the mobile menu section (around lines 196-219), replace the mobile `<Link>` with:

```tsx
<Link
  to={link.path}
  onClick={() => setMobileMenuOpen(false)}
  aria-current={isActive(link.path) ? 'page' : undefined}
  className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-300 ${isActive(link.path)
    ? 'bg-primary/15 text-primary border border-primary/20 shadow-sm'
    : 'text-muted-foreground hover:text-foreground hover:bg-secondary active:scale-[0.98]'
    }`}
>
  <div className={`p-1.5 rounded-lg ${isActive(link.path) ? 'bg-primary/20' : 'bg-secondary'}`}>
    <link.icon className="h-4 w-4" />
  </div>
  {link.label}
  {isActive(link.path) && (
    <div className="ml-auto w-2 h-2 rounded-full bg-primary animate-glow-ring" />
  )}
</Link>
```

Key changes:
- Icons now wrapped in a tinted background pill
- `rounded-xl` → `rounded-2xl` for mobile
- Active indicator dot now has glow-ring animation
- Added `active:scale-[0.98]` for tap feedback
- Increased padding for bigger touch targets

- [ ] **Step 3: Build and test**

Run: `npm run build`
Run: `npm run dev` — verify both desktop and mobile nav

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/Header.tsx
git commit -m "ui: upgrade header nav — premium hover effects, animated indicators, bigger touch targets"
```

---

### Task 1.4: Upgrade Dashboard Cards — Engagement Magnets

**Files:**
- Modify: `src/pages/Dashboard.tsx`

- [ ] **Step 1: Upgrade stat cards with animated hover glow and number emphasis**

Replace the stats card `<CardContent>` section (around lines 441-456) with:

```tsx
<Card
  className="card-interactive group relative overflow-hidden"
  onClick={() => handleStatClick(stat.filter)}
>
  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
  <CardContent className="p-6 relative">
    <div className="flex items-center justify-between mb-3">
      <div className={`p-2 rounded-xl ${stat.color === 'text-primary' ? 'bg-primary/10' : stat.color === 'text-info' ? 'bg-info/10' : stat.color === 'text-success' ? 'bg-success/10' : 'bg-destructive/10'}`}>
        <stat.icon className={`w-5 h-5 ${stat.color}`} />
      </div>
      <div className="flex items-center gap-1">
        {stat.trend && (
          stat.trend === "up"
            ? <ArrowUpRight className="w-4 h-4 text-success" />
            : <ArrowDownRight className="w-4 h-4 text-destructive" />
        )}
        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-300" />
      </div>
    </div>
    <div className="text-3xl font-bold font-data tracking-tight">{stat.value}</div>
    <div className="text-sm text-muted-foreground mt-1">{stat.title}</div>
  </CardContent>
</Card>
```

Key changes:
- Icon now has a colored background pill
- Gradient overlay on hover
- Larger value text (`text-2xl` → `text-3xl`)
- ChevronRight animates on hover (`translate-x-0.5`)
- Added `overflow-hidden` for gradient containment

- [ ] **Step 2: Upgrade ROI card with premium gold accent**

Replace the ROI card gradient class (line ~467):
```
from-primary/10 to-info/10 border-primary/20
```
with:
```
from-primary/15 via-amber-500/10 to-info/10 border-primary/30
```

And change the ROI value `text-4xl` to `text-5xl` for more impact.

- [ ] **Step 3: Upgrade notification cards with icon animation**

In the notifications section (around line 520), add this class to the notification icon `<div>`:
```
group-hover:scale-110 transition-transform duration-300
```

And wrap each notification `<div>` with an outer div that has `className="group"`.

- [ ] **Step 4: Build and verify**

Run: `npm run build`

- [ ] **Step 5: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "ui: upgrade dashboard — premium stat cards, gold ROI accent, animated notifications"
```

---

### Task 1.5: Upgrade Membership Page — Conversion Psychology

**Files:**
- Modify: `src/pages/Membership.tsx`

- [ ] **Step 1: Add urgency and social proof cues**

Replace the plans array (lines 27-83) with:

```typescript
const plans = [
  {
    id: "free",
    name: "Free",
    price: "A$0",
    period: "forever",
    description: "Try it out — no commitment needed",
    features: [
      "5 Live Scans per month",
      "Single item analysis",
      "Lot uploads",
      "Barcode scanning",
      "Basic market reports",
      "Inventory management",
    ],
    limitations: [],
    icon: Package,
    gradient: "from-muted/50 to-muted/30",
    popular: false,
    cta: "Free Forever",
    urgency: null as string | null,
  },
  {
    id: "pro",
    name: "Pro",
    price: "A$19",
    period: "/month",
    description: "The serious reseller's toolkit",
    features: [
      "Everything in Free, plus:",
      "50 Live Scans per month",
      "Up to 30 items per scan",
      "Priority AI processing",
      "Advanced market insights",
      "Smart repricing suggestions",
    ],
    limitations: [],
    icon: Zap,
    gradient: "from-primary/20 to-info/20",
    popular: true,
    cta: "Start Pro Trial",
    urgency: "Most chosen by AU resellers",
  },
  {
    id: "unlimited",
    name: "Unlimited",
    price: "A$49",
    period: "/month",
    description: "Zero limits. Maximum profit.",
    features: [
      "Everything in Pro, plus:",
      "Unlimited Live Scans",
      "Up to 30 items per scan",
      "Bulk CSV export",
      "Priority support",
      "Early access to new features",
    ],
    limitations: [],
    icon: Crown,
    gradient: "from-amber-500/20 to-primary/20",
    popular: false,
    cta: "Go Unlimited",
    urgency: "Best value for dealers",
  },
];
```

- [ ] **Step 2: Upgrade plan card styling with urgency badge and premium CTA**

Replace the CTA button section (lines ~295-316) with:

```tsx
<div className="p-6 pt-0 mt-auto space-y-3">
  {plan.urgency && !isCurrentPlan && (
    <p className="text-xs text-center text-muted-foreground font-medium">
      {plan.urgency}
    </p>
  )}
  {isCurrentPlan ? (
    <Button className="w-full" variant="outline" disabled>
      <Check className="w-4 h-4 mr-2" />
      Current Plan
    </Button>
  ) : plan.id === "free" ? (
    <Button className="w-full" variant="outline" disabled>
      {plan.cta}
    </Button>
  ) : (
    <Button
      className="w-full"
      variant={plan.popular ? "premium" : "hero"}
      onClick={() => handleCheckout(plan.id)}
      disabled={checkoutLoading === plan.id}
    >
      {checkoutLoading === plan.id ? (
        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
      ) : (
        <><Sparkles className="w-4 h-4 mr-2" /> {plan.cta}</>
      )}
    </Button>
  )}
</div>
```

- [ ] **Step 3: Add animated border to popular plan card**

For the popular plan card, change the Card className:
```
border-primary/50
```
to:
```
border-primary shadow-lg shadow-primary/10 animate-glow-ring
```

- [ ] **Step 4: Build and verify**

Run: `npm run build`

- [ ] **Step 5: Commit**

```bash
git add src/pages/Membership.tsx
git commit -m "ui: upgrade membership — urgency cues, premium CTAs, social proof, gold gradient"
```

---

## Phase 2: Mascot Evolution — Adaptive Learning Companion

### Task 2.1: Create Mascot Behavior Tracking System

**Files:**
- Create: `src/lib/mascot-memory.ts`

- [ ] **Step 1: Create the mascot memory module**

```typescript
/**
 * Mascot memory system — tracks user behavior patterns in localStorage
 * so the mascot evolves its personality and suggestions over time.
 */

const STORAGE_KEY = "ispy-mascot-memory";

export interface MascotMemory {
  /** Total times mascot was opened */
  totalOpens: number;
  /** Pages visited (frequency map) */
  pageVisits: Record<string, number>;
  /** Features used (frequency map) */
  featuresUsed: Record<string, number>;
  /** Last 10 user questions to mascot */
  recentQuestions: string[];
  /** User's primary workflow pattern */
  detectedWorkflow: "scanner" | "inventory-manager" | "flipper" | "explorer" | null;
  /** Mascot personality level (evolves with usage) */
  level: number;
  /** Mascot name (user can customize) */
  nickname: string;
  /** Timestamps */
  firstSeen: string;
  lastSeen: string;
  /** Number of items scanned during this user's lifetime */
  lifetimeScans: number;
  /** Number of profitable items found */
  profitableFinds: number;
  /** Dismissed tips (don't repeat) */
  dismissedTips: string[];
}

const DEFAULT_MEMORY: MascotMemory = {
  totalOpens: 0,
  pageVisits: {},
  featuresUsed: {},
  recentQuestions: [],
  detectedWorkflow: null,
  level: 1,
  nickname: "Spotter",
  firstSeen: new Date().toISOString(),
  lastSeen: new Date().toISOString(),
  lifetimeScans: 0,
  profitableFinds: 0,
  dismissedTips: [],
};

export function loadMascotMemory(): MascotMemory {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_MEMORY };
    return { ...DEFAULT_MEMORY, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_MEMORY };
  }
}

export function saveMascotMemory(memory: MascotMemory): void {
  memory.lastSeen = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
}

export function trackPageVisit(pathname: string): MascotMemory {
  const memory = loadMascotMemory();
  memory.pageVisits[pathname] = (memory.pageVisits[pathname] || 0) + 1;
  detectWorkflow(memory);
  saveMascotMemory(memory);
  return memory;
}

export function trackFeatureUse(feature: string): MascotMemory {
  const memory = loadMascotMemory();
  memory.featuresUsed[feature] = (memory.featuresUsed[feature] || 0) + 1;
  updateLevel(memory);
  saveMascotMemory(memory);
  return memory;
}

export function trackMascotOpen(): MascotMemory {
  const memory = loadMascotMemory();
  memory.totalOpens += 1;
  saveMascotMemory(memory);
  return memory;
}

export function trackQuestion(question: string): MascotMemory {
  const memory = loadMascotMemory();
  memory.recentQuestions = [question, ...memory.recentQuestions].slice(0, 10);
  saveMascotMemory(memory);
  return memory;
}

export function dismissTip(tipId: string): MascotMemory {
  const memory = loadMascotMemory();
  if (!memory.dismissedTips.includes(tipId)) {
    memory.dismissedTips.push(tipId);
  }
  saveMascotMemory(memory);
  return memory;
}

function detectWorkflow(memory: MascotMemory): void {
  const visits = memory.pageVisits;
  const scan = visits["/scan"] || 0;
  const inventory = visits["/inventory"] || 0;
  const listings = visits["/listings"] || 0;
  const dashboard = visits["/dashboard"] || 0;

  if (scan > inventory * 2 && scan > listings * 2) {
    memory.detectedWorkflow = "scanner";
  } else if (inventory > scan && inventory > listings) {
    memory.detectedWorkflow = "inventory-manager";
  } else if (listings > dashboard && listings > inventory) {
    memory.detectedWorkflow = "flipper";
  } else {
    memory.detectedWorkflow = "explorer";
  }
}

function updateLevel(memory: MascotMemory): void {
  const totalActions = Object.values(memory.featuresUsed).reduce((a, b) => a + b, 0);
  if (totalActions >= 200) memory.level = 5;
  else if (totalActions >= 100) memory.level = 4;
  else if (totalActions >= 40) memory.level = 3;
  else if (totalActions >= 10) memory.level = 2;
  else memory.level = 1;
}

/** Get mascot personality title based on level */
export function getMascotTitle(level: number): string {
  switch (level) {
    case 1: return "Rookie Spotter";
    case 2: return "Sharp Eye";
    case 3: return "Market Scout";
    case 4: return "Deal Hunter";
    case 5: return "Profit Legend";
    default: return "Spotter";
  }
}

/** Get contextual tip based on current state */
export function getContextualTip(
  memory: MascotMemory,
  pathname: string,
  snapshot: { totalItems: number; pendingItems: number; soldItems: number } | null,
): { id: string; text: string } | null {
  if (!snapshot) return null;

  const tips: { id: string; text: string; condition: boolean }[] = [
    {
      id: "first-scan",
      text: "Welcome! Start by scanning your first item — just snap a photo and I'll handle the rest.",
      condition: snapshot.totalItems === 0 && pathname === "/dashboard",
    },
    {
      id: "list-pending",
      text: `You have ${snapshot.pendingItems} items ready to list. Head to Listings to start making money!`,
      condition: snapshot.pendingItems >= 3 && pathname === "/dashboard",
    },
    {
      id: "scan-streak",
      text: "Consistency is key! Scanning daily builds your market intuition. Keep the streak alive.",
      condition: pathname === "/scan" && (memory.pageVisits["/scan"] || 0) > 5,
    },
    {
      id: "try-live-scan",
      text: "Pro tip: Live Scan mode detects items in real-time through your camera. Try it at a thrift store!",
      condition: pathname === "/scan" && !(memory.featuresUsed["live-scan"]),
    },
    {
      id: "inventory-organize",
      text: "Your inventory is growing! Use status filters to keep track of what's pending, listed, and sold.",
      condition: snapshot.totalItems >= 10 && pathname === "/inventory",
    },
    {
      id: "celebrate-sales",
      text: `Nice work! ${snapshot.soldItems} items sold. You're building real momentum.`,
      condition: snapshot.soldItems >= 5 && pathname === "/dashboard",
    },
  ];

  const eligible = tips.filter(
    (t) => t.condition && !memory.dismissedTips.includes(t.id),
  );
  return eligible[0] || null;
}
```

- [ ] **Step 2: Build verify**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/lib/mascot-memory.ts
git commit -m "feat: add mascot memory system — tracks user behavior, evolves personality"
```

---

### Task 2.2: Upgrade FloatingMascot with Adaptive Personality

**Files:**
- Modify: `src/components/FloatingMascot.tsx`

- [ ] **Step 1: Import mascot memory and integrate tracking**

Add imports at the top of `FloatingMascot.tsx`:

```typescript
import {
  loadMascotMemory,
  trackMascotOpen,
  trackPageVisit,
  trackQuestion,
  dismissTip,
  getContextualTip,
  getMascotTitle,
  type MascotMemory,
} from "@/lib/mascot-memory";
```

- [ ] **Step 2: Add memory state and tracking effects**

Inside the `FloatingMascot` function, after existing state declarations, add:

```typescript
const [memory, setMemory] = useState<MascotMemory>(() => loadMascotMemory());
const [activeTip, setActiveTip] = useState<{ id: string; text: string } | null>(null);

// Track page visits
useEffect(() => {
  const updated = trackPageVisit(location.pathname);
  setMemory(updated);
}, [location.pathname]);

// Update contextual tip when snapshot or page changes
useEffect(() => {
  if (!snapshot) return;
  const tip = getContextualTip(memory, location.pathname, {
    totalItems: snapshot.totalItems,
    pendingItems: snapshot.pendingItems,
    soldItems: snapshot.soldItems,
  });
  setActiveTip(tip);
}, [snapshot, location.pathname, memory]);
```

- [ ] **Step 3: Modify the open handler to track opens**

Wrap the `setIsOpen(true)` call in the mascot button's onClick:

```typescript
onClick={() => {
  setIsOpen(true);
  const updated = trackMascotOpen();
  setMemory(updated);
}}
```

- [ ] **Step 4: Track questions in handleSend**

In the `handleSend` function, after creating `userMessage`, add:

```typescript
trackQuestion(trimmed);
```

- [ ] **Step 5: Replace the static "iSpy Assistant" title with dynamic title**

Change the `<CardTitle>` in the mascot header from:
```tsx
<CardTitle className="text-sm font-bold">iSpy Assistant</CardTitle>
```
to:
```tsx
<CardTitle className="text-sm font-bold">{memory.nickname}</CardTitle>
```

And change the `<CardDescription>` to show the mascot's level:
```tsx
<CardDescription className="text-xs flex items-center gap-2">
  <Badge variant="secondary" className="text-[10px]">
    Lv.{memory.level} {getMascotTitle(memory.level)}
  </Badge>
  <Badge variant="outline" className="text-[10px]">
    {routeLabels[location.pathname] || "Workspace"}
  </Badge>
</CardDescription>
```

- [ ] **Step 6: Add contextual tip banner above chat messages**

Inside the `<CardContent>`, before the messages container div, add:

```tsx
{activeTip && (
  <motion.div
    initial={{ opacity: 0, height: 0 }}
    animate={{ opacity: 1, height: "auto" }}
    exit={{ opacity: 0, height: 0 }}
    className="flex items-start gap-2 rounded-xl bg-primary/10 border border-primary/20 p-3 text-xs"
  >
    <Sparkles className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
    <span className="flex-1 text-foreground/80">{activeTip.text}</span>
    <button
      onClick={() => {
        dismissTip(activeTip.id);
        setActiveTip(null);
      }}
      className="text-muted-foreground hover:text-foreground shrink-0"
    >
      <X className="w-3 h-3" />
    </button>
  </motion.div>
)}
```

Also add `Sparkles` to the import from lucide-react.

- [ ] **Step 7: Upgrade the floating button with level indicator**

Replace the notification badge (the `<span>` with `BellRing`) on the mascot button with a level indicator:

```tsx
<span className="absolute -top-1 -right-1 flex h-6 w-6">
  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/40 opacity-50" />
  <span className="relative inline-flex rounded-full h-6 w-6 bg-gradient-to-br from-primary to-amber-500 text-[10px] items-center justify-center text-primary-foreground font-bold shadow-lg">
    {memory.level}
  </span>
</span>
```

- [ ] **Step 8: Build and test**

Run: `npm run build`
Run: `npm run dev` — open mascot, verify level shows, navigate pages, verify tips appear

- [ ] **Step 9: Commit**

```bash
git add src/components/FloatingMascot.tsx
git commit -m "feat: upgrade mascot — adaptive personality, contextual tips, level progression, behavior tracking"
```

---

## Phase 3: Engagement & Retention Psychology

### Task 3.1: Add Progress Bar to Dashboard Header — Completion Drive

**Files:**
- Modify: `src/pages/Dashboard.tsx`

- [ ] **Step 1: Add a "Reseller Score" progress section below the header**

After the header `<motion.div>` (around line 426), before the stats grid, insert:

```tsx
{/* Reseller Score — progress bar drives completion psychology */}
<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.1 }}
  className="mb-8"
>
  <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent overflow-hidden">
    <CardContent className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Reseller Score</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {Math.min(100, Math.round(
            (Math.min(totalItems, 20) / 20 * 25) +
            (Math.min(listedItems.length, 10) / 10 * 25) +
            (Math.min(soldItems.length, 5) / 5 * 25) +
            (Math.min(currentStreak, 7) / 7 * 25)
          ))}% complete
        </span>
      </div>
      <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-primary via-amber-500 to-success rounded-full"
          initial={{ width: 0 }}
          animate={{
            width: `${Math.min(100, Math.round(
              (Math.min(totalItems, 20) / 20 * 25) +
              (Math.min(listedItems.length, 10) / 10 * 25) +
              (Math.min(soldItems.length, 5) / 5 * 25) +
              (Math.min(currentStreak, 7) / 7 * 25)
            ))}%`,
          }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
        />
      </div>
      <div className="grid grid-cols-4 gap-2 mt-3 text-[11px] text-muted-foreground">
        <div className={totalItems >= 20 ? "text-success font-medium" : ""}>
          {Math.min(totalItems, 20)}/20 items
        </div>
        <div className={listedItems.length >= 10 ? "text-success font-medium" : ""}>
          {Math.min(listedItems.length, 10)}/10 listed
        </div>
        <div className={soldItems.length >= 5 ? "text-success font-medium" : ""}>
          {Math.min(soldItems.length, 5)}/5 sold
        </div>
        <div className={currentStreak >= 7 ? "text-success font-medium" : ""}>
          {Math.min(currentStreak, 7)}/7 day streak
        </div>
      </div>
    </CardContent>
  </Card>
</motion.div>
```

- [ ] **Step 2: Build and verify**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat: add Reseller Score progress bar — drives completion psychology"
```

---

### Task 3.2: Add "Next Best Action" CTA — Reduce Decision Paralysis

**Files:**
- Modify: `src/pages/Dashboard.tsx`

- [ ] **Step 1: Add a smart next-action card after the ROI card**

After the ROI card `</motion.div>` (around line 486), insert:

```tsx
{/* Next Best Action — reduces decision paralysis */}
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.37 }}
  className="mb-8"
>
  {(() => {
    // Determine the single most valuable next action
    const pendingItems = items.filter(i => !i.status || i.status === "pending");
    let action: { title: string; description: string; path: string; buttonText: string; icon: typeof Plus };

    if (totalItems === 0) {
      action = {
        title: "Scan your first item",
        description: "Snap a photo of anything you want to resell. Our AI handles the rest.",
        path: "/scan",
        buttonText: "Start Scanning",
        icon: Camera,
      };
    } else if (pendingItems.length >= 3) {
      action = {
        title: "List your pending items",
        description: `${pendingItems.length} items are sitting in inventory. Export them to start earning.`,
        path: "/listings",
        buttonText: "Go to Listings",
        icon: Store,
      };
    } else if (currentStreak === 0) {
      action = {
        title: "Start a scan streak",
        description: "Scan something today to start building your daily streak and unlock achievements.",
        path: "/scan",
        buttonText: "Quick Scan",
        icon: Camera,
      };
    } else {
      action = {
        title: "Keep building inventory",
        description: "The more you scan, the better your market intelligence gets. Keep going!",
        path: "/scan",
        buttonText: "Scan More Items",
        icon: Plus,
      };
    }

    return (
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-transparent to-info/5">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-primary/10 shrink-0">
            <action.icon className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{action.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
          </div>
          <Link to={action.path}>
            <Button variant="hero" size="sm">
              {action.buttonText}
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  })()}
</motion.div>
```

Add these missing imports to the top of Dashboard.tsx if not already present: `Camera`, `Store`, `ArrowRight` from lucide-react.

- [ ] **Step 2: Build and verify**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat: add Next Best Action card — reduces decision paralysis, drives engagement"
```

---

### Task 3.3: Upgrade Landing Page — Conversion Optimization

**Files:**
- Modify: `src/pages/Landing.tsx`

- [ ] **Step 1: Add urgency-driven CTA with benefit stacking**

Replace the hero CTA buttons section (around lines 221-234) with:

```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.6 }}
  className="flex flex-col items-center gap-6"
>
  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
    <Button variant="premium" size="xl" className="group shadow-glow-lg min-w-[220px]" asChild>
      <Link to="/signup">
        Start Scanning Free
        <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
      </Link>
    </Button>
    <Button variant="glass" size="xl" asChild>
      <Link to="/signup?plan=pro">
        <Crown className="w-5 h-5 mr-2" />
        Go Pro — A$19/mo
      </Link>
    </Button>
  </div>
  <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
    <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-success" /> Free forever tier</span>
    <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-success" /> No credit card needed</span>
    <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-success" /> 5 free scans/month</span>
    <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-success" /> Works on mobile</span>
  </div>
</motion.div>
```

Key changes:
- Primary CTA now uses `premium` variant (gold gradient)
- Pro CTA shows the price upfront (anchoring effect)
- Added 4th trust badge "Works on mobile"
- Minimum width on primary CTA for visual weight

- [ ] **Step 2: Upgrade the "Trusted by Resellers" section header**

Change:
```tsx
Trusted by <span className="gradient-text">Resellers</span>
```
to:
```tsx
Built for <span className="gradient-text">Australian Resellers</span>
```

This is more specific and builds local trust.

- [ ] **Step 3: Build and verify**

Run: `npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/pages/Landing.tsx
git commit -m "ui: upgrade landing page — gold CTA, price anchoring, local trust, benefit stacking"
```

---

### Task 3.4: Add Scan Page Quick-Start — Reduce Time to Value

**Files:**
- Modify: `src/pages/Scan.tsx`

- [ ] **Step 1: Read the current scan mode selector area**

Read `src/pages/Scan.tsx` fully to understand the scan mode tab/selector implementation and identify where to add a quick-start prompt for new users.

- [ ] **Step 2: Add a "Fastest path" prompt for users with 0 items**

At the top of the scan page content (after the page header), add a conditional banner:

```tsx
{/* Quick-start banner for new users */}
{items.length === 0 && (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    className="mb-6"
  >
    <Card className="border-primary/30 bg-gradient-to-r from-primary/10 to-info/10">
      <CardContent className="p-4 flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/20">
          <Zap className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">First time? Start here</p>
          <p className="text-xs text-muted-foreground">
            Upload a photo of any item → get instant market value → save to inventory.
            It takes about 10 seconds.
          </p>
        </div>
      </CardContent>
    </Card>
  </motion.div>
)}
```

This requires checking what state variable tracks items in Scan.tsx. If there's no `items` state, use the user's subscription info or add a simple check.

- [ ] **Step 3: Build and verify**

Run: `npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/pages/Scan.tsx
git commit -m "ux: add first-time quick-start banner on scan page — reduces time to value"
```

---

## Phase 4: Workflow Seamlessness

### Task 4.1: Add Post-Scan Smart Routing

**Files:**
- Modify: `src/pages/Scan.tsx`

- [ ] **Step 1: Read the full Scan.tsx to find the "save to inventory" success handler**

Read `src/pages/Scan.tsx` from line 80 to end. Find the toast/success handler that fires after saving an item to inventory.

- [ ] **Step 2: Add a smart toast with action button after successful save**

After the item is saved to inventory, replace the plain `toast.success()` call with:

```typescript
toast.success("Item saved to inventory!", {
  action: {
    label: "View in Inventory",
    onClick: () => navigate("/inventory"),
  },
  duration: 5000,
});
```

This gives users a 1-tap path to their inventory after scanning, reducing the navigation friction.

- [ ] **Step 3: Build and verify**

Run: `npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/pages/Scan.tsx
git commit -m "ux: add smart routing toast after scan save — 1-tap to inventory"
```

---

### Task 4.2: Add Inventory → Listings Quick Action

**Files:**
- Modify: `src/pages/Inventory.tsx`

- [ ] **Step 1: Read Inventory.tsx to understand current item actions**

Read `src/pages/Inventory.tsx` fully.

- [ ] **Step 2: Add a floating "List Selected" action bar**

When items with status "pending" exist, show a subtle bottom bar:

After the main content, before the closing `</Layout>`, add:

```tsx
{/* Quick action bar — pending items ready to list */}
{items.filter(i => !i.status || i.status === "pending").length > 0 && (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50"
  >
    <Link to="/listings">
      <Button variant="premium" size="lg" className="shadow-2xl rounded-full px-6">
        <Store className="w-4 h-4 mr-2" />
        List {items.filter(i => !i.status || i.status === "pending").length} items for sale
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </Link>
  </motion.div>
)}
```

Add missing imports: `Store`, `ArrowRight` from lucide-react, `Link` from react-router-dom, `motion` from framer-motion.

- [ ] **Step 3: Build and verify**

Run: `npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/pages/Inventory.tsx
git commit -m "ux: add floating 'List items for sale' CTA on inventory page"
```

---

### Task 4.3: Remove FeedbackWidget Friction

The `FeedbackWidget` auto-prompts after 1.8 seconds on every protected page. This is aggressive for a premium product and creates friction.

**Files:**
- Modify: `src/components/FeedbackWidget.tsx`

- [ ] **Step 1: Read FeedbackWidget.tsx**

Read `src/components/FeedbackWidget.tsx` fully.

- [ ] **Step 2: Change auto-prompt to only show after 5+ page visits**

In the `FeedbackWidget`, modify the auto-show logic to check if user has visited the page at least 5 times (using mascot memory):

```typescript
import { loadMascotMemory } from "@/lib/mascot-memory";

// Inside the component, replace the auto-show timer with:
useEffect(() => {
  const memory = loadMascotMemory();
  const visits = memory.pageVisits[context] || 0;
  // Only auto-prompt feedback after user has engaged with this page 5+ times
  if (visits < 5) return;

  const timer = setTimeout(() => setShowPrompt(true), 8000); // 8s, not 1.8s
  return () => clearTimeout(timer);
}, [context]);
```

This respects user attention and only asks for feedback after they've used the feature enough to have an opinion.

- [ ] **Step 3: Build and verify**

Run: `npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/components/FeedbackWidget.tsx
git commit -m "ux: delay feedback prompt until 5+ page visits — respect user attention"
```

---

## Phase 5: Premium Polish — Final Details

### Task 5.1: Upgrade Empty States with Mascot Personality

**Files:**
- Modify: `src/pages/Dashboard.tsx`
- Modify: `src/pages/Inventory.tsx`

- [ ] **Step 1: Upgrade Dashboard empty state**

Replace the "No items yet" empty state in Dashboard.tsx (around lines 570-583) with:

```tsx
<div className="text-center py-16">
  <div className="relative w-28 h-28 mx-auto mb-6">
    <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse-glow" />
    <img src="/mascot-transparent.png" alt="Ready to start" className="relative w-full h-full object-contain animate-float" onError={(e) => { e.currentTarget.src = "/mascot.png"; e.currentTarget.onerror = null; }} />
  </div>
  <h3 className="text-lg font-bold mb-2">Your resale journey starts here</h3>
  <p className="text-muted-foreground mb-6 max-w-sm mx-auto text-sm">
    Scan any item to see what it's worth. I'll find market prices, suggest platforms, and track your profits.
  </p>
  <Link to="/scan">
    <Button variant="premium" size="lg">
      <Camera className="w-4 h-4 mr-2" />
      Scan Your First Item
    </Button>
  </Link>
</div>
```

Key changes:
- Larger mascot image (w-24 → w-28)
- More compelling copy (benefit-driven, not feature-driven)
- `premium` button variant
- Subtle blur glow behind mascot
- More vertical padding

- [ ] **Step 2: Similarly upgrade Inventory empty state**

Read Inventory.tsx, find the empty state, and apply the same pattern:
- Mascot image with glow
- Benefit-driven copy: "No inventory yet — scan some items and they'll appear here automatically."
- Premium CTA button to `/scan`

- [ ] **Step 3: Build and verify**

Run: `npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/pages/Dashboard.tsx src/pages/Inventory.tsx
git commit -m "ui: upgrade empty states — mascot personality, benefit-driven copy, premium CTAs"
```

---

### Task 5.2: Add Scroll-to-Top on Page Navigation

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add a ScrollToTop component**

In `src/App.tsx`, add before the `AppRoutes` component:

```typescript
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
```

Import `useLocation` and `useEffect` (useEffect is already imported via React).

Then add `<ScrollToTop />` inside the `<AuthProvider>`, before `<AppRoutes />`:

```tsx
<AuthProvider>
  <ScrollToTop />
  <AppRoutes />
</AuthProvider>
```

Import `useLocation` from `react-router-dom` (already imported).

- [ ] **Step 2: Build and verify**

Run: `npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "ux: add scroll-to-top on route changes"
```

---

### Task 5.3: Final Build Verification & Lint

- [ ] **Step 1: Run full build**

Run: `npm run build`
Expected: Zero errors, zero warnings

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Fix any lint errors introduced by the changes.

- [ ] **Step 3: Final commit if any lint fixes**

```bash
git add -A
git commit -m "chore: fix lint issues from premium overhaul"
```

---

## Summary of Changes

### Dead Code Removed (Phase 0)
- 15 unused shadcn/ui components
- 9 dead/legacy component files (LiveScanner, ScanLogModal, NavLink, 4 scanner sub-components, Install page, DebugAuth page)
- 1 dead route (/debug-auth)

### UI Upgrades (Phase 1)
- Button component: premium variant, micro-interactions, animated gradients, rounded-xl base
- Global CSS: new animations (entrance-pop, glow-ring, text-shimmer), premium card hover
- Header nav: animated indicators, bigger touch targets, icon pills, lift hover
- Dashboard cards: gradient overlays, icon pills, larger numbers, animated chevrons
- Membership: urgency cues, social proof, premium gold CTAs, animated border

### Mascot Evolution (Phase 2)
- Behavior tracking system (localStorage-based, no backend needed)
- 5-level progression (Rookie Spotter → Profit Legend)
- Detected workflow patterns (scanner, inventory-manager, flipper, explorer)
- Contextual tips that dismiss permanently
- Level indicator on floating button
- Dynamic mascot title based on usage

### Engagement Psychology (Phase 3)
- Reseller Score progress bar (completion drive)
- Next Best Action card (reduces decision paralysis)
- Landing page gold CTA with price anchoring
- Quick-start banner for new users on scan page

### Workflow Seamlessness (Phase 4)
- Post-scan smart routing toast ("View in Inventory")
- Floating "List items for sale" CTA on inventory
- Feedback widget respects attention (5+ visits, 8s delay)

### Polish (Phase 5)
- Premium empty states with mascot personality
- Scroll-to-top on navigation
- Build verification and lint cleanup
