# iSpy AI Master

Unified master app consolidating all iSpy profit-tool branches into one production codebase.

**Live:** [ispy-profit-tool-master.vercel.app](https://ispy-profit-tool-master.vercel.app) (existing Vercel project — redeploy from this repo)

## Consolidated From

| Source | Contribution |
|--------|--------------|
| `ispy-profit-tool-master` | Base architecture, eBay pipeline, mission profiles, OpenRouter fallback |
| `ispy-ai1-main` | Evidence Rail, Session Value Ticker, Price Coach, verification gate |
| `ispy---profit-tool-master` | LotBuilder modal, scanner depth UI, debug/install routes |
| `ispy-pricing-engine-refactor` | Pricing engine pattern (Phase 3 integration) |
| `snapit-main` | Listing AI concepts (server-side only) |

## Branding

- **Default theme:** Dark tactical (gold + deep indigo)
- **Membership tiers:** OPERATOR_CLASS I / II / III
- **Mascot:** Floating field advisor with contextual tips (not a chatbox)

## Core Features

- Live Scan + Vision+ with evidence-based pricing
- Single item, lot, and barcode scanning
- Profit strategy assistant with refine chat
- eBay listing drafts, smart copy, batch CSV export
- Inventory, dashboard intelligence, Stripe subscriptions
- PWA + Capacitor Android shell

## Local Setup

```bash
npm install
cp .env.example .env
npm run dev
```

See `.env.example` for Supabase, Stripe, Gemini, OpenRouter, and ScrapingBee keys.

## Deploy

- **Frontend:** Vercel (`vercel.json` SPA rewrites)
- **Backend:** Supabase edge functions (`supabase functions deploy`)