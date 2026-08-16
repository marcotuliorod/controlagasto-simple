# Requirements: Entenda Gastos

**Defined:** 2026-08-15
**Core Value:** Users can see and control where their money goes, aligned to their actual billing
cycle (not calendar months).

This is a **brownfield** requirements set. The 27 requirements extracted from `docs/PRD.md`
(Epics 1-12) were verified file-by-file against the live codebase on 2026-08-15 — all are already
implemented and in production (v8.0.0). They are marked shipped below rather than mapped to a
roadmap phase. The current roadmap (`.planning/ROADMAP.md`) covers only the genuinely new,
unshipped requirements defined in the "Active (Current Milestone)" section.

## v1 Requirements — Shipped Baseline (v8.0.0)

Already implemented and in production. Documented here for traceability, not part of the active
roadmap. Source: `docs/PRD.md` user stories (US1.1-US12.2), synthesized in
`.planning/intel/requirements.md`.

### Epic 1: Expense Management

- [x] **REQ-add-expense-manual**: User can add an expense manually (required: amount, date;
  optional: category, account, merchant, payment method, tags, notes) with R$ formatting,
  merchant-based category suggestion, and a quick category picker.
- [x] **REQ-process-receipt-ocr**: User can photograph/upload a receipt (JPG/PNG/PDF ≤5MB) and
  have AI OCR auto-fill amount, date, merchant, CNPJ, and items into the expense form.
- [x] **REQ-edit-expense**: User can edit any field of an existing expense; changes are validated,
  audit-logged, and synced in realtime to other devices.
- [x] **REQ-delete-expense**: User can delete an expense with a confirmation dialog and a 5-second
  undo window; deletion is audit-logged.

### Epic 2: Recurring Expenses

- [x] **REQ-configure-recurring-expense**: User can configure a recurring expense (amount,
  merchant, frequency — daily/weekly/monthly/yearly, start/end date, default category/account).
- [x] **REQ-recurring-expense-automation**: System auto-generates expenses from active recurring
  configs via a daily `pg_cron` job, advancing `next_occurrence` and deactivating on `end_date`.

### Epic 3: Financial Accounts

- [x] **REQ-manage-multiple-accounts**: User can create/manage multiple accounts (wallet,
  checking, savings, credit, investment) with computed balance and default accounts on signup.
- [x] **REQ-account-dashboard**: User can view a per-account dashboard (balance, monthly/historical
  spend, 12-month trend, category breakdown, last 10 expenses, month-over-month comparison).

### Epic 4: Goals & Budget

- [x] **REQ-monthly-global-goal**: User can set a monthly spending goal (default + current-month
  override), with propagation to future months and a color-coded progress bar.
- [x] **REQ-configure-billing-cycle**: User can configure their card's billing-cycle day (1-28,
  default 1); all calculations respect the cycle via the `get_billing_period()` RPC.
- [x] **REQ-category-goals**: User can set a per-category spending limit (per month) with its own
  progress bar and 80%/100% alert thresholds, independent of the global goal.
- [x] **REQ-proactive-goal-alerts**: User receives a native web push notification at 80% (yellow)
  and 100% (red) of a goal, plus a congratulatory notification if they saved money, via the
  `notify-goal-threshold` edge function.

### Epic 5: Reports & Export

- [x] **REQ-generate-period-report**: User can generate a report for a custom period (filters:
  dates, categories, accounts, payment method) with bar/pie charts, a detailed table, and a
  comparison to the prior period — all respecting the billing cycle.
- [x] **REQ-export-pdf-excel**: User can export a report as CSV/JSON (`export-data` function),
  XLSX (client-side `xlsx.js`), or PDF (`export-pdf` function with visual formatting).
- [x] **REQ-scheduled-exports**: User can schedule recurring exports (name, format, frequency,
  filters); an hourly cron checks `next_run_at` via `process-scheduled-exports` and notifies when
  ready.

### Epic 6: Push Notifications

- [x] **REQ-notification-preferences**: User can configure which notifications they receive
  (budget alert threshold, spending-pattern alerts, days-since-last-expense reminder, monthly
  review, proactive insights), persisted in `notification_preferences`.
- [x] **REQ-receive-push-notifications**: User can receive native Web Push notifications
  (VAPID-based) on Android, iOS (installed PWA), and Desktop for goal alerts, recurring
  processing, export-ready, and insights.

### Epic 7: Financial Education

- [x] **REQ-educational-content-access**: User can browse educational content (categories:
  Budget/Investments/Debt/Planning; types: article/video/tip/guide; levels: beginner/
  intermediate/advanced) with reading-time estimates and per-category completion tracking.
- [x] **REQ-financial-quiz**: User can answer a 4-option multiple-choice quiz (easy/medium/hard,
  5/10/15 points) with post-answer explanations; results feed the Financial Health Score.

### Epic 8: Financial Health

