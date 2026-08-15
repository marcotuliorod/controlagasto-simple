<!-- refreshed: 2026-08-15 -->
# Codebase Structure

**Analysis Date:** 2026-08-15

## Directory Layout

```
controlagasto-simple/
├── .claude/                     # Claude Code settings & hooks
│   ├── settings.json           # Project configuration
│   ├── settings.local.json      # User overrides
│   └── hooks/                  # Custom action hooks
├── .github/                    # GitHub workflows & templates
├── .planning/                  # GSD planning documents (generated)
│   └── codebase/              # Codebase mapping (ARCHITECTURE.md, STRUCTURE.md)
├── .agents/                    # Multi-agent orchestration
├── src/                        # Application source code (React, TypeScript)
│   ├── main.tsx               # Entry point (PWA registration)
│   ├── App.tsx                # Root component (providers, routing)
│   ├── index.css              # Global styles
│   ├── vite-env.d.ts          # Vite type definitions
│   ├── pages/                 # Route pages (25+ lazy-loaded pages)
│   │   ├── Index.tsx          # Landing page
│   │   ├── Auth.tsx           # Authentication
│   │   ├── Onboarding.tsx     # First-time setup
│   │   ├── Dashboard.tsx      # Main dashboard
│   │   ├── AddExpense.tsx     # Expense creation
│   │   ├── EditExpense.tsx    # Expense editing
│   │   ├── ExpensesVirtualized.tsx  # Virtual list (1000+ items)
│   │   ├── Reports.tsx        # Reporting & analytics
│   │   ├── Settings.tsx       # User settings
│   │   ├── AccountProfile.tsx # User profile
│   │   ├── Accounts.tsx       # Multiple accounts
│   │   ├── Education.tsx      # Financial education
│   │   ├── Quiz.tsx           # Interactive quiz
│   │   ├── FinancialHealth.tsx # Health metrics
│   │   ├── Simulator.tsx      # Budget simulator
│   │   ├── ChatAssistant.tsx  # AI advisor
│   │   ├── RecurringExpenses.tsx  # Recurring transactions
│   │   ├── ScheduledExports.tsx   # Export scheduling
│   │   ├── ImportTransactions.tsx # CSV import
│   │   ├── NotificationSettings.tsx # Notification prefs
│   │   ├── AuditLogs.tsx      # Change history
│   │   ├── DeleteAccount.tsx  # Account deletion
│   │   ├── Privacy.tsx        # Privacy policy
│   │   ├── Terms.tsx          # Terms of service
│   │   ├── NotFound.tsx       # 404 page
│   │   └── AccountDashboard.tsx    # Per-account dashboard
│   ├── components/            # Reusable components
│   │   ├── AppLayout.tsx      # Main layout wrapper
│   │   ├── AppSidebar.tsx     # Desktop navigation
│   │   ├── BottomNav.tsx      # Mobile navigation
│   │   ├── GlobalSearch.tsx   # Cmd+K palette
│   │   ├── CategoryGoalsManager.tsx # Budget limits UI
│   │   ├── FinancialHealthScore.tsx # Health display
│   │   ├── InsightsCard.tsx   # Data insights
│   │   ├── ContextualInsight.tsx    # Contextual tips
│   │   ├── AccountCard.tsx    # Account display
│   │   ├── AccountForm.tsx    # Account creation form
│   │   ├── AdvancedFilters.tsx      # Filter UI
│   │   ├── AuditLogViewer.tsx # Audit display
│   │   ├── QuickAddExpense.tsx # Quick entry
│   │   ├── TagInput.tsx       # Tag selection
│   │   ├── NotificationsCard.tsx    # Notification display
│   │   ├── InstallPWA.tsx     # PWA install prompt
│   │   ├── PushOnboarding.tsx # Push notification setup
│   │   ├── ErrorRecovery.tsx  # Error handling UI
│   │   ├── EmptyState.tsx     # Empty state UI
│   │   ├── DashboardSkeleton.tsx    # Loading skeleton
│   │   ├── ThemeToggle.tsx    # Dark mode toggle
│   │   ├── PageTransition.tsx # Page animations
│   │   ├── ScreenReaderAnnouncer.tsx # A11y
│   │   ├── AnimatedProgress.tsx     # Progress animation
│   │   ├── AppFooter.tsx      # Footer
│   │   ├── CategoryQuickPicker.tsx  # Category selection
│   │   ├── chat/              # Chat components
│   │   │   └── ChatMessage.tsx, ChatInput.tsx
│   │   ├── feedback/          # Feedback components
│   │   │   └── FeedbackForm.tsx, etc.
│   │   ├── gamification/      # Gamification UI
│   │   │   ├── GamificationBadge.tsx
│   │   │   ├── StreakDisplay.tsx
│   │   │   └── LevelProgress.tsx
│   │   ├── import/            # Import components
│   │   │   ├── CSVParser.tsx
│   │   │   ├── ImportPreview.tsx
│   │   │   └── BankMatcher.tsx
│   │   ├── simulators/        # Simulator components
│   │   │   ├── SavingsSimulator.tsx
│   │   │   └── BudgetSimulator.tsx
│   │   ├── skeletons/         # Loading skeletons
│   │   │   └── ExpenseSkeleton.tsx, etc.
│   │   └── ui/                # shadcn/ui components (50+ files)
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── dialog.tsx
│   │       ├── form.tsx
│   │       ├── input.tsx
│   │       ├── select.tsx
│   │       ├── toast.tsx
│   │       ├── tooltip.tsx
│   │       └── ... (many more)
│   ├── hooks/                 # Custom React hooks (28+ hooks)
│   │   ├── use-mobile.tsx     # Mobile detection
│   │   ├── use-toast.ts       # Toast notifications
│   │   ├── useProfile.ts      # User profile queries
│   │   ├── useAccounts.ts     # Account management
│   │   ├── useExpensesRealtime.ts  # Real-time expenses
│   │   ├── useBillingCycle.ts # Billing cycle logic
│   │   ├── useCategoryGoals.ts     # Category budgets
│   │   ├── useCategorySuggestion.ts    # Smart categories
│   │   ├── useGoals.ts        # Monthly goals
│   │   ├── useChatAssistant.ts     # AI chat
│   │   ├── useContextualInsight.ts  # Insights
│   │   ├── useFinancialHealthScore.ts   # Health metrics
│   │   ├── useGamification.ts  # Achievements
│   │   ├── useAuditLogs.ts    # Change history
│   │   ├── useEducationalContent.ts    # Learning content
│   │   ├── useImportTransactions.ts    # CSV import
│   │   ├── useInsights.ts     # Analytics
│   │   ├── useNotifications.ts      # Notification queries
│   │   ├── usePushNotifications.ts  # Push subscriptions
│   │   ├── useQuiz.ts         # Quiz state
│   │   ├── useRecurringExpenses.ts  # Recurring logic
│   │   ├── useReducedMotion.ts    # A11y preference
│   │   ├── useSavedFilters.ts # Filter persistence
│   │   ├── useScheduledExports.ts  # Export scheduling
│   │   └── (3 test files)
│   ├── lib/                   # Utility functions
│   │   ├── currencyUtils.ts   # R$ formatting
│   │   ├── amountUtils.ts     # Amount parsing
│   │   ├── dateRange.ts       # Billing cycle dates
│   │   ├── financialCalculations.ts  # Formulas
│   │   ├── bankPatterns.ts    # Bank detection regex
│   │   ├── exportUtils.ts     # Export helpers
│   │   ├── pushUtils.ts       # Push notification logic
│   │   ├── pwaUtils.ts        # PWA helpers
│   │   ├── storage.ts         # localStorage wrappers
│   │   ├── realtimeLogger.ts  # WebSocket logging
│   │   ├── greeting.ts        # Contextual greetings
│   │   ├── microcopy.ts       # UI copy
│   │   ├── animations.ts      # Animation configs
│   │   ├── utils.ts           # Misc utilities
│   │   └── (10+ test files)
│   ├── integrations/          # Third-party integrations
│   │   └── supabase/
│   │       ├── client.ts      # Supabase client singleton
│   │       └── types.ts       # Auto-generated DB types (34KB)
│   ├── providers/             # Context providers
│   │   ├── PWAInstallProvider.tsx   # PWA install context
│   │   └── PWAInstallProvider.test.tsx
│   ├── routes/                # Route guards & middleware
│   │   └── RequireOnboarding.tsx    # Onboarding guard
│   ├── schemas/               # Zod validation schemas
│   │   └── profileSchema.ts   # User profile validation
│   ├── test/                  # Test configuration
│   │   └── setup.ts           # Vitest setup
│   └── main.test.tsx          # Entry point test
├── supabase/                  # Supabase backend
│   ├── config.toml            # Supabase local config
│   ├── migrations/            # Database migrations (30+ SQL files)
│   │   ├── *_create_tables.sql
│   │   ├── *_add_audit_logs.sql
│   │   ├── *_add_rls_policies.sql
│   │   └── ... (dated YYYYMMDDHHMMSS format)
│   └── functions/             # Edge functions (14 serverless functions)
│       ├── chat-assistant/            # OpenAI integration
│       │   └── index.ts
│       ├── process-receipt/           # OCR receipt processing
│       │   └── index.ts
│       ├── export-pdf/                # PDF export
│       │   ├── index.ts
│       │   └── index.ts (test: 2026-08-15)
│       ├── export-data/               # Excel export
│       │   └── index.ts
│       ├── delete-account/            # User deletion
│       │   └── index.ts
│       ├── send-push-notification/    # Web push
│       │   └── index.ts
│       ├── get-vapid-public-key/      # Push credentials
│       │   └── index.ts
│       ├── notify-goal-threshold/     # Budget alerts
│       │   └── index.ts
│       ├── process-recurring-expenses/# Auto-recurring
│       │   └── index.ts
│       ├── process-scheduled-exports/ # Scheduled exports
│       │   └── index.ts
│       ├── generate-insights/         # AI insights
│       │   └── index.ts
│       ├── check-category-variations/ # Smart categories
│       │   └── index.ts
│       └── process-import-file/       # CSV import
│           └── index.ts
├── e2e/                       # End-to-end tests (Playwright)
│   ├── auth.setup.ts          # Auth test setup
│   ├── auth.spec.ts           # Authentication tests
│   ├── expense-crud.spec.ts   # Expense CRUD tests
│   ├── ocr-basic.spec.ts      # OCR receipt tests
│   ├── reports-cycle.spec.ts  # Report billing cycle tests
│   ├── export-pdf.spec.ts     # PDF export tests
│   ├── export-excel.spec.ts   # Excel export tests
│   ├── insights.spec.ts       # AI insights tests
│   ├── scheduled-exports.spec.ts # Export scheduling tests
│   ├── recurring-expenses.spec.ts # Recurring expense tests
│   ├── tags-notes.spec.ts     # Tag & note tests
│   └── fixtures/
│       └── test-data.ts       # Shared test utilities
├── public/                    # Static assets & PWA
│   ├── sw.js                  # Service Worker (Workbox)
│   ├── icon-192.png           # PWA icon (192×192)
│   ├── icon-512.png           # PWA icon (512×512)
│   ├── splash-640x1136.png    # Splash screen
│   └── ... (other assets)
├── docs/                      # Documentation (30+ MD files)
│   ├── billing-cycle.md       # Billing cycle feature
│   ├── testing.md             # Testing guide
│   ├── pwa-setup.md           # PWA configuration
│   ├── push-notifications.md  # Push setup
│   ├── architecture.md        # Architecture overview
│   ├── sprint-7-features.md   # Latest features
│   └── ... (feature docs)
├── scripts/                   # Build & utility scripts
├── dist/                      # Production build (generated)
├── .env                       # Environment variables (NOT committed)
├── index.html                 # HTML entry point
├── package.json               # Dependencies & scripts
├── package-lock.json          # Lock file
├── tsconfig.json              # TypeScript config
├── tsconfig.app.json          # App-specific TS config
├── tsconfig.node.json         # Node-specific TS config
├── vite.config.ts             # Vite build config
├── playwright.config.ts       # E2E test config
├── playwright-fixture.ts      # Playwright fixtures
├── tailwind.config.ts         # Tailwind CSS config
├── postcss.config.js          # PostCSS config
├── components.json            # shadcn/ui config
├── eslint.config.js           # ESLint configuration
├── lighthouserc.js            # Lighthouse CI config
├── CLAUDE.md                  # Claude Code guidance
├── README.md                  # Project overview
├── CHANGELOG.md               # Version history
├── FINALIZATION-STATUS.md     # Sprint status
├── bun.lockb                  # Bun lock file (alternative PM)
├── .gitignore                 # Git ignore rules
└── .git/                      # Git repository
```

