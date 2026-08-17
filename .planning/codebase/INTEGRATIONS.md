# External Integrations

**Analysis Date:** 2026-08-15

## APIs & External Services

**AI & Language Models:**
- Camada própria provider-agnostic (`services/ai`), sem fornecedor no domínio
  - Edge functions chamam via `supabase/functions/_shared/aiService.ts`
  - Auth: JWT do usuário repassado adiante; endereço no secret `AI_SERVICE_URL`
  - Adapter concreto escolhido em `services/ai/src/config.ts` (`AI_PROVIDER`)
  - Used in edge functions:
    - `process-receipt` (`/supabase/functions/process-receipt/index.ts:34`) - OCR & receipt extraction
    - `chat-assistant` (`/supabase/functions/chat-assistant/index.ts:165`) - AI financial advisor
    - `process-import-file` (`/supabase/functions/process-import-file/index.ts`) - File import with AI parsing
    - `generate-insights` (`/supabase/functions/generate-insights/index.ts`) - AI spending insights

**Web Push Notifications:**
- Standard Web Push API (via Supabase)
  - Infrastructure: Push subscription endpoints stored in database
  - Function: `send-push-notification` (`/supabase/functions/send-push-notification/index.ts`)
  - VAPID Keys: Stored in Supabase `vapid_keys` table
  - Public Key Retrieval: `get-vapid-public-key` edge function (no JWT required)

## Data Storage

**Databases:**
- PostgreSQL (via Supabase)
  - Connection env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
  - Client library: `@supabase/supabase-js` v2.76.1 (`/package.json:49`)
  - Location: `/src/integrations/supabase/client.ts`
  - Features: Auth, real-time subscriptions, edge functions
  - Project ID: configurável por ambiente (`VITE_SUPABASE_URL`); não fixado no código
  - Tables: expenses, categories, accounts, profiles, chat_messages, chat_conversations, push_subscriptions, vapid_keys, audit_logs, recurring_expenses, financial_health_scores, monthly_goals, category_goals, saved_filters, educational_content, quizzes, scheduled_exports

**File Storage:**
- Supabase Storage (private bucket: `receipts`)
  - Used for: Receipt images from OCR processing
  - Access: Private/authenticated only
  - Signed URLs: 60-second expiration
  - Upload in: `process-receipt` edge function (`/supabase/functions/process-receipt/index.ts:148`)

**Caching:**
- React Query (@tanstack/react-query v5.83.0)
  - Default stale time: 5 minutes
  - Config: `/src/App.tsx:45-52`
  - No window focus refetch
- Browser Cache API
  - Via Workbox 7.3.0 (PWA offline support)
  - Strategies: Cache-first for assets, network-first for data

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (built-in)
  - Implementation: JWT-based authentication
  - Session storage: localStorage via `@supabase/supabase-js`
  - Config: `/src/integrations/supabase/client.ts:12-16`
  - Features: Auto-refresh tokens, persistent sessions
  - Signup/Login: `/src/pages/Auth.tsx`
  - User context: Provided via Supabase auth helper

**Security:**
- JWT verification on edge functions (most have `verify_jwt = true` in `/supabase/config.toml`)
- Row Level Security (RLS) on all database tables
- Authorization header validation in edge functions

## Monitoring & Observability

**Error Tracking:**
- None detected (no Sentry, Rollbar, etc.)

**Logs:**
- Console logging in edge functions (Deno runtime)
  - `console.log()` and `console.error()` in `/supabase/functions/*/index.ts`
- Supabase Edge Function logs accessible via Supabase dashboard

**Performance Monitoring:**
- Lighthouse CI integration (`.github/workflows/ci.yml:124-129`)
  - Automated performance checks on each build
- Bundle size analysis: `ANALYZE=true npm run build` generates `/dist/stats.html`

## CI/CD & Deployment

**Hosting:**
- Inference from tech stack: Likely Vercel or Supabase hosting
- Build output: `/dist/` directory
- Service Worker: `/dist/sw.js` (generated from `/public/sw.js`)

**CI Pipeline (GitHub Actions):**
- Workflow file: `/.github/workflows/ci.yml`
- Triggers: Push to main/develop, pull requests
- Jobs:
  1. Lint & Type Check (ESLint + TypeScript)
  2. Unit Tests (Vitest with coverage)
  3. E2E Tests (Playwright, multi-browser)
  4. Lighthouse CI (performance budgets)
  5. Build verification (production build test)
- Environment secrets configured:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
  - `LHCI_GITHUB_APP_TOKEN`
- Node.js version: 20 LTS
- Artifact retention: 30 days for reports, 7 days for screenshots

## Environment Configuration

**Required env vars (from CI and code):**
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anonymous key
- `AI_SERVICE_URL` - endereço do serviço de IA em `services/ai` (edge functions only)
- `CRON_SECRET` - autentica as functions disparadas por cron
- `SUPABASE_URL` - Used in edge functions (service role context)
- `SUPABASE_SERVICE_ROLE_KEY` - Edge function service role key
- `VITE_SUPABASE_PROJECT_ID` - Referenced in CLAUDE.md (optional)

**Secrets location:**
- `.env` file (present at repo root, not version controlled)
- GitHub Actions secrets for CI/CD pipeline
- Edge function environment variables managed via Supabase console

## Webhooks & Callbacks

**Incoming Webhooks:**
- None detected

**Outgoing Webhooks/Callbacks:**
- Web Push notification endpoints (browser push service endpoints)
  - Handled in: `send-push-notification` (`/supabase/functions/send-push-notification/index.ts`)
  - Target: Browser push service endpoints (e.g., Google Cloud Messaging, APNS, etc.)

**Edge Function Triggers:**
- Scheduled via: Supabase database cron jobs (inferred)
- Functions with cron execution:
  - `process-recurring-expenses` - Auto-generate recurring transactions
  - `process-scheduled-exports` - Execute data exports on schedule
  - `notify-goal-threshold` - Budget alert notifications

## Real-time Features

**Real-time Subscriptions:**
- Supabase Realtime (via `@supabase/supabase-js`)
- Used in: `useExpensesRealtime()` hook and other components
- Channels: Multi-channel real-time updates for expenses, categories, etc.
- Cleanup: 100ms delay to prevent WebSocket errors on unmount

## Rate Limiting & Quotas

**Edge Function Limits:**
- Chat Assistant: 10 messages per minute per user
  - Rate check: `/supabase/functions/chat-assistant/index.ts:54-66`
- Lovable AI: Credit-based usage (returns 402 when credits exhausted)

## Data Export & Import

**Export Formats:**
- CSV: Via `export-data` edge function (`/supabase/functions/export-data/index.ts`)
- PDF: Via `export-pdf` edge function (`/supabase/functions/export-pdf/index.ts`)
- Excel: Via `xlsx` library (v0.18.5, `/package.json:88`)

**Import Formats:**
- Excel/CSV: Via `process-import-file` edge function
- Receipt images: Via `process-receipt` edge function (JPG/PNG)

---

*Integration audit: 2026-08-15*
