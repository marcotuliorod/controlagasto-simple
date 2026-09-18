# Codebase Structure

**Analysis Date:** 2026-09-17

## Directory Layout

```
controlagasto-simple/
├── src/                      # React/Vite frontend (PWA)
│   ├── pages/                # Route-level screens
│   ├── components/           # Reusable UI + feature components
│   │   ├── ui/                # shadcn-based primitives
│   │   ├── import/             # Statement/invoice import flow UI
│   │   ├── chat/                # AI chat assistant UI
│   │   ├── gamification/         # Streaks/badges UI
│   │   ├── simulators/           # What-if financial simulators
│   │   └── skeletons/            # Loading skeletons
│   ├── hooks/                # React Query hooks / domain logic
│   ├── lib/                  # Pure utility functions
│   ├── schemas/              # Zod validation schemas
│   ├── integrations/supabase/  # Supabase client + generated types
│   ├── providers/            # React context providers (PWA install)
│   ├── routes/               # Route guard components
│   ├── test/                 # Vitest global setup
│   ├── App.tsx                # Provider hierarchy + route table
│   └── main.tsx                # Entry point, service worker registration
├── supabase/
│   ├── functions/            # Edge functions (Deno), one dir per function
│   │   └── _shared/            # Shared helpers (aiService.ts, statementParser.ts, CORS)
│   ├── migrations/           # SQL migrations (schema, RLS, RPCs, triggers)
│   └── config.toml           # Function config (verify_jwt, etc.)
├── services/ai/              # Separate provider-agnostic AI microservice (Node/TS)
│   └── src/
│       ├── domain/            # AI capabilities (assistant, insights, classification, normalize)
│       ├── providers/         # Vendor adapters (gemini.ts, fake.ts) + shared types.ts
│       ├── prompts/           # Versioned prompt templates
│       ├── shared/            # Errors, redaction, resilience/retry
│       ├── http/              # HTTP transport layer (app, server, auth)
│       └── config.ts           # Chooses active provider adapter (AI_PROVIDER)
├── e2e/                      # Playwright E2E specs + fixtures
│   └── fixtures/
├── docs/                     # Project documentation (architecture, testing, workflow, etc.)
├── public/                   # Static assets, service worker (sw.js)
└── .planning/                # GSD planning artifacts (this doc lives here)
```

## Directory Purposes

**`src/pages/`:**
- Purpose: One file per route; composes hooks + components into a screen
- Contains: `Dashboard.tsx`, `ImportTransactions.tsx`, `Reports.tsx`, `ExpensesVirtualized.tsx`, `EditExpense.tsx`, `RecurringExpenses.tsx`, `Accounts.tsx`, `AccountDashboard.tsx`, `AccountProfile.tsx`, `Settings.tsx`, `ScheduledExports.tsx`, `NotificationSettings.tsx`, `ChatAssistant.tsx`, `FinancialHealth.tsx`, `Simulator.tsx`, `AuditLogs.tsx`, `DeleteAccount.tsx`, `Onboarding.tsx`, `Auth.tsx`, `Index.tsx`, `NotFound.tsx`, `Privacy.tsx`, `Terms.tsx`, `Education.tsx`, `Quiz.tsx`
- Key files: There is no `AddExpense.tsx` — that route (`/add-expense`) is a `<Navigate>` redirect defined inline in `src/App.tsx`, not a page component

**`src/components/`:**
- Purpose: Shared and feature-specific UI building blocks
- Contains: Layout shell (`AppLayout.tsx`, `AppSidebar.tsx`, `BottomNav.tsx`, `AppFooter.tsx`), cross-cutting widgets (`GlobalSearch.tsx`, `InstallPWA.tsx`, `ErrorRecovery.tsx`, `EmptyState.tsx`), feature subdirectories (`import/`, `chat/`, `gamification/`, `simulators/`, `skeletons/`), and `ui/` (shadcn primitives)
- Key files: `AppLayout.tsx` wraps every authenticated route

**`src/hooks/`:**
- Purpose: All Supabase data access and domain business logic, wrapped in React Query
- Contains: `useBillingCycle.ts` (billing-cycle period math), `useImportTransactions.ts`, `useAccounts.ts`, `useGoals.ts`, `useCategoryGoals.ts`, `useRecurringExpenses.ts`, `useExpensesRealtime.ts`, `useFinancialHealthScore.ts`, `useChatAssistant.ts`, `useInsights.ts`, `usePushNotifications.ts`, `useScheduledExports.ts`, `useProfile.ts`, `useAuditLogs.ts`, `useGamification.ts`, `useContextualInsight.ts`, `useEducationalContent.ts`, `useQuiz.ts`, `useSavedFilters.ts`, `useUndoableAction.ts`, `useAutoTheme.ts`, `useReducedMotion.ts`, `use-mobile.tsx`, `use-toast.ts`
- Key files: `.test.ts` files are co-located next to their hook (e.g. `useBillingCycle.test.ts`)