## Directory Purposes

**src/:** Heart of the application — React components, hooks, utilities, and integrations.

**src/pages/:** 25+ full-screen components, one per route. All lazy-loaded for code splitting. Mix of public routes (Auth, Index) and authenticated routes (all others wrapped in AppLayout).

**src/components/:** Reusable UI components, organized by feature (chat, gamification, import) and type (ui for shadcn). AppLayout, AppSidebar, BottomNav form the main shell. Feature components handle domain logic (CategoryGoalsManager, etc.).

**src/hooks/:** 28+ custom React hooks encapsulating data fetching and state management. All use React Query for caching and sync. Examples: useBillingCycle (configurable cycles), useExpensesRealtime (WebSocket), usePushNotifications (subscription lifecycle).

**src/lib/:** Utility modules for currency formatting, date calculations, validation, financial formulas. No component or async logic — purely pure functions or simple wrappers.

**src/integrations/supabase/:** Supabase client singleton and auto-generated TypeScript types (Database interface). Client configured with localStorage persistence and auto token refresh.

**src/providers/:** Context providers for app-wide state. Currently only PWAInstallProvider, but can extend for theme, auth, etc.

**src/routes/:** Route guards and middleware. RequireOnboarding checks if user needs setup before accessing /onboarding.

**src/schemas/:** Zod validation schemas for forms. Single profileSchema.ts for user profile validation. Can be extended per feature.

