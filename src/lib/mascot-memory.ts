/**
 * Mascot memory system — tracks user behavior patterns in localStorage
 * so the mascot evolves its personality and suggestions over time.
 */

const STORAGE_KEY = "ispy-mascot-memory";

export interface MascotMemory {
  totalOpens: number;
  pageVisits: Record<string, number>;
  featuresUsed: Record<string, number>;
  recentQuestions: string[];
  detectedWorkflow: "scanner" | "inventory-manager" | "flipper" | "explorer" | null;
  level: number;
  nickname: string;
  firstSeen: string;
  lastSeen: string;
  lifetimeScans: number;
  profitableFinds: number;
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
