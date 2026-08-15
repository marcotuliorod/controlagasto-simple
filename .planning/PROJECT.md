# Entenda Gastos

## What This Is

Entenda Gastos ("Entenda seus Gastos" — Personal Finance Manager) is a Brazilian personal-finance
progressive web app that lets users track expenses (manual entry or AI receipt OCR), manage
multiple accounts, set billing-cycle-aware budgets and goals, generate/export reports, and get
AI-powered financial coaching plus gamified financial education. It is already in production
(v8.0.0) and this document tracks its ongoing iteration, not a from-scratch build.

## Core Value

Users can see and control where their money goes, aligned to their actual credit-card billing
cycle (day 1-28) — not the calendar month — so every budget, goal, and report reflects reality
instead of an approximation.

## Business Context

- **Customer**: Brazilian individual consumers managing personal finances — primary persona is a
  young professional with a credit card whose statement closes mid-month; secondary personas are
  a financial-literacy beginner and a freelancer who needs exportable reports.
- **Revenue model**: Free today. The product's own roadmap (`docs/PRD.md`) earmarks a future
  premium tier (multi-currency, Open Banking, tax reporting) as v10.0.0, but no business model has
  been validated yet — see Out of Scope.
- **Success metric**: Monthly Active Users and 90-day retention (PRD targets: 10,000 MAU in year
  one, 40% 90-day retention, 60% weekly expense-logging rate, NPS ≥50).
- **Strategy notes**: `docs/PRD.md` (full PRD — personas, KPIs, design principles); `CHANGELOG.md`
  (release history).

## Requirements

### Validated

Shipped in production (v8.0.0, verified file-by-file against the live codebase on 2026-08-15).
Full acceptance criteria and REQ-ID mapping in `.planning/REQUIREMENTS.md`.

- ✓ **Epic 1 — Expense Management** (4 reqs): manual entry with R$ formatting and merchant-based
  category suggestions; AI receipt OCR (JPG/PNG/PDF ≤5MB); edit with audit log + realtime sync;
  delete with 5s undo — v8.0.0
- ✓ **Epic 2 — Recurring Expenses** (2 reqs): configurable recurrence (daily/weekly/monthly/yearly)
  + daily `pg_cron` automation — v8.0.0
- ✓ **Epic 3 — Multi-Account** (2 reqs): multiple accounts (wallet/checking/savings/credit/
  investment) + per-account dashboard with 12-month trend — v8.0.0
- ✓ **Epic 4 — Goals & Budget** (4 reqs): monthly global goal with propagation, configurable
  billing cycle (1-28) via `get_billing_period()`, per-category limits, proactive push alerts at
  80%/100% — v8.0.0
- ✓ **Epic 5 — Reports & Export** (3 reqs): billing-cycle-aware period reports, PDF/Excel/CSV/JSON
  export, hourly-cron scheduled exports — v8.0.0
- ✓ **Epic 6 — Push Notifications** (2 reqs): notification preferences, Web Push (VAPID) delivery
  across Android/iOS-PWA/Desktop — v8.0.0
- ✓ **Epic 7 — Financial Education** (2 reqs): articles/videos/tips/guides by level, gamified quiz
  with difficulty-based scoring — v8.0.0
- ✓ **Epic 8 — Financial Health** (1 req): 0-100 health score (budget adherence 40% + quiz 20% +
  consistency 20% + savings 20%) with 12-month trend — v8.0.0
- ✓ **Epic 9 — AI Assistant** (2 reqs): multi-conversation chat assistant with financial context
  (rate-limited 10 msg/min), proactive AI-generated insights — v8.0.0
- ✓ **Epic 10 — Search** (1 req): global Cmd+K command palette — v8.0.0
- ✓ **Epic 11 — Advanced Filters** (2 reqs): multi-criteria filters (category/tag/amount/payment
  method), saved/favorite filters — v8.0.0
- ✓ **Epic 12 — Audit & Security** (2 reqs): audit log viewer (before/after, filterable), LGPD
  "right to be forgotten" account deletion — v8.0.0

Also shipped since the ingested PRD was written (2026-01-21), beyond its documented scope — no
formal REQ-ID, verified directly in code:

- ✓ Bank statement / PDF import via AI (CSV, PDF extrato parsing, bank-pattern detection) with
  duplicate and transfer detection — `src/pages/ImportTransactions.tsx`,
  `supabase/functions/process-import-file/index.ts`
- ✓ Progressive gamification system (unlocks, achievements, streaks tied to education/quiz
  engagement) — `src/hooks/useGamification.ts`, `src/components/gamification/`
- ✓ Security hardening pass (VAPID key auth enforcement, bank-import input validation) — recent
  commits (`Enforce auth on VAPID key`, `Improve bank import security`)

### Active

Current milestone — see `.planning/ROADMAP.md` for phase sequencing.

- [ ] **QUAL-01**: ESLint passes with zero errors, unblocking CI's lint gate
- [ ] **QUAL-02**: `as any` usage reduced in the highest-offending hooks/pages/shared modules
- [ ] **QUAL-03**: `useBillingCycle` and `useImportTransactions` hooks have unit test coverage
- [ ] **SEC-01**: Production dependency vulnerabilities (`xlsx`, `react-router-dom`) resolved or
  explicitly mitigated with a documented decision
