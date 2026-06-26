# Claude Code — iSpy Suite Workflow

## Single-PR Rule

This repo is part of a three-repo suite:
- `dropshipit369-blip/ispy-profit-tool` (this repo)
- `dropshipit369-blip/ispy-ai1`
- `dropshipit369-blip/snapit`

**All cross-repo changes in a session must be bundled into ONE PR per repo, opened simultaneously at the end of the session — not incrementally as changes are made.**

### Workflow for every session

1. Use the **same branch name** across all three repos (e.g. `claude/feature-name-XXXXXX`).
2. Commit and push changes to each repo as you go, but **do not open PRs mid-session**.
3. At the very end of the session, open one draft PR per repo in a single batch, linking them together in each PR body with:
   ```
   Part of cross-repo set:
   - ispy-profit-tool #N
   - ispy-ai1 #N
   - snapit #N
   ```
4. Notify the user once with all three PR links together.

### Branch naming
Use `claude/<short-description>-<6-char-id>` consistently across all repos in the same session.

## Edge Functions
Supabase edge functions live in `supabase/functions/`. Deploy with:
```
supabase functions deploy <function-name>
```

## Deployments

### Vercel (frontend)
Vercel auto-deploys from `master`. If the webhook is stale, redeploy from the Vercel dashboard or run:
```
npx vercel deploy --prod
```

### Supabase edge functions
After any change to `supabase/functions/pricing-strategy/`:
```
supabase functions deploy pricing-strategy
```
Both `ispy-profit-tool` and `ispy-ai1` have their own Supabase projects and need independent deploys.

## Secrets required
- `GOOGLE_GEMINI_API_KEY` or `GEMINI_API_KEY` — Gemini API (use key from the "snapit" GCP project to draw from the $20 prepaid credit)
- `OPENROUTER_API_KEY` — zero-cost fallback when all Gemini models are rate-limited
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID`, `STRIPE_UNLIMITED_PRICE_ID`

## AI model tiers (do not regress)
All three Supabase edge functions use a three-tier fallback:
1. `gemini-2.5-flash` (thinkingBudget: 4096 for pricing)
2. `gemini-1.5-flash`
3. OpenRouter free model (last resort)

Do not reintroduce `gemini-3-pro-preview` as primary — it causes 70s+ latency.
