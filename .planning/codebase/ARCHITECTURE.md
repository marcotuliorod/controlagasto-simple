<!-- refreshed: 2026-09-17 -->
# Architecture

**Analysis Date:** 2026-09-17

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                      React SPA (PWA)                          │
├──────────────────┬──────────────────┬───────────────────────┤
│   Pages/Routes    │   Components     │   Hooks (React Query) │
│  `src/pages/*`    │  `src/components`│  `src/hooks/*`        │
└────────┬─────────┴────────┬─────────┴──────────┬────────────┘
         │                  │                     │
         ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│               Supabase JS Client (browser)                   │
│         `src/integrations/supabase/client.ts`                 │
└────────┬───────────────────────────────────────┬─────────────┘
         │ REST/RPC/Realtime                      │ functions.invoke()
         ▼                                         ▼
┌────────────────────────────┐        ┌───────────────────────────┐
│  Supabase Postgres + RLS    │        │  Supabase Edge Functions   │
│  `supabase/migrations/*`    │        │  `supabase/functions/*`    │
│  RPCs (get_billing_period,  │        │  Deno runtime, per-function│
│  calculate_financial_health)│        │  auth check + CORS         │
└────────────────────────────┘        └──────────────┬─────────────┘
                                                       │ HTTP (JWT forwarded)
                                                       ▼
                                       ┌───────────────────────────┐
                                       │  services/ai (Node/TS)     │
                                       │  Provider-agnostic AI      │
                                       │  domain/providers/prompts  │
                                       └──────────────┬─────────────┘
                                                       ▼
                                       ┌───────────────────────────┐
                                       │  External LLM provider     │
                                       │  (Gemini today; adapter-   │
                                       │  swappable via config.ts)  │
                                       └───────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Router/Layout | Route guards (public/onboarding/authenticated), shell composition | `src/App.tsx` |
| AppLayout | Sidebar + bottom nav + global search wrapper for authenticated pages | `src/components/AppLayout.tsx` |
| Pages | Screen-level composition, data fetching orchestration | `src/pages/*.tsx` |
| Hooks | React Query data access, business rules (billing cycle, goals, recurring) | `src/hooks/*.ts` |
| Supabase client | Configured browser client, session persistence | `src/integrations/supabase/client.ts` |
| Import pipeline UI | Statement/invoice upload, preview, confirm | `src/components/import/*`, `src/pages/ImportTransactions.tsx` |
| Edge Functions | Server-side logic requiring service-role access or secrets | `supabase/functions/*/index.ts` |
| AI Service | Provider-agnostic LLM orchestration used by edge functions | `services/ai/src/*` |
| Migrations | Schema, RLS policies, RPC functions | `supabase/migrations/*.sql` |

## Pattern Overview

**Overall:** Client-heavy SPA (Vite + React) backed by Supabase (Postgres + Auth + Realtime + Storage) for data, with a separate Node AI microservice fronted by edge functions for anything requiring an LLM call.

**Key Characteristics:**
- No custom backend server for CRUD — Supabase Postgres + RLS is the API layer; the browser talks to it directly via the JS client.
- Edge functions are thin, task-specific Deno handlers (import processing, exports, notifications, AI features), not a general API gateway.
- AI is fully decoupled behind `services/ai`; no app code or edge function talks to an LLM SDK directly.
- Billing-cycle (not calendar-month) periods are a first-class domain concept threaded through hooks and a Postgres RPC.
- Expense entry has a single path: import of bank statements/invoices. There is no manual expense-creation UI; `/add-expense` is a redirect-only route.

## Layers

**Presentation (Pages/Components):**
- Purpose: Render UI, collect input, trigger mutations/queries
- Location: `src/pages/`, `src/components/`
- Contains: Route-level pages, layout shell (`AppLayout.tsx`, `AppSidebar.tsx`, `BottomNav.tsx`), feature components (`components/import/*`, `components/chat/*`, `components/gamification/*`, `components/simulators/*`), shared UI primitives (`components/ui/*`, shadcn-based)
- Depends on: Hooks layer for data, `src/lib/*` for formatting utilities
- Used by: Router (`src/App.tsx`)

**Data Access (Hooks):**
- Purpose: Encapsulate Supabase queries/mutations via React Query, expose domain-shaped data to components
- Location: `src/hooks/*.ts`
- Contains: `useBillingCycle`, `useAccounts`, `useGoals`, `useCategoryGoals`, `useImportTransactions`, `useRecurringExpenses`, `useExpensesRealtime`, `useFinancialHealthScore`, `useChatAssistant`, `useInsights`, `usePushNotifications`, `useScheduledExports`, `useProfile`, etc.
- Depends on: `src/integrations/supabase/client.ts`, `@tanstack/react-query`
- Used by: Pages and feature components