- [ ] **SEC-02**: All edge functions consistently validate the Authorization header
- [ ] **PERF-01**: Reports page paginates/virtualizes instead of loading unbounded expense history
- [ ] **PERF-02**: Gamification unlock-progress calculation batched into fewer queries
- [ ] **PERF-03**: Production console logging reduced/gated behind a debug flag
- [ ] **ONBD-01**: Interactive onboarding wizard walks new users through initial setup step-by-step
- [ ] **ONBD-02**: Contextual tutorial tooltips introduce key features on first use of each section
- [ ] **ONBD-03**: Theme automatically switches dark/light by time of day, manual override preserved

### Out of Scope

- **Multi-language i18n (pt-BR/en-US/es-ES), premium/monetization features (multi-currency, Open
  Banking, investment tracking, IRPF tax reporting, shared budgets, public API)** — PRD's own
  v9.0.0/v10.0.0. Deferred, not rejected — pending business-model validation and an international-
  demand signal. Tracked as v2 in `.planning/REQUIREMENTS.md`.
- **Native mobile app (React Native), desktop app (Electron)** — the PWA already provides
  install-to-homescreen on iOS/Android/desktop; no concrete spec or demand signal justifies a
  second codebase.
- **ML-based spend predictions, community/social features, accountant integrations** — PRD backlog
  ideas without concrete specs or validated demand; revisit if requested.

## Context

- **Brownfield initialization**: this is the first GSD roadmap for an already-mature, production
  codebase (v8.0.0 "Production Ready" per `docs/PRD.md`, dated 2026-01-21). The PRD is ~7 months
  stale relative to today (2026-08-15) — the team kept shipping after it was written (bank
  statement/PDF import, progressive gamification, security hardening) without updating the
  document. This roadmap reflects the *actual* current codebase state (verified file-by-file),
  not just the PRD's stated scope.
- **Full technical context**: `.planning/codebase/` (STACK.md, ARCHITECTURE.md, STRUCTURE.md,
  CONVENTIONS.md, TESTING.md, INTEGRATIONS.md, CONCERNS.md) — read before planning any phase.
- **Product context**: `docs/PRD.md` has full personas, design principles, and success-metric
  tables not captured in REQUIREMENTS.md (which only extracts Como/Quero/Para user stories).
- **Known issues confirmed live** (2026-08-15): `npm run lint` fails CI's blocking gate (97
  errors, mostly `@typescript-eslint/no-explicit-any`); `npm audit` reports 7 vulnerabilities (2
  critical — `vitest`/`@vitest/ui`, dev-only, fixable via `npm audit fix`; 1 high — `xlsx`, no
  upstream fix; 1 moderate — `react-router-dom`, needs a major-version bump). See
  `.planning/codebase/CONCERNS.md` and `docs/STATE.md` for full detail.
- **User**: marcotuliorod@gmail.com — solo developer building and maintaining this app with
  Claude Code.

## Constraints

- **Tech stack**: React 18 + TypeScript (non-strict mode by design) + Vite + Supabase (Postgres /
  Auth / Storage / Edge Functions / Realtime) + Tailwind/shadcn-ui — established, not to be
  swapped. See `.planning/codebase/STACK.md`.
- **Billing-cycle invariant**: all date-scoped queries (expenses, reports, budgets, goals) MUST
  use `useBillingCycle()` / `get_billing_period()` RPC — never calendar-month boundaries
  (`startOfMonth()`). This is the app's core differentiator; breaking it breaks the product.
- **Currency formatting**: Brazilian Real only (R$ 1.234,56 — dot thousands, comma decimal) via
  `src/lib/currencyUtils.ts`. Any future i18n work must not regress this default.
- **Row Level Security**: every table has RLS keyed on `auth.uid() = user_id`; never disable in
  production; new tables/edge functions must follow this pattern.
- **Type-safety strategy**: `tsconfig.json` is intentionally non-strict (`noImplicitAny: false`,
  `strictNullChecks: false`); safety is enforced via Zod at runtime instead. Don't "fix"
  type-safety debt by flipping strict mode — fix by adding Zod schemas and precise types
  incrementally (Phase 1).
- **CI gate**: `.github/workflows/ci.yml` blocks unit/E2E/build jobs on `npm run lint` passing
  first — currently red; this blocks all other CI signal until Phase 1 closes it.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Treat the 27 PRD user stories (Epics 1-12) as a shipped baseline, not re-planned work | File-by-file codebase verification confirms every one is implemented and in production (v8.0.0) | ✓ Good |
| Sequence Phase 1 as code quality/CI health, ahead of new UX polish | `npm run lint` currently fails CI's blocking gate; a broken safety net makes every later phase riskier | — Pending |
| Defer i18n (PRD v9.0.0) and premium/monetization features (PRD v10.0.0) to v2 | Large, speculative scope; no business model or international-demand signal validated yet; the team has instead prioritized import, gamification, and security work since the PRD was written | — Pending |

---
*Last updated: 2026-08-15 after initial GSD roadmap ingest (brownfield)*
