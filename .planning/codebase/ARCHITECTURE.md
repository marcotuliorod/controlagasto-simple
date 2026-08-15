<!-- refreshed: 2026-08-15 -->
# Architecture

**Analysis Date:** 2026-08-15

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│  Browser / PWA Client (React 18 + TypeScript)           │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Entry Point: src/main.tsx                       │  │
│  │  ├─ Service Worker Registration (PWA support)   │  │
│  │  └─ React App Mount & Provider Stack            │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  Provider Layer (src/App.tsx)                           │
│  ┌────────────────────────────────────────────────┐    │
│  │ QueryClientProvider (React Query - 5min TTL)  │    │
│  │ └─ ThemeProvider (next-themes)                │    │
│  │    └─ TooltipProvider (Radix UI)              │    │
│  │       └─ PWAInstallProvider (Custom)          │    │
│  │          └─ BrowserRouter (React Router v6)  │    │
│  │             └─ Routes & Suspense              │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  Page/Component Layer                                   │
│  ├─ Layout: src/components/AppLayout.tsx               │
│  │  ├─ AppSidebar (Desktop nav)                        │
│  │  ├─ BottomNav (Mobile nav)                          │
│  │  ├─ FABAddExpense (Floating action button)          │
│  │  └─ GlobalSearch (Cmd+K palette)                    │
│  │                                                      │
│  ├─ Pages: src/pages/*.tsx (25+ pages)                 │
│  │  ├─ Public: Index, Auth, Privacy, Terms             │
│  │  ├─ Onboarding: Onboarding, Quiz                    │
│  │  ├─ Features: Dashboard, Reports, Settings, etc.    │
│  │  └─ (All lazy loaded via React.lazy())              │
│  │                                                      │
│  └─ Components: src/components/**/*.tsx                │
│     ├─ Feature: CategoryGoalsManager, etc.             │
│     ├─ UI: Shadcn/ui components                        │
│     ├─ Feature dirs: chat/, gamification/, import/     │
│     └─ Special: InstallPWA, PushOnboarding, etc.       │
└─────────────────────────────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  Hooks Layer     │ │  Library Layer   │ │  Integration     │
│  (React Query)   │ │  (Utils)         │ │  Layer           │
│                  │ │                  │ │                  │
│ ├─ useProfile   │ │ ├─ currencyUtils │ │ ├─ Supabase      │
│ ├─ useExpenses  │ │ ├─ dateRange     │ │ │ Client         │
│ ├─ useBilling   │ │ ├─ animations    │ │ │                │
│ │  Cycle        │ │ ├─ financialCalc │ │ └─ Database      │
│ ├─ useGoals     │ │ └─ storage       │ │    (RLS enabled) │
│ ├─ useAccounts  │ │                  │ │                  │
│ ├─ useExpenses  │ │ ├─ Validation    │ │ ├─ Auth          │
│ │  Realtime     │ │ │ Schemas (Zod)  │ │ │ (Supabase Auth)│
│ └─ ... (28+)    │ │ └─ (1 schema)    │ │ │                │
│                  │ │                  │ │ └─ Storage       │
│ React Query      │ │ Form Processing │ │    (Private      │
│ manages state    │ │ & Formatting    │ │     buckets)     │
│ lifecycle        │ │                  │ │                  │
└──────────────────┘ └──────────────────┘ └──────────────────┘
                           │
                           ▼
                    ┌──────────────────┐
                    │ Edge Functions   │
                    │ (Supabase)       │
                    │                  │
                    ├─ chat-assistant  │
                    ├─ process-receipt │
                    ├─ export-pdf      │
                    ├─ export-data     │
                    ├─ delete-account  │
                    ├─ send-push-notif │
                    └─ ... (10+ more)  │
                    └──────────────────┘
                           │
                           ▼
                    ┌──────────────────┐
                    │ PostgreSQL DB    │
                    │ (Supabase)       │
                    │                  │
                    ├─ expenses        │
                    ├─ accounts        │
                    ├─ categories      │
                    ├─ category_goals  │
                    ├─ budgets         │
                    ├─ audit_logs      │
                    └─ ... (20+ tables)│
                    └──────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| App | Root component, provider hierarchy | `src/App.tsx` |