**Integration (Supabase client):**
- Purpose: Single configured entry point to Postgres/Auth/Realtime/Storage/Functions
- Location: `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts` (generated)
- Depends on: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
- Used by: All hooks

**Server Logic (Edge Functions):**
- Purpose: Operations needing service-role privileges, secrets, cron triggers, or AI orchestration
- Location: `supabase/functions/*/index.ts`, shared helpers in `supabase/functions/_shared/`
- Depends on: `supabase/functions/_shared/aiService.ts` (for AI-backed functions), Supabase service-role client, `CRON_SECRET` (for cron-triggered ones)
- Used by: Frontend via `supabase.functions.invoke(...)`, or Supabase cron schedules

**AI Service (`services/ai`):**
- Purpose: Provider-agnostic LLM capability layer, isolated from transport and app concerns
- Location: `services/ai/src/`
- Depends on: `services/ai/src/providers/types.ts` (interface only) from domain code; concrete providers implement it
- Used by: Edge functions (`chat-assistant`, `generate-insights`, `process-import-file` for PDF fallback) via HTTP, through `_shared/aiService.ts`

**Database (Postgres/RLS):**
- Purpose: Source of truth, authorization boundary, cross-cutting business rules as RPCs/triggers
- Location: `supabase/migrations/*.sql`
- Contains: Tables (`expenses`, `accounts`, `recurring_expenses`, `category_goals`, `financial_health_scores`, `audit_logs`, `push_subscriptions`, `vapid_keys`, `chat_messages`, etc.), RLS policies, RPCs (`get_billing_period`, `calculate_financial_health_score`), audit triggers

## Data Flow

### Primary Request Path (expense import)

1. User uploads a bank statement/invoice on `/import-transactions` (`src/pages/ImportTransactions.tsx`, `src/components/import/*`)
2. Frontend calls `supabase.functions.invoke("process-import-file", ...)` (`src/hooks/useImportTransactions.ts`)
3. Edge function validates the Bearer JWT, then parses deterministically via `supabase/functions/_shared/statementParser.ts` (CSV/OFX rule-based; PDF layered, falling back to AI only when the layout is unrecognized)
4. Unrecognized PDF layout triggers `_shared/aiService.ts` → `services/ai` HTTP layer → provider adapter (Gemini) for extraction
5. Parsed transactions are returned as a preview; user confirms; rows are inserted into `expenses` via the client or a follow-up function call
6. React Query invalidates `expenses` queries; `/expenses` (`ExpensesVirtualized.tsx`) reflects the new rows

### Billing-Cycle Read Path

1. `useBillingCycle()` (`src/hooks/useBillingCycle.ts`) computes/resolves the user's `billing_cycle_day` and exposes `getCurrentCycle()`, `getDateCycle(date)`, `getCycleRange(months)`
2. Reports/Dashboard/Goals pages call these instead of calendar-month boundaries
3. Server-side aggregations (RPCs, edge functions needing period boundaries) call the Postgres function `get_billing_period(user_id, reference_date)` (`supabase/migrations/20251023213047_*.sql`) to stay consistent with the client

**State Management:**
- Server state lives in React Query (`QueryClientProvider` in `src/App.tsx`, 5-minute stale time, no refetch-on-focus)
- Local/UI state uses component-level `useState`/`useReducer`; no global client state store (no Redux/Zustand)
- Auth/session state comes from the Supabase client's persisted session (localStorage)

## Key Abstractions

**Billing Cycle:**
- Purpose: Represents a user-configurable 1–28 day financial period instead of a calendar month
- Examples: `src/hooks/useBillingCycle.ts`, `src/hooks/useBillingCycle.test.ts`, RPC `get_billing_period` in migrations
- Pattern: Hook computes cycle boundaries client-side for UI; RPC recomputes identically server-side for aggregation/report queries — both must be used instead of calendar-month math

**AI Capability (domain/provider split):**
- Purpose: Decouple "what the AI does" (assistant chat, insights, transaction classification) from "which vendor answers it"
- Examples: `services/ai/src/domain/FinancialAssistant.ts`, `FinancialInsights.ts`, `TransactionClassification.ts`; `services/ai/src/providers/gemini.ts`, `providers/fake.ts`
- Pattern: Domain modules depend only on `providers/types.ts` (the `LLMProvider` interface); `services/ai/src/config.ts` is the single place selecting the concrete adapter via `AI_PROVIDER`

**Import/Parse Pipeline:**
- Purpose: Deterministic-first extraction of transactions from bank files, AI only as fallback
- Examples: `supabase/functions/_shared/statementParser.ts`, `supabase/functions/process-import-file/index.ts`
- Pattern: Rule-based parsers per known layout; unknown layout escalates to `services/ai` via `_shared/aiService.ts`

## Entry Points

**Frontend bootstrap:**
- Location: `src/main.tsx`
- Triggers: App load; registers PWA service worker
- Responsibilities: Mounts `<App />`, wires update prompts