**supabase/:** Backend configuration and serverless functions. Migrations define schema and RLS policies. Edge functions handle AI, file processing, and async operations.

**supabase/migrations/:** 30+ timestamped SQL files defining tables, indexes, RLS policies, audit triggers, custom functions. Applied in order by Supabase CLI.

**supabase/functions/:** 14 Edge functions (TypeScript, Deno runtime). Called from frontend via supabase.functions.invoke(). Examples: process-receipt (OCR), chat-assistant (OpenAI), export-pdf (PDF generation).

**e2e/:** Playwright test suite (11 test files). Tests complete user flows including auth, CRUD, OCR, exports, AI features, recurring expenses. Uses Page Object Model pattern and shared test data.

**public/:** Static assets and PWA resources. sw.js is the service worker (Workbox-generated). Icons and splash screens for installable app.

**docs/:** 30+ markdown files documenting features, architecture, testing, setup. Linked from CLAUDE.md for developer reference.

## Key File Locations

**Entry Points:**
- `src/main.tsx`: PWA service worker registration, React app mount
- `src/App.tsx`: Provider hierarchy, all route definitions, suspense boundaries
- `index.html`: HTML shell, loads main.tsx

**Configuration:**
- `vite.config.ts`: Build settings, PWA plugin, bundle analyzer
- `tsconfig.json`: TypeScript strict settings (noImplicitAny: false for flexibility)
- `tailwind.config.ts`: CSS framework configuration
- `playwright.config.ts`: E2E test runner configuration