| AppLayout | Main authenticated layout wrapper | `src/components/AppLayout.tsx` |
| AppSidebar | Desktop navigation menu | `src/components/AppSidebar.tsx` |
| BottomNav | Mobile navigation menu | `src/components/BottomNav.tsx` |
| GlobalSearch | Command palette (Cmd+K) | `src/components/GlobalSearch.tsx` |
| PWAInstallProvider | PWA install prompt context | `src/providers/PWAInstallProvider.tsx` |
| Dashboard | Main dashboard page with overview | `src/pages/Dashboard.tsx` |
| Reports | Reports with billing cycle support | `src/pages/Reports.tsx` |
| AddExpense | Expense creation form | `src/pages/AddExpense.tsx` |
| EditExpense | Expense editing page | `src/pages/EditExpense.tsx` |
| ExpensesVirtualized | Large list with virtualization | `src/pages/ExpensesVirtualized.tsx` |
| Settings | User settings page | `src/pages/Settings.tsx` |
| AccountProfile | User profile management | `src/pages/AccountProfile.tsx` |
| Accounts | Multiple account management | `src/pages/Accounts.tsx` |
| Education | Financial education content | `src/pages/Education.tsx` |
| Quiz | Interactive quiz | `src/pages/Quiz.tsx` |
| FinancialHealth | Financial health metrics | `src/pages/FinancialHealth.tsx` |
| Simulator | Budget/savings simulator | `src/pages/Simulator.tsx` |
| ChatAssistant | AI financial advisor | `src/pages/ChatAssistant.tsx` |
| RecurringExpenses | Recurring expense management | `src/pages/RecurringExpenses.tsx` |
| CategoryGoalsManager | Budget limits per category | `src/components/CategoryGoalsManager.tsx` |
| FinancialHealthScore | Health score display | `src/components/FinancialHealthScore.tsx` |

## Pattern Overview

**Overall:** Layered React SPA with React Router, React Query for state management, Supabase for backend, and PWA capabilities.

**Key Characteristics:**
- **Type-safe:** TypeScript + auto-generated Supabase types
- **Lazy-loaded:** All pages code-split via React.lazy()
- **Query-centric:** React Query (TanStack) manages all async state
- **Real-time capable:** WebSocket subscriptions for live updates
- **Progressive enhancement:** PWA with offline fallback
- **Accessible:** Radix UI components + screen reader announcements
- **Validation:** Client-side Zod schemas, server-side RLS + constraints
- **Multi-account:** Support for multiple accounts per user
- **Billing cycles:** Configurable 1-28 day cycles (not calendar months)

## Layers

**Presentation Layer (Pages + Components):**
- Purpose: Render UI and handle user interaction
- Location: `src/pages/`, `src/components/`
- Contains: React components (TSX files)
- Depends on: Hooks, UI library (shadcn/ui), routing
- Used by: React Router

**Hooks Layer (State & Data Management):**
- Purpose: Manage data fetching, caching, mutations, and business logic
- Location: `src/hooks/`
- Contains: Custom React hooks using React Query (28+ hooks)
- Key hooks: `useBillingCycle()`, `useProfile()`, `useCategoryGoals()`, `useExpensesRealtime()`, `usePushNotifications()`
- Depends on: Supabase client, React Query
- Used by: Pages and components

**Library/Utility Layer:**
- Purpose: Reusable functions for formatting, calculations, validation
- Location: `src/lib/`
- Contains: Utility modules (currencyUtils, dateRange, financialCalculations, etc.)
- Depends on: date-fns, zod
- Used by: Hooks and components

**Integration Layer:**
- Purpose: Communicate with external services (Supabase, auth)
- Location: `src/integrations/supabase/`
- Contains: Supabase client initialization, auto-generated type definitions
- Depends on: @supabase/supabase-js
- Used by: All hooks

**Edge Functions (Serverless):**
- Purpose: Server-side logic, AI calls, file processing
- Location: `supabase/functions/`
- Contains: 14+ edge functions (TypeScript)
- Depends on: OpenAI, external APIs
- Called by: Frontend via `supabase.functions.invoke()`