**App shell/router:**
- Location: `src/App.tsx`
- Triggers: Navigation
- Responsibilities: Provider hierarchy (QueryClient → Theme → Tooltip → PWAInstall → BrowserRouter), route guards, lazy-loaded page routes

**Edge Functions (current set — 13 directories under `supabase/functions/`, plus `_shared`):**
- `chat-assistant` — AI financial-advice conversation, persists to `chat_messages`
- `check-category-variations` — smart categorization suggestions
- `delete-account` — full user-data purge
- `export-data` — Excel export generation
- `export-pdf` — PDF report generation
- `generate-insights` — AI-powered spending analysis
- `get-vapid-public-key` — VAPID key for push subscriptions
- `notify-goal-threshold` — cron-triggered budget alerts (uses `X-Cron-Secret`, not user JWT)
- `process-import-file` — bank statement/invoice import (CSV/OFX deterministic; PDF layered with AI fallback) — the sole expense-entry path
- `process-recurring-expenses` — cron-triggered auto-generation of recurring transactions
- `process-scheduled-exports` — cron-triggered execution of scheduled exports
- `send-push-notification` — web push delivery

Note: `process-receipt` (OCR-based manual receipt entry) was deleted from the repository; it no longer exists as a function or route. Do not reintroduce references to it.

**services/ai HTTP entry:**
- Location: `services/ai/src/http/server.ts`, `services/ai/src/http/app.ts`
- Triggers: HTTP calls from edge functions via `_shared/aiService.ts`
- Responsibilities: Route requests to domain capabilities, enforce auth (`http/auth.ts`), return typed responses/errors

## Architectural Constraints

- **Threading:** Single-threaded per request; edge functions run on Deno's isolate model (no shared in-process state across invocations); `services/ai` is a standard Node HTTP server (no worker threads observed)
- **Global state:** None significant in the frontend beyond the React Query client instance and the Supabase client singleton (`src/integrations/supabase/client.ts`); avoid introducing module-level mutable state outside these
- **Circular imports:** None identified; `services/ai` enforces a one-way dependency (`domain/` → `providers/types.ts` only) by convention, not by tooling — respect it manually when adding code
- **No manual expense entry:** There is no form, FAB, quick-add drawer, or OCR path for creating expenses directly; all new expense-creation UI work should route to `/import-transactions`, not add a parallel entry point

## Anti-Patterns

### Skipping billing-cycle-aware queries

**What happens:** New reporting/query code uses `startOfMonth`/`endOfMonth` (calendar month) to filter `expenses.date`
**Why it's wrong:** Users configure a custom `billing_cycle_day` (1–28); calendar-month filtering silently shows wrong data for any user who isn't on a day-1 cycle
**Do this instead:** Use `useBillingCycle().getCurrentCycle()` / `getDateCycle()` client-side, or the `get_billing_period()` RPC server-side

### Direct LLM SDK calls from app or edge function code

**What happens:** An edge function or frontend module imports a vendor SDK (e.g., a Gemini/OpenAI client) directly and calls it inline
**Why it's wrong:** Breaks the provider-agnostic boundary, duplicates auth/redaction/retry logic, and risks leaking vendor-specific error text (billing, quota) to end users
**Do this instead:** Call `supabase/functions/_shared/aiService.ts`, which forwards to `services/ai`; add new providers only inside `services/ai/src/providers/` plus a `config.ts` case

## Error Handling

**Strategy:** Fail fast with typed/structured errors; surface user-safe messages only.

**Patterns:**
- Edge functions: explicit auth check before expensive work (`authHeader` presence + `supabaseClient.auth.getUser(token)` validity) returning 401 JSON on failure
- `services/ai`: vendor/provider errors are normalized into `AIError` (`services/ai/src/shared/errors.ts`); only `publicMessage` is safe to show a user — never provider name, quota, or billing details
- Frontend: React Query mutation `onError`/`onSuccess` pairs with toast notifications (`use-toast.ts`)

## Cross-Cutting Concerns

**Logging:** Ad hoc `console.*` in frontend, with a dedicated `[Realtime]` prefix convention from `realtimeLogger.ts` for subscription lifecycle debugging; edge functions log to Supabase function logs
**Validation:** Zod schemas (`src/schemas/*.ts`) where present (notably `AccountProfile.tsx`); several forms (`RecurringExpenses.tsx`, `EditExpense.tsx`) instead use `useState` + native HTML `required` — check the specific file before assuming Zod is used; server-side Postgres constraints/triggers as a second layer
**Authentication:** Supabase Auth (JWT) for user-facing edge functions; `X-Cron-Secret` header compared to `CRON_SECRET` for cron-triggered functions (`notify-goal-threshold`, `process-recurring-expenses`, `process-scheduled-exports`)

---

*Architecture analysis: 2026-09-17*