**Core Logic:**
- `src/integrations/supabase/client.ts`: Supabase connection singleton
- `src/hooks/useBillingCycle.ts`: Central hook for billing cycle logic
- `src/lib/dateRange.ts`: Billing cycle date calculations
- `src/lib/currencyUtils.ts`: Brazilian Real formatting (R$ 1.234,56)

**Testing:**
- `src/test/setup.ts`: Vitest configuration (jsdom, mocks)
- `e2e/auth.setup.ts`: Shared authentication for E2E tests
- `e2e/fixtures/test-data.ts`: Reusable test data and utilities

**Database:**
- `supabase/migrations/`: SQL schema definitions
- `supabase/functions/`: Serverless backend logic

## Naming Conventions

**Files:**
- Pages: `PascalCase.tsx` (e.g., `Dashboard.tsx`)
- Components: `PascalCase.tsx` (e.g., `AccountCard.tsx`)
- Hooks: `camelCase.ts` starting with `use` (e.g., `useBillingCycle.ts`)
- Utilities: `camelCase.ts` (e.g., `currencyUtils.ts`)
- Tests: `filename.test.ts` or `filename.spec.ts` (colocated)
- Schemas: `featureName + Schema.ts` (e.g., `profileSchema.ts`)

**Directories:**
- Feature collections: `camelCase/` (e.g., `components/chat/`, `components/gamification/`)
- Supabase migrations: `YYYYMMDDHHMMSS_description.sql`
- Supabase functions: `kebab-case/` (e.g., `process-receipt/`, `chat-assistant/`)