**Database Layer:**
- Purpose: Persistent data storage with RLS enforcement
- Location: Supabase PostgreSQL
- Contains: 20+ tables with audit logging
- Features: Row-level security, triggers, custom functions

## Data Flow

### Primary Request Path (Add Expense Example)

1. **User Interaction** (`src/pages/AddExpense.tsx`)
   - User fills form and submits
   - Form validation via Zod schema

2. **Mutation Call** (via hook `useAddExpense()` from `src/hooks/`)
   - useMutation from React Query
   - Calls Supabase client

3. **Backend Processing** (`src/integrations/supabase/client.ts`)
   - Sends authenticated request to Supabase
   - Includes auth token from localStorage

4. **Database** (PostgreSQL via Supabase)
   - RLS policy checks `auth.uid() = user_id`
   - Triggers auto-create audit logs
   - Edge functions may be invoked (e.g., notify-goal-threshold)

5. **Response & Cache Update**
   - React Query invalidates related queries
   - Real-time subscribers notified via WebSocket
   - Toast notification shown

6. **UI Update**
   - Dashboard refreshes via real-time or query invalidation
   - Page navigates back or shows success message

**State Management:**
- Client state: React Query (server sync)
- UI state: Local component state (loading, form data)
- User session: Supabase Auth (localStorage)
- Real-time state: WebSocket subscriptions (useExpensesRealtime)

### Billing Cycle Data Flow

1. User profile has `billing_cycle_day` (1-28)
2. `useBillingCycle()` hook uses `useProfile()` to get cycle day
3. Hook calls `getCurrentBillingCycle()` utility (calculates date range)
4. Pages/reports query expenses using cycle dates (not calendar months)
5. Backend RPC `get_billing_period()` used for server calculations
6. Reports always display cycle-aligned data

### Real-Time Update Flow

1. Component mounts → calls `useExpensesRealtime({ onUpdate: () => refetch() })`
2. Hook creates Supabase channel subscription
3. Database change → WebSocket message → React Query refetch
4. Component unmounts → hook cleans up subscription (with 100ms delay)
5. UI automatically reflects latest data

## Key Abstractions

**Billing Cycle:**
- Purpose: Support 1-28 day billing cycles instead of calendar months
- Examples: `src/hooks/useBillingCycle.ts`, `src/lib/dateRange.ts`
- Pattern: Configurable per user, used in all queries and reports

**React Query Integration:**
- Purpose: Centralized async state management with caching
- Examples: All hooks (useProfile, useCategoryGoals, etc.)
- Pattern: Custom hooks wrapping useQuery/useMutation

**Real-time Subscriptions:**
- Purpose: Live-update component state via WebSocket
- Examples: `src/hooks/useExpensesRealtime.ts`
- Pattern: Mounted ref to prevent unmount errors, 100ms cleanup delay

**Supabase Edge Functions:**
- Purpose: Serverless computation, external API calls
- Examples: `supabase/functions/process-receipt/`, `chat-assistant/`
- Pattern: Invoked via `supabase.functions.invoke()`, auth via Bearer token

**Multi-Account:**
- Purpose: Users can manage multiple accounts (wallets, cards, etc.)
- Examples: `src/pages/Accounts.tsx`, `src/hooks/useAccounts.ts`
- Pattern: Every expense links to account_id, account dashboard available

**Form Validation:**
- Purpose: Type-safe form handling with unified error messages
- Examples: `src/schemas/profileSchema.ts`
- Pattern: Zod schema → react-hook-form → UI display

**Transfer Detection:**
- Purpose: Mark internal transfers between accounts
- Pattern: Expense with `is_transfer=true` and `transfer_pair_id`
- Behavior: Not counted in spending analysis, budget calculations

## Entry Points

**Application Entry:**
- Location: `src/main.tsx`
- Triggers: Browser load
- Responsibilities: Service worker registration, React app mount

**App Component:**
- Location: `src/App.tsx`
- Triggers: After React mounts
- Responsibilities: Provider hierarchy, route configuration, suspense boundaries

**Auth Entry:**
- Location: `src/pages/Auth.tsx` (route `/auth`)
- Triggers: Unauthenticated users or manual navigation
- Responsibilities: Login/signup with Supabase Auth

