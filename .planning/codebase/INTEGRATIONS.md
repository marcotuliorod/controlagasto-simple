# External Integrations

**Analysis Date:** 2026-09-17

## APIs & External Services

**AI / LLM (provider-agnostic layer):**
- Frontend and edge functions never call an LLM provider directly. Edge functions call the separate `services/ai` Node/Hono service via `supabase/functions/_shared/aiService.ts`, forwarding the end user's JWT.
- `services/ai/src/config.ts` is the single place that selects the concrete provider adapter (env var `AI_PROVIDER`).
- Current adapter: Gemini (`services/ai/src/providers/gemini.ts`), plus `services/ai/src/providers/fake.ts` for tests (domain runs with no network and no key).
- Provider errors are normalized into `AIError`; only `publicMessage` may reach end users (never provider name, quota, or billing details).
- Consumers of the AI service (via edge functions):
  - `chat-assistant` - conversational financial advice, persists to `chat_messages`
  - `generate-insights` - AI-powered spending analysis
  - `process-import-file` - only falls back to AI when the deterministic bank-statement parser (`supabase/functions/_shared/statementParser.ts`) doesn't recognize the layout (PDF path); CSV/OFX is fully deterministic

**Web Push:**
- Standard Web Push protocol via VAPID keys
- `send-push-notification` edge function fetches VAPID keys from the `vapid_keys` table and delivers pushes
- `get-vapid-public-key` edge function exposes the public key to the frontend
- Frontend hook: `usePushNotifications()` manages subscription lifecycle; subscriptions stored in `push_subscriptions` table

## Data Storage

**Database:**
- Supabase-managed Postgres 17 (`supabase/config.toml` pins local dev to major version 17 to match remote)
- Accessed from frontend exclusively through `@supabase/supabase-js` (PostgREST), client configured in `src/integrations/supabase/client.ts`
- Types generated into `src/integrations/supabase/types.ts` via `npx supabase gen types typescript`
- RPC functions used for cross-cutting logic: `get_billing_period()`, `calculate_financial_health_score()`

**File Storage:**
- Supabase Storage, private bucket `receipts` still exists and is still purged by `delete-account`, but nothing writes to it anymore (held over from the removed OCR/receipt-capture flow). `getSignedReceiptUrl()` was removed along with that feature; any new private-file exposure should generate a short-lived signed URL at point of use.

**Caching:**
- None server-side. Client-side: React Query in-memory cache (5min stale time) and the PWA service worker (Workbox, `public/sw.js`, 5MB max cache size) for offline asset/API caching.

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (`@supabase/supabase-js`), auto-refresh tokens enabled, persistent sessions via localStorage
- Row Level Security (RLS) enforced on all tables, policies check `auth.uid() = user_id`

**Edge function auth pattern:**
- User-facing functions validate `Authorization: Bearer <jwt>` and call `supabaseClient.auth.getUser(token)` before any paid/expensive work (notably before AI calls)
- Cron-triggered functions (`notify-goal-threshold`, `process-recurring-expenses`, `process-scheduled-exports`) use a different pattern instead: compare header `X-Cron-Secret` against `Deno.env.get('CRON_SECRET')` — no end user to authenticate
- `services/ai` independently verifies the forwarded Supabase user JWT using `jose`, against `SUPABASE_JWT_SECRET`

**verify_jwt per function** (`supabase/config.toml`): `true` for chat-assistant, check-category-variations, delete-account, export-data, export-pdf, generate-insights, process-import-file; `false` for the three cron-driven functions plus `get-vapid-public-key` and `send-push-notification` (these use the cron-secret or public-key pattern instead of a user JWT).

## Monitoring & Observability

**Error Tracking:**
- None detected (no Sentry/equivalent SDK in `package.json` or `services/ai/package.json`)

**Logs:**
- Structured `console.log`/`console.error` inside edge functions
- Realtime debugging via `[Realtime]`-prefixed logs from `src/lib/realtimeLogger.ts` (or equivalent utility referenced in CLAUDE.md)
- AI service healthcheck endpoint `/health` used by Docker `HEALTHCHECK`

## CI/CD & Deployment

**Hosting:**
- Frontend: Vercel, static SPA (`vercel.json`), SPA fallback rewrite to `/index.html`, `no-cache` header on `/sw.js` to force service-worker updates
- AI service: Vercel, separate project, container-based runtime (`services/ai/vercel.json`, `"runtime": "container"`), built from `services/ai/Dockerfile` (Node 24 Alpine)
- Backend: Supabase project (Postgres, Auth, Storage, Realtime, Edge Functions) — deployable self-hosted or managed; nothing in the codebase hardcodes a project ref

**CI Pipeline:**
- GitHub Actions present (recent commit history references a "Deno job" running with `--allow-read` against fixture files) — exact workflow files not enumerated in this pass; check `.github/workflows/` directly for current jobs

**Edge Function Deployment:**
- `npx supabase functions deploy <name>` per function; `verify_jwt` declared in `supabase/config.toml`

## Environment Configuration

**Frontend required env vars (`.env`, `VITE_` prefix):**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

**AI service required env vars (boot-time checked, fails fast if missing):**
- `SUPABASE_JWT_SECRET`
- `GEMINI_API_KEY`
- `AI_PROVIDER` (selects adapter in `config.ts`)

**Edge function secrets (`supabase secrets set`, not the frontend `.env`):**
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`
- `AI_SERVICE_URL` (points at the deployed `services/ai` instance)

**Secrets location:**
- Frontend: `.env` (gitignored, values not read outside `import.meta.env` in `src/`)
- Edge functions: Supabase project secrets (`supabase secrets set`)
- AI service container: environment variables injected by the Vercel container runtime / Docker host

## Webhooks & Callbacks

**Incoming:**
- None detected (no inbound webhook endpoints in `supabase/functions/`)

**Outgoing:**
- Web Push delivery (`send-push-notification`) to browser push services (per-subscription endpoint, not a fixed webhook)

## Current Edge Functions (`supabase/functions/*/index.ts`)

- `chat-assistant` - AI financial advice chat, persists to `chat_messages`
- `check-category-variations` - smart categorization suggestions
- `delete-account` - full user data purge (including the `receipts` storage bucket)
- `export-data` - Excel export generation
- `export-pdf` - PDF report generation
- `generate-insights` - AI-powered spending analysis
- `get-vapid-public-key` - exposes VAPID public key for push subscriptions
- `notify-goal-threshold` - budget alerts when spending exceeds category goals (cron)
- `process-import-file` - bank statement import (CSV/OFX deterministic; PDF falls back to AI via `services/ai`)
- `process-recurring-expenses` - auto-generates recurring transactions (cron)
- `process-scheduled-exports` - executes scheduled data exports (cron)
- `send-push-notification` - web push delivery
- `_shared` - shared helpers, not a deployable function (`aiService.ts`, `statementParser.ts`, `statementLayouts.ts`, `csvMapping.ts`, `pdfText.ts`, plus test fixtures)

Note: `process-receipt` no longer exists in this repo (deleted 2026-08-21, commit history: "chore: apaga process-receipt, que continuava no ar sem código no repo"). Do not reference it as an active function.

---

*Integration audit: 2026-09-17*