**`src/lib/`:**
- Purpose: Pure, framework-agnostic utility functions
- Contains: `currencyUtils.ts` (BRL parse/format), `amountUtils.ts`, `bankPatterns.ts` (statement layout detection), `dateRange.ts`, `exportUtils.ts`, `financialCalculations.ts`, `errorUtils.ts`, `logger.ts`, `realtimeLogger.ts`, `pushUtils.ts`, `pwaUtils.ts`, `greeting.ts`, `microcopy.ts`, `animations.ts`, `utils.ts`
- Key files: Most have a co-located `.test.ts`

**`src/schemas/`:**
- Purpose: Zod validation schemas
- Contains: `profileSchema.ts` (currently the only schema; used by `AccountProfile.tsx`)
- Note: Not every form uses Zod — `RecurringExpenses.tsx` and `EditExpense.tsx` use `useState` + native `required` instead; check the file before assuming a schema exists

**`src/integrations/supabase/`:**
- Purpose: Supabase client configuration and generated DB types
- Contains: `client.ts` (auto-refresh, persisted session), `types.ts` (generated via `supabase gen types`)

**`src/providers/` and `src/routes/`:**
- Purpose: Cross-cutting React context and route guards
- Contains: `PWAInstallProvider.tsx` (install-prompt state); `RequireOnboarding.tsx` (gates `/onboarding`-dependent routes)

**`supabase/functions/`:**
- Purpose: Deno edge functions, one directory per function, each with its own `index.ts`
- Contains: 12 function directories (`chat-assistant`, `check-category-variations`, `delete-account`, `export-data`, `export-pdf`, `generate-insights`, `get-vapid-public-key`, `notify-goal-threshold`, `process-import-file`, `process-recurring-expenses`, `process-scheduled-exports`, `send-push-notification`) plus `_shared/` for cross-function helpers (`aiService.ts`, `statementParser.ts`, CORS headers)
- Note: `process-receipt` does not exist in this directory — it was deleted from the repo; do not add references to it

**`supabase/migrations/`:**
- Purpose: Timestamped SQL migrations — schema, RLS policies, RPCs, triggers
- Contains: One file per migration, named `YYYYMMDDHHMMSS_description.sql`; includes `get_billing_period()` and `calculate_financial_health_score()` RPC definitions

**`services/ai/src/`:**
- Purpose: Standalone provider-agnostic AI microservice, isolated from the main app
- Contains:
  - `domain/` — capability logic (`FinancialAssistant.ts`, `FinancialInsights.ts`, `TransactionClassification.ts`, `normalize.ts`); each has a co-located `.test.ts`
  - `providers/` — vendor adapters (`gemini.ts`), a network-free `fake.ts` for tests, and `types.ts` defining the `LLMProvider` interface domain code depends on
  - `prompts/` — versioned prompt text (`assistant.ts`, `insights.ts`, `statement.ts`)
  - `shared/` — `errors.ts` (AIError/publicMessage), `redaction.ts` (PII scrubbing), `resilience.ts` (timeout/retry)
  - `http/` — `app.ts`, `server.ts`, `auth.ts` (transport layer that edge functions call into)
  - `config.ts` — sole place selecting the active provider via `AI_PROVIDER`

**`e2e/`:**
- Purpose: Playwright end-to-end specs
- Contains: `auth.setup.ts` (not a suite — the `setup` project that creates the account and writes `storageState` every other spec depends on), `auth.spec.ts`, `expense-crud.spec.ts` (list/edit only, no creation), `reports-cycle.spec.ts`, `export-pdf.spec.ts`, `insights.spec.ts`, `scheduled-exports.spec.ts`, `recurring-expenses.spec.ts`, `import-transactions.spec.ts` (the only expense-entry-covering spec; covers CSV path only, PDF/AI fallback has no E2E coverage), `fixtures/test-data.ts`