- [x] **REQ-health-score-view**: User can view a 0-100 financial health score (Budget Adherence
  40%, Quiz 20%, Consistency 20%, Savings 20%), classification tier, 12-month trend, and
  per-component breakdown via `calculate_financial_health_score()`.

### Epic 9: AI Assistant

- [x] **REQ-chat-assistant**: User can hold multiple conversations with an AI financial assistant
  (context: profile, last 30 days of expenses, goals, score) via the `chat-assistant` edge
  function, rate-limited to 10 messages/minute, with persisted history and suggested questions.
- [x] **REQ-proactive-insights**: User can request AI-generated insights (positive/warning/tip/
  info) covering month-over-month comparison, goal progress, top categories, and trends, via the
  `generate-insights` edge function (cached to limit calls).

### Epic 10: Search & Navigation

- [x] **REQ-global-search**: User can open a VS Code-style command palette with Cmd+K/Ctrl+K,
  search across expenses/categories/accounts/pages, trigger quick actions, and navigate with the
  keyboard.

### Epic 11: Advanced Filters

- [x] **REQ-advanced-filters**: User can filter expenses by multiple categories, tags, amount
  range, payment methods, and a custom date range, applied instantly.
- [x] **REQ-saved-filters**: User can save a named filter combination (JSON config), mark it as a
  favorite, and load or edit/delete it with one click.

### Epic 12: Audit & Security

- [x] **REQ-audit-logs-view**: User can view a read-only audit log of CREATE/UPDATE/DELETE actions
  on expenses/accounts/categories/goals (before/after data, timestamp, optional IP), filterable
  by entity/action/period.
- [x] **REQ-delete-account-data**: User can permanently delete their account and all data (double
  confirmation + typed "EXCLUIR PERMANENTEMENTE") via the `delete-account` edge function, which
  removes storage files and logs the user out; not undoable.

## v1 Requirements — Active (Current Milestone)

New, unshipped requirements. Mapped to roadmap phases below.

### Code Quality & CI Health

- [x] **QUAL-01**: `npm run lint` passes with zero errors, unblocking CI's blocking lint gate
  (was 97 errors, now 0; 17 pre-existing warnings left as-is, out of scope).
- [x] **QUAL-02**: `as any` usage is measurably reduced in the highest-offending hooks, pages, and
  shared modules (per `.planning/codebase/CONCERNS.md`) — all 76 `no-explicit-any` occurrences
  replaced with real types, `unknown`, or narrow justified casts.
- [x] **QUAL-03**: `useBillingCycle`, `src/lib/bankPatterns.ts` (where bank-format detection
  actually lives), and `useImportTransactions` have new unit test coverage (31 tests across 3 new
  files) for cycle-day boundaries, bank detection/classification, and file-type/size validation.

### Dependency & Security Hardening

- [x] **SEC-01**: The `xlsx` and `react-router-dom` production-dependency vulnerabilities are
  resolved or explicitly mitigated with a documented decision (currently 7 `npm audit` findings:
  2 critical dev-only, 1 high with no upstream fix, 1 moderate needing a major-version bump). All
  7 documented with a decision in `docs/STATE.md` — none silently ignored; none fixable without a
  breaking major-version bump this phase intentionally deferred.
- [x] **SEC-02**: Every edge function under `supabase/functions/` consistently validates the
  Authorization header before processing a request (audited, not just spot-fixed). All 13 edge
  functions audited; `process-receipt` fixed (accepted any non-empty header, never validated the
  JWT before calling the paid OCR API); the other 12 were already correct.

### Performance & Scale Hardening

- [x] **PERF-01**: The Reports page paginates or virtualizes its expense query instead of loading
  an unbounded result set, so it stays responsive for users with 1,000+ historical expenses. The
  query stays unbounded by design (aggregates need the full period); virtualized the render of
  the expense list instead, reusing the `@tanstack/react-virtual` pattern from
  `ExpensesVirtualized.tsx`.
- [x] **PERF-02**: The gamification unlock-progress calculation is batched into a single query/RPC
  instead of 6+ sequential round-trips. Parallelized via `Promise.all` (single-RPC consolidation
  deferred — untestable without live DB access, see `docs/STATE.md`).
- [x] **PERF-03**: Production console logging is reduced or gated behind a debug flag so hot paths
  (realtime updates) don't spam the console. `realtimeLogger.ts` was already correct; gated the
  two real untreated hot paths (`PWAInstallProvider.tsx`, `main.tsx`) plus smaller call sites via
  a new shared `src/lib/logger.ts`.

### Guided Onboarding Experience

- [x] **ONBD-01**: A new user completes a multi-step onboarding wizard (not a single static form)
  before reaching the dashboard, covering monthly goal, billing cycle, and first account.
  `src/pages/Onboarding.tsx` is now a 3-step wizard; step 3 creates a real account via a new
  `AccountFormFields` component extracted from `AccountForm.tsx`.
