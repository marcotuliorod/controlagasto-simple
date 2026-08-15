# Roadmap: Entenda Gastos

## Overview

Entenda Gastos is a production PWA (v8.0.0) that already delivers all 12 core epics — expense
tracking with AI receipt OCR, multi-account management, billing-cycle-aware budgets and goals,
reports and exports, push notifications, gamified financial education, an AI chat assistant and
proactive insights, global search, advanced filters, and LGPD-compliant audit/deletion — plus
additional work shipped since the source PRD was written (bank statement/PDF import, a progressive
gamification system, and a security hardening pass). This roadmap does not re-plan any of that;
see `.planning/PROJECT.md` (Requirements → Validated) and `.planning/REQUIREMENTS.md` for the full
shipped baseline and its verification.

What follows is the genuinely remaining work for this milestone: restoring a green CI pipeline and
a real test safety net, closing known dependency/security gaps, hardening performance for users
with years of expense history, and — once that foundation is solid — layering a guided onboarding
experience on top of what today is a single static setup form. Larger, speculative bets from the
PRD's own forward roadmap (internationalization, premium/monetization features) are deferred to v2
pending validated demand — see `.planning/REQUIREMENTS.md` (v2 Requirements / Out of Scope).

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3, 4): planned milestone work for this stabilization-and-polish cycle
- Decimal phases (N.1, N.2): urgent insertions (none yet)

- [ ] **Phase 1: Code Quality & CI Health** - Restore a green CI lint gate and add tests for the riskiest business logic
- [ ] **Phase 2: Dependency & Security Hardening** - Resolve known dependency vulnerabilities and verify edge-function auth consistency
- [ ] **Phase 3: Performance & Scale Hardening** - Keep the app responsive as expense history and gamification data grow
- [ ] **Phase 4: Guided Onboarding Experience** - Walk new users through setup and key features instead of a single static form

## Phase Details

### Phase 1: Code Quality & CI Health
**Goal**: The CI pipeline is green again and the app's riskiest business logic — billing-cycle
math, currency parsing, and bank-statement import — is protected by tests, so future phases build
on a real safety net instead of a red pipeline.
**Depends on**: Nothing (first phase)
**Requirements**: QUAL-01, QUAL-02, QUAL-03
**Success Criteria** (what must be TRUE):
  1. `npm run lint` completes with zero errors, so CI's `lint-and-typecheck` job (which currently
     fails and blocks every downstream job) passes.
  2. `useBillingCycle` and `useImportTransactions` each have unit tests covering the edge cases
     already documented in `.planning/codebase/CONCERNS.md` (cycle-day boundaries, timezone
     handling, bank-format detection) — note `dateRange.ts`/`currencyUtils.ts` already have tests;
     these two hooks are the actual gap.
  3. `as any` usage is measurably reduced in the hooks, pages, and shared modules with the highest
     counts, per the audit in `.planning/codebase/CONCERNS.md`.
**Plans**: TBD

### Phase 2: Dependency & Security Hardening
**Goal**: Production dependencies and edge functions are free of known high-severity risk, so the
app isn't carrying unaddressed vulnerabilities or inconsistent auth checks into further feature
work.
**Depends on**: Phase 1
**Requirements**: SEC-01, SEC-02
**Success Criteria** (what must be TRUE):
  1. `npm audit` reports zero unresolved high/critical vulnerabilities in production dependencies,
     or each remaining one has a documented mitigation decision (e.g. `xlsx` currently has no
     upstream fix).
  2. `react-router-dom` is upgraded to a patched version without regressing existing routes (full
     E2E suite still passes).
  3. Every function under `supabase/functions/` rejects requests without a valid Authorization
     header, verified by test or a documented code audit — not just the one fix already applied
     (VAPID key).
**Plans**: TBD

### Phase 3: Performance & Scale Hardening
**Goal**: The app stays responsive as individual users accumulate years of expense history and
richer gamification data, instead of degrading silently.
**Depends on**: Phase 2
**Requirements**: PERF-01, PERF-02, PERF-03
**Success Criteria** (what must be TRUE):
  1. The Reports page remains responsive for a user with 1,000+ historical expenses (paginated or
     virtualized query, not an unbounded `.select()`).
  2. Gamification unlock progress loads via a single batched query/RPC instead of the current 6+
     sequential round-trips.
  3. Production console logging is reduced or gated behind a debug flag so hot paths (realtime
     updates) no longer spam the console by default.
**Plans**: TBD

### Phase 4: Guided Onboarding Experience
**Goal**: A new user is guided through initial setup and discovers the app's key features, instead
of filling one static form and being dropped on the dashboard with no orientation.
**Depends on**: Phase 3
**Requirements**: ONBD-01, ONBD-02, ONBD-03
**Success Criteria** (what must be TRUE):
  1. A new user completes a multi-step onboarding wizard (goal → billing cycle → first account)
     before reaching the dashboard, replacing today's single-screen form.
  2. On a user's first visit to each major section (Dashboard, Reports, Accounts), a dismissible
     contextual tooltip explains the feature; it does not reappear after being dismissed.
  3. The theme switches automatically between dark and light based on time of day, while a manual
     override saved on the user's profile is always respected over the automatic choice.
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Code Quality & CI Health | 0/TBD | Not started | - |
| 2. Dependency & Security Hardening | 0/TBD | Not started | - |
| 3. Performance & Scale Hardening | 0/TBD | Not started | - |
| 4. Guided Onboarding Experience | 0/TBD | Not started | - |