**Onboarding:**
- Location: `src/pages/Onboarding.tsx` (route `/onboarding`)
- Guard: `src/routes/RequireOnboarding.tsx`
- Triggers: First-time users without monthly goals
- Responsibilities: Initial setup, theme preference, etc.

**Dashboard:**
- Location: `src/pages/Dashboard.tsx` (route `/dashboard`)
- Guard: Must be authenticated
- Triggers: Authenticated users accessing home
- Responsibilities: Overview, recent expenses, goals summary

## Architectural Constraints

- **Threading:** Single-threaded JavaScript (Web Workers for SW only)
- **Global state:** Minimal — Supabase Auth session in localStorage, React Query cache
- **Circular imports:** None detected (layered architecture prevents this)
- **PWA Limitations:** Offline support limited to cached content only (no offline database)
- **Real-time Limitations:** WebSocket closes on unmount; subscriptions use 100ms cleanup delay

## Anti-Patterns

### Direct Database Access Without Error Handling
**What happens:** Component directly calls supabase queries without try/catch
**Why it's wrong:** Unhandled errors crash component, poor UX
**Do this instead:** Use hooks (e.g., `useProfile()`) which handle errors via React Query

### Stale Data from Calendar Months
**What happens:** Code queries expenses by `startOfMonth()` instead of billing cycle
**Why it's wrong:** Breaks for users with custom cycle days (reports show wrong data)
**Do this instead:** Always use `useBillingCycle()` and `get_billing_period()` RPC

### Missing Unmount Cleanup in Real-time Subscriptions
**What happens:** Component unmounts with active WebSocket → "WebSocket is closed" errors
**Why it's wrong:** Memory leaks, console spam, potential crash
**Do this instead:** Use mounted ref pattern (see `useExpensesRealtime.ts`)

### Forms Without Zod Validation
**What happens:** Manual validation in handlers, inconsistent error display
**Why it's wrong:** Type-unsafe, duplicated validation logic
**Do this instead:** Define Zod schema, use `react-hook-form` + `@hookform/resolvers/zod`

### Query Invalidation Without Specific Keys
**What happens:** `queryClient.invalidateQueries()` with broad key patterns
**Why it's wrong:** Unnecessarily refetches unrelated queries
**Do this instead:** Invalidate specific keys: `{ queryKey: ["expenses", userId] }`

## Error Handling

**Strategy:** Layered with client-side validation, React Query error states, and Supabase/Edge function responses.

**Patterns:**
- **Form validation:** Zod schema validation before submission
- **Query errors:** React Query catches, surfaces via `error` state
- **Mutation errors:** Caught in `onError` callbacks, toast notification shown
- **Auth errors:** Redirect to `/auth` on 401
- **RLS violations:** Handled as 403 errors (data never reaches client)
- **Edge function errors:** Returned as `{ error: string }`, handled in try/catch
- **Network errors:** React Query retries with exponential backoff

## Cross-Cutting Concerns

**Logging:**
- Console logs for PWA lifecycle (`[PWA]` prefix)
- Realtime logger for WebSocket events (see `src/lib/realtimeLogger.ts`)
- Supabase query logs (via Supabase dashboard)
- Error tracking via browser console

**Validation:**
- Client: Zod schemas (`src/schemas/profileSchema.ts`)
- Server: PostgreSQL constraints, RLS policies, trigger functions
- Edge functions: Input validation before external API calls

**Authentication:**
- Mechanism: Supabase Auth (JWT tokens)
- Storage: localStorage (auto-managed by Supabase client)
- Refresh: Auto-refresh enabled in client config
- Guard routes: React Router outlet wrappers (e.g., RequireOnboarding)
- RLS: All tables check `auth.uid() = user_id`

**Authorization:**
- Policy: Row-level security on all tables
- Enforcement: PostgreSQL policies, not application logic
- User isolation: Each user sees only their own data

**Caching:**
- React Query: 5-minute stale time (configurable per query)
- Service Worker: Workbox strategies for static assets
- Browser: Cache-Control headers on edge functions

---
*Architecture analysis: 2026-08-15*