- [x] **ONBD-02**: Contextual, dismissible tutorial tooltips introduce key features on a user's
  first visit to each major section (Dashboard, Reports, Accounts). New `FirstVisitTip.tsx`
  (controlled Radix Tooltip + `localStorage` dismiss flag), applied to the primary KPI card on
  each of the three sections.
- [x] **ONBD-03**: The app theme automatically switches between dark and light based on time of
  day, while still respecting a manual override saved to the user's profile. New
  `profiles.theme_preference` column + `useAutoTheme` hook + `ThemeToggle.tsx` now persists
  explicit choices via `useUpdateThemePreference`.

## v2 Requirements

Deferred to a future release, per the PRD's own stated roadmap. Tracked but not in the current
roadmap; promote to v1 when a business decision unlocks them (see PROJECT.md Out of Scope).

### Internationalization (PRD v9.0.0)

- **I18N-01**: User can use the app in pt-BR, en-US, or es-ES.
- **I18N-02**: Currency formatting adapts to the user's selected locale.
- **I18N-03**: Date/time display respects the user's timezone.

### Premium / Monetization (PRD v10.0.0)

- **PREM-01**: User can track expenses in multiple currencies.
- **PREM-02**: User can connect a bank account via Open Banking instead of manual import.
- **PREM-03**: User can track investments alongside expenses.
- **PREM-04**: User can generate an IRPF-ready tax report.
- **PREM-05**: A household can share a single budget across multiple users.
- **PREM-06**: User can import/export custom category sets.
- **PREM-07**: A public API is available for third-party integrations.

## Out of Scope

Explicitly excluded for now. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Native mobile app (React Native) | PWA already provides install-to-homescreen on iOS/Android; no concrete spec or demand signal justifies a second codebase |
| Desktop app (Electron) | Same rationale — PWA is desktop-installable already |
| ML-based spend predictions | PRD backlog idea without a concrete spec or validated user demand |
| Community / social features | Not aligned with the app's private-finance core value; no demand signal |
| Accountant integrations | PRD backlog idea without a concrete spec; revisit once export/report usage data exists |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| REQ-add-expense-manual | Shipped (v8.0.0) | Complete |
| REQ-process-receipt-ocr | Shipped (v8.0.0) | Complete |
| REQ-edit-expense | Shipped (v8.0.0) | Complete |
| REQ-delete-expense | Shipped (v8.0.0) | Complete |
| REQ-configure-recurring-expense | Shipped (v8.0.0) | Complete |
| REQ-recurring-expense-automation | Shipped (v8.0.0) | Complete |
| REQ-manage-multiple-accounts | Shipped (v8.0.0) | Complete |
| REQ-account-dashboard | Shipped (v8.0.0) | Complete |
| REQ-monthly-global-goal | Shipped (v8.0.0) | Complete |
| REQ-configure-billing-cycle | Shipped (v8.0.0) | Complete |
| REQ-category-goals | Shipped (v8.0.0) | Complete |
| REQ-proactive-goal-alerts | Shipped (v8.0.0) | Complete |
| REQ-generate-period-report | Shipped (v8.0.0) | Complete |
| REQ-export-pdf-excel | Shipped (v8.0.0) | Complete |
| REQ-scheduled-exports | Shipped (v8.0.0) | Complete |
| REQ-notification-preferences | Shipped (v8.0.0) | Complete |
| REQ-receive-push-notifications | Shipped (v8.0.0) | Complete |
| REQ-educational-content-access | Shipped (v8.0.0) | Complete |
| REQ-financial-quiz | Shipped (v8.0.0) | Complete |
| REQ-health-score-view | Shipped (v8.0.0) | Complete |
| REQ-chat-assistant | Shipped (v8.0.0) | Complete |
| REQ-proactive-insights | Shipped (v8.0.0) | Complete |
| REQ-global-search | Shipped (v8.0.0) | Complete |
| REQ-advanced-filters | Shipped (v8.0.0) | Complete |
| REQ-saved-filters | Shipped (v8.0.0) | Complete |
| REQ-audit-logs-view | Shipped (v8.0.0) | Complete |
| REQ-delete-account-data | Shipped (v8.0.0) | Complete |
| QUAL-01 | Phase 1 | Complete |
| QUAL-02 | Phase 1 | Complete |
| QUAL-03 | Phase 1 | Complete |
| SEC-01 | Phase 2 | Complete |
| SEC-02 | Phase 2 | Complete |
| PERF-01 | Phase 3 | Complete |
| PERF-02 | Phase 3 | Complete |
| PERF-03 | Phase 3 | Complete |
| ONBD-01 | Phase 4 | Complete |
| ONBD-02 | Phase 4 | Complete |
| ONBD-03 | Phase 4 | Complete |

**Coverage:**
- Shipped baseline requirements: 27 total, all Complete ✓
- Active (v1) requirements: 11 total
- Mapped to phases: 11
- Unmapped: 0 ✓

---
*Requirements defined: 2026-08-15*
*Last updated: 2026-08-15 after initial GSD roadmap ingest (brownfield)*
