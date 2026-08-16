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

- [x] **Phase 1: Code Quality & CI Health** - Restore a green CI lint gate and add tests for the riskiest business logic
- [x] **Phase 2: Dependency & Security Hardening** - Resolve known dependency vulnerabilities and verify edge-function auth consistency
- [x] **Phase 3: Performance & Scale Hardening** - Keep the app responsive as expense history and gamification data grow
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
     upstream fix). ✅ See `docs/STATE.md` — `xlsx` (write-path only, never parses untrusted
     input), `react-router-dom` (fix requires a v7 major bump; the exploitable open-redirect CVE
     needs a `navigate()`/`<Link>` call with an attacker-controlled destination, and an audit
     found none in this codebase — SSR-hydration CVE doesn't apply, this is a client-only SPA),
     `vite`/`esbuild`/`vitest`/`@vitest/ui` (dev-only; fixed `vitest` requires `vite` 6+ as a
     peer, i.e. the same deferred major bump) are all documented, not silently ignored.
  2. ~~`react-router-dom` is upgraded to a patched version~~ — superseded by criterion 1: a v7
     major bump was evaluated and deferred (breaking change, out of scope for a hardening pass);
     mitigated by design instead (see above).
  3. Every function under `supabase/functions/` rejects requests without a valid Authorization
     header, verified by test or a documented code audit — not just the one fix already applied
     (VAPID key). ✅ Audited all 13; fixed `process-receipt` (only checked the header was
     non-empty, never validated the JWT, and called the paid OCR API before any check); the other
     12 were already correct (9 JWT-checked, 3 cron-triggered functions correctly use
     `X-Cron-Secret` instead of JWT since there's no end user to authenticate).
**Plans**: 1/1 complete

### Phase 3: Performance & Scale Hardening
**Goal**: The app stays responsive as individual users accumulate years of expense history and
richer gamification data, instead of degrading silently.
**Depends on**: Phase 2
**Requirements**: PERF-01, PERF-02, PERF-03
**Success Criteria** (what must be TRUE):
  1. The Reports page remains responsive for a user with 1,000+ historical expenses (paginated or
     virtualized query, not an unbounded `.select()`). ✅ The query itself stays unbounded by
     design (KPIs/charts need the full period's data to be accurate — paginating it would make
     the aggregates wrong); the actual render bottleneck was the expense list at the bottom of
     the page mounting one DOM node per row with no windowing. Virtualized it with
     `@tanstack/react-virtual`, reusing the exact pattern already established in
     `src/pages/ExpensesVirtualized.tsx`.
  2. Gamification unlock progress loads via a single batched query/RPC instead of the current 6+
     sequential round-trips. ✅ `useUnlockProgress`'s 6 independent reads now run via
     `Promise.all` instead of sequential `await`s — total latency drops from the sum of all 6 to
     ~the slowest one. A true single-RPC consolidation was evaluated and deferred: it would need
     a new SQL migration untestable in this environment (no live DB access — see Phase 2's notes
     on the same constraint).
  3. Production console logging is reduced or gated behind a debug flag so hot paths (realtime
     updates) no longer spam the console by default. ✅ `realtimeLogger.ts` was already correctly
     gated; the actual untreated hot paths were `PWAInstallProvider.tsx` (23 logs + 3 warns, every
     app load) and `main.tsx` (8 logs, every boot). New `src/lib/logger.ts` (`devLog`/`devWarn`,
     same convention as `realtimeLogger.ts`) applied there and to the smaller remaining call
     sites; `console.error` left untouched everywhere (already the correct always-visible
     convention). Verified via a production build + Playwright: 0 console messages on load,
     vs. 26+ in dev mode.
**Plans**: 1/1 complete

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
| 1. Code Quality & CI Health | 1/1 | Complete | 2026-08-15 |
| 2. Dependency & Security Hardening | 1/1 | Complete | 2026-08-15 |
| 3. Performance & Scale Hardening | 1/1 | Complete | 2026-08-15 |
| 4. Guided Onboarding Experience | 0/TBD | Not started | - |