**`docs/`:**
- Purpose: Narrative documentation referenced from `CLAUDE.md`
- Contains: `billing-cycle.md`, `testing.md`, `pwa-setup.md`, `push-notifications.md`, `architecture.md`, `sprint-7-features.md`, `WORKFLOW.md`, `STATE.md`, `CONTEXT.md`, `LGPD-IA.md`

## Key File Locations

**Entry Points:**
- `src/main.tsx`: Mounts React app, registers service worker
- `src/App.tsx`: Route table and provider hierarchy
- `services/ai/src/http/server.ts`: AI service HTTP entry point

**Configuration:**
- `vite.config.ts`, `tsconfig.json`: Build/type config, `@/` path alias
- `supabase/config.toml`: Edge function `verify_jwt` declarations
- `.env` (not committed): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`

**Core Logic:**
- `src/hooks/useBillingCycle.ts`: Billing-cycle period computation (client side)
- `supabase/migrations/20251023213047_*.sql`: `get_billing_period()` RPC (server side)
- `supabase/functions/_shared/statementParser.ts`: Deterministic bank-statement parsing
- `supabase/functions/_shared/aiService.ts`: Bridge from edge functions to `services/ai`
- `services/ai/src/config.ts`: AI provider selection

**Testing:**
- `src/**/*.test.ts(x)`: Co-located Vitest unit tests
- `src/test/setup.ts`: Vitest global setup
- `e2e/*.spec.ts`: Playwright E2E specs
- `services/ai/src/**/*.test.ts`: AI service unit tests (run against `providers/fake.ts`, no network)

## Naming Conventions

**Files:**
- React components: PascalCase (`AppLayout.tsx`, `ImportTransactions.tsx`)
- Hooks: camelCase prefixed with `use` (`useBillingCycle.ts`)
- Utilities: camelCase (`currencyUtils.ts`, `dateRange.ts`)
- Tests: co-located, same base name + `.test.ts`/`.test.tsx`; E2E specs use `.spec.ts` in `e2e/`

**Directories:**
- Feature groupings under `src/components/` are lowercase (`import/`, `chat/`, `gamification/`, `simulators/`, `skeletons/`, `ui/`)
- Edge functions: kebab-case directory per function (`process-import-file/`), matching the string passed to `supabase.functions.invoke(...)`
- Migrations: `YYYYMMDDHHMMSS_snake_case_description.sql`

## Where to Add New Code

**New expense-related feature:**
- Do not add a manual-entry form, FAB, or drawer — expenses only enter via `/import-transactions`
- Import UI: `src/components/import/`
- Import server logic: `supabase/functions/process-import-file/index.ts`, `supabase/functions/_shared/statementParser.ts`

**New Page:**
- Add `src/pages/NewPage.tsx`
- Register route in `src/App.tsx` (inside `<AppLayout>` if authenticated)
- Add nav link in `src/components/AppSidebar.tsx` and `src/components/BottomNav.tsx`
- Add `e2e/new-page.spec.ts`

**New Database Table:**
- New file in `supabase/migrations/`, with RLS policies included
- Regenerate `src/integrations/supabase/types.ts`
- New hook in `src/hooks/useTableName.ts`

**New Edge Function:**
- New directory `supabase/functions/function-name/index.ts`
- Auth check pattern for user-facing functions; `X-Cron-Secret` pattern for cron-triggered ones
- Declare in `supabase/config.toml`
- If it calls AI, go through `supabase/functions/_shared/aiService.ts`, never a vendor SDK directly

**New AI capability:**
- Domain logic: `services/ai/src/domain/NewCapability.ts` (depends only on `providers/types.ts`)
- Prompt: `services/ai/src/prompts/newCapability.ts`
- Do not touch `domain/` when only adding a new vendor — add `services/ai/src/providers/newVendor.ts` and a case in `services/ai/src/config.ts`

**Utilities:**
- Shared pure helpers: `src/lib/`
- Form validation: `src/schemas/*.ts` (Zod) — only if the target form is being migrated to Zod; confirm existing pattern first

## Special Directories

**`public/`:**
- Purpose: Static assets, PWA service worker (`sw.js`), manifest
- Generated: `sw.js` build output partially generated by Workbox tooling
- Committed: Yes

**`.planning/`:**
- Purpose: GSD workflow artifacts (roadmap, phase plans, codebase docs)
- Generated: Yes (by GSD commands)
- Committed: Yes

**`supabase/functions/_shared/`:**
- Purpose: Cross-function helpers (CORS headers, `aiService.ts`, `statementParser.ts`)
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-09-17*