**Imports:**
- Path alias `@/` resolves to `src/` (configured in vite.config.ts and tsconfig.json)
- Example: `import { Button } from "@/components/ui/button"`

## Where to Add New Code

**New Feature (Full Page):**
- Primary code: `src/pages/FeatureName.tsx`
- Tests: `e2e/feature-name.spec.ts` (E2E), `src/pages/FeatureName.test.tsx` (unit, if needed)
- Hooks: `src/hooks/useFeatureName.ts` (if complex state)
- Components: `src/components/feature-name-subcomponent.tsx` (if reusable)
- Schema: `src/schemas/featureNameSchema.ts` (if forms)
- Route: Add to App.tsx routes array

**New Component (Reusable):**
- Implementation: `src/components/FeatureName.tsx` or `src/components/feature-category/FeatureName.tsx`
- Tests: `src/components/FeatureName.test.tsx`
- Export: Re-export from category index if grouped

**New Hook (State/Data):**
- Implementation: `src/hooks/useFeatureName.ts`
- Tests: `src/hooks/useFeatureName.test.ts`
- Pattern: Use React Query (useQuery/useMutation) for async
- Export: No index.ts — import directly from file

**New Utility Function:**
- Implementation: `src/lib/featureNameUtils.ts` or existing related file
- Tests: `src/lib/featureNameUtils.test.ts` (colocated)
- Pattern: Pure functions, no side effects
- Export: Named exports, no default

**New Edge Function:**
- Directory: `supabase/functions/function-name/`
- File: `index.ts` with CORS + auth verification
- Pattern: Handle Authorization header, call supabase-js client
- Call: `supabase.functions.invoke("function-name", { body: {...} })`

**Database Table:**
- Migration: `supabase/migrations/YYYYMMDDHHMMSS_add_table_name.sql`
- Policies: Include RLS in migration
- Types: Auto-generate via `npx supabase gen types typescript`
- Hook: Create `src/hooks/useTableName.ts` for CRUD

## Special Directories

**node_modules/:** Contains 500+ npm packages. Never edit, regenerate via `npm install`.
- Generated: Yes
- Committed: No

**.git/:** Version control repository. Branches: main (production), feature branches.
- Generated: No
- Committed: Yes

**dist/:** Production build output (HTML, JS, CSS, assets). Regenerated each build.
- Generated: Yes (from vite build)
- Committed: No

**.env:** Environment variables (Supabase URL, API key). Never commit.
- Generated: No
- Committed: No (in .gitignore)

**supabase/migrations/:** Database schema version control. Each migration is immutable.
- Generated: No (manually written SQL)
- Committed: Yes (version control)

**.claude/:** Claude Code project configuration, custom hooks, and GSD state.
- Generated: Partially (GSD state)
- Committed: Partially (settings, not sensitive state)

**.planning/codebase/:** Architecture and structure documentation (this file).
- Generated: Yes (by analysis agent)
- Committed: Optional

---
*Structure analysis: 2026-08-15*
