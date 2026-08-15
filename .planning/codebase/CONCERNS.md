# Codebase Concerns

**Analysis Date:** 2026-08-15

## Tech Debt

### TypeScript Type Safety Gaps
- Issue: 81 instances of `as any` type assertions scattered across codebase, bypassing type safety
- Files: `src/hooks/useGamification.ts`, `src/pages/Reports.tsx`, `src/pages/Accounts.tsx`, `src/components/AccountForm.tsx`, `src/components/CategoryGoalsManager.tsx`, `src/providers/PWAInstallProvider.tsx`
- Impact: Errors in database queries, React component prop handling, and API responses won't be caught at compile time; refactoring becomes risky
- Fix approach: Gradually replace with proper TypeScript types; leverage `src/integrations/supabase/types.ts` for database queries; use Zod for runtime validation on API responses
- Priority: High (affects reliability)

### 114 ESLint Problems (97 errors, 17 warnings)
- Issue: Mostly `@typescript-eslint/no-explicit-any` (~80 errors) and `prefer-const`/`no-useless-escape` (a handful); documented as "Rotina-tier backlog" in `docs/STATE.md`
- Files: Distributed across `src/` and `supabase/functions/`
- Note: `eslint.config.js` did not exclude `.claude/`/`.agents/`/`.planning/` — right after installing gsd-core and the caveman skill, `npm run lint` briefly reported 537 problems because it was also linting gsd-core's own vendored `.cjs` files (which reference an `n/no-process-exit` rule this project doesn't have configured). Fixed by adding those paths to `eslint.config.js`'s `ignores`; the number above is the real, current count against project code only.
- Impact: Code quality debt; makes refactoring and audits harder; inconsistent with stated project standards
- Fix approach: Run `npm run lint -- --fix` for auto-fixable violations; manually address `any` types in phases
- Priority: Medium (cosmetic, but affects maintainability)

### Large Monolithic Files
- Issue: Several files exceed 400+ lines, combining business logic, state management, and UI rendering in single components
- Files: 
  - `src/hooks/useGamification.ts` (549 lines) - Complex gamification state and calculations
  - `src/pages/Reports.tsx` (520 lines) - Report generation, filtering, and export logic
  - `src/pages/Dashboard.tsx` (485 lines) - Multiple widgets and real-time updates
  - `src/pages/AccountProfile.tsx` (447 lines) - Account details, transfers, settings
  - `src/pages/AddExpense.tsx` (444 lines) - Form, validation, categorization, receipt OCR
  - `src/hooks/useImportTransactions.ts` (308 lines) - CSV parsing, bank detection, duplicate detection
- Impact: Difficult to test in isolation; high cognitive load for developers; increased bug surface area; difficult to debug
- Fix approach: Extract hooks, utility functions, and sub-components; move business logic to utility modules; consider separating concerns (UI vs. data)
- Priority: Medium (refactoring work)

### 246 Console Logging Statements
- Issue: Excessive `console.log()`, `console.warn()`, `console.error()` calls (126 errors alone) throughout codebase
- Files: Distributed across `src/` and `supabase/functions/`
- Impact: Console spam in production (if not stripped); possible performance impact on logging-heavy operations; security concern if sensitive data logged
- Fix approach: Replace with structured logging service; add log levels; strip/disable in production builds
- Priority: Medium (quality of life)

---

## Known Bugs

### Billing Cycle Edge Cases
- Status: **RECENTLY FIXED** (per `docs/STATE.md`)
- What was fixed: `getDateBillingCycle`/`formatDateRange` in `src/lib/dateRange.ts` no longer parse `YYYY-MM-DD` strings through UTC timezone, which was misclassifying dates landing exactly on the cycle day into the previous cycle in negative-UTC-offset zones
- Files: `src/lib/dateRange.ts` (fixed), `src/hooks/useBillingCycle.ts`
- Remaining risk: Test with different timezones and cycle days (1-28) to verify edge cases remain resolved
- Workaround: N/A (fixed)

### PDF Export Character Encoding
- Status: **RECENTLY FIXED** (per `docs/STATE.md`)
- What was fixed: `supabase/functions/export-pdf/index.ts` `escapeText()` was stripping accented Portuguese characters (á/ç/ã/é) by removing `\x7F-\xFF` range; now only strips true control characters
- Files: `supabase/functions/export-pdf/index.ts` (line 32)
- Remaining risk: Test with full Portuguese character set; verify WinAnsiEncoding coverage
- Workaround: N/A (fixed)

---

## Security Considerations

### Dependency Vulnerabilities (7 Critical/High/Moderate)

**xlsx (High Severity)**
- Risk: Prototype Pollution and Regular Expression Denial of Service (ReDoS)
- CVEs: GHSA-4r6h-8v6p-xvw6, GHSA-5pgg-2g8v-p4x9
- Files: `package.json` (line 88)
- Current impact: Risk applies if untrusted spreadsheet input processed broadly
- Mitigation: Currently none; no upstream fix available
- Recommendation: Monitor for patched release; validate/sanitize file uploads; consider sandboxing file parsing

**react-router-dom (Moderate Severity)**
- Risk: Open redirect and SSR hydration vulnerabilities
- Files: `package.json` (line 73: `^6.30.1`)
- Current version: 6.30.1 is outdated; vulnerabilities fixed in major bump (breaking changes)
- Mitigation: None currently applied; documented in `docs/STATE.md` as deferred
- Recommendation: Plan major version upgrade path; validate all `<Link>` and redirect destinations don't trust user input

**vitest / @vitest/ui (Critical Severity - Dev Only)**
- Risk: Arbitrary file read/execute when Vitest UI server listening
- Files: `package.json` (line 56: `@vitest/ui` v4.0.1)
- Current impact: Dev-only (UI server not exposed in production); affects local development security
- Mitigation: Use `npm audit fix` to patch (updates were available per `docs/STATE.md`)
- Recommendation: Run `npm audit` regularly; don't expose Vitest UI port to untrusted networks during development

### Authentication & Authorization

**VAPID Key Exposure Risk**
- Risk: VAPID keys stored in `vapid_keys` table; if compromised, could allow spoofed push notifications
- Files: `supabase/functions/get-vapid-public-key/index.ts`, push notification implementation
- Current mitigation: Keys are in Supabase (RLS policies should protect); edge function requires auth header verification
- Recommendation: Rotate VAPID keys periodically; verify auth header validation in all edge functions; consider key versioning

**Edge Function Auth Verification**
- Risk: Some edge functions check auth headers manually (e.g., `supabase/functions/process-receipt/index.ts` line 21-24)
- Files: All `supabase/functions/*/index.ts` files
- Current implementation: Pattern is `const authHeader = req.headers.get("Authorization")` then validate token
- Recommendation: Audit all edge functions for consistent auth token validation; consider using Supabase auth helpers

### Sensitive Data Logging

**Console Output in Edge Functions**
- Risk: `supabase/functions/` contain `console.log()` statements that may expose user data or API keys in production logs
- Files: `supabase/functions/process-receipt/index.ts`, `supabase/functions/export-pdf/index.ts`, `supabase/functions/process-import-file/index.ts`
- Current impact: Logs go to Supabase function logs (not exposed to client); but internal visibility only
- Recommendation: Remove or redact sensitive logs before production; use structured logging with PII filtering

---

## Performance Bottlenecks

### Large Query Results Without Pagination

**Reports Page Data Loading**
- Problem: `src/pages/Reports.tsx` loads all expenses in a date range without pagination/virtualization (line 77-83)
- Files: `src/pages/Reports.tsx`
- Cause: `.select()` with no `.range()` limit; potential OOM for users with years of transaction history
- Improvement: Add `.range(0, 1000)` pagination or `.select(..., { count: 'estimated' })` with lazy-load pattern
- Impact: Slow rendering, memory bloat, poor UX on mobile

**Gamification Hook Calculations**
- Problem: `src/hooks/useGamification.ts` `useUnlockProgress()` makes 6+ separate database queries sequentially (lines 148-180)
- Files: `src/hooks/useGamification.ts` (lines 140-220)
- Cause: No batching; N+1 query pattern (fetch content, then fetch categories, then fetch responses, etc.)
- Improvement: Combine into single `.select()` with joins; or use RPC function to batch server-side
- Impact: Slow unlock progression calculations; blocks UI while fetching

**Console Logging Volume**
- Problem: 246 console.log statements executed even in production; debug logging in hot paths (e.g., real-time updates)
- Files: `src/` and `supabase/functions/`
- Cause: No log level filtering; all logs execute regardless of environment
- Improvement: Replace with structured logger that respects `LOG_LEVEL` env var
- Impact: Reduced performance; bloated dev tools; security risk if PII logged

---

## Fragile Areas

### Real-time Subscription Cleanup
- **Files:** `src/hooks/useExpensesRealtime.ts` (lines 84-96)
- **Why fragile:** Relies on 100ms `setTimeout` delay to avoid "WebSocket is closed" errors; timing-dependent workaround rather than architectural fix
- **Documented issue:** Already noted in CLAUDE.md as a known pattern; if cleanup timing changes or network latency varies, could resurface
- **Safe modification:** Don't reduce the 100ms delay without testing unmount sequences; ensure all cleanup paths call this hook's cleanup
- **Test coverage:** `src/hooks/useExpensesRealtime.test.ts` and `src/hooks/useMemoryLeak.test.ts` cover this, but rely on mock behavior

### Gamification System (Recently Added)
- **Files:** `src/hooks/useGamification.ts` (549 lines), database tables (`unlock_requirements`, `user_unlocks`, `achievements`, etc.)
- **Why fragile:** New feature with multiple linked database tables; unlock conditions are JSON stored as `Record<string, unknown>` (no schema validation); complex business logic for progression
- **Risk:** Schema mismatches, invalid condition objects causing silent failures; missing categories/content causing cascading unlocks
- **Safe modification:** Add Zod schema for unlock conditions; validate education/quiz categories exist before saving; add comprehensive tests for edge cases (missing content, category changes)
- **Test coverage:** No unit tests found; E2E tests may exist but not isolated

### Bank Pattern Detection (1044-line edge function)
- **Files:** `supabase/functions/process-import-file/index.ts` (1044 lines)
- **Why fragile:** Giant regex pattern lists for bank/transaction classification (lines 20-96); hardcoded magic strings; no structured validation
- **Risk:** Missing bank patterns cause incorrect categorization; typos in regex silently don't match; classification changes break imports
- **Safe modification:** Extract patterns to configuration table; add test suite covering all banks; add logging/alerting for unclassified transactions
- **Test coverage:** No isolated tests; E2E test exists (`e2e/expense-crud.spec.ts` may import) but limited coverage

### Category Goals & Threshold Notifications
- **Files:** `src/hooks/useCategoryGoals.ts`, `supabase/functions/notify-goal-threshold/index.ts`
- **Why fragile:** Notification sent when `expense total >= goal`; no transaction atomicity; could send multiple notifications for same threshold
- **Risk:** Duplicate push notifications; incorrect calculations if timezone conversion fails
- **Safe modification:** Add idempotency key; store notification sent state; use database-level aggregate checks
- **Test coverage:** Basic tests present but edge cases (parallel requests, timezone boundaries) not covered

---

## Test Coverage Gaps

### Unit Test Coverage is Minimal
- **What's not tested:** Most business logic lives in hooks and pages with no unit tests
  - No tests for `useImportTransactions.ts` (308 lines)
  - No tests for `useBillingCycle.ts` (despite being critical per CLAUDE.md)
  - No tests for currency parsing/formatting utilities (despite noted Brazilian Real quirks)
  - Minimal tests for state management in large pages
- **Files:** Most `src/hooks/*.ts` and `src/pages/*.tsx`
- **Risk:** Refactoring breaks silently; edge cases in date calculations, currency handling not caught
- **Priority:** High (affects stability)

### E2E Test Coverage Gaps
- **What's covered:** Auth, expense CRUD, OCR, reports, PDF/Excel/XLSX export, insights, scheduled exports, recurring expenses, tags/notes (9 suites)
- **What's missing:**
  - No tests for multi-account workflows
  - No tests for transfer detection and exclusion from reports
  - No tests for billing cycle edge cases (cycle day transitions, timezone changes)
  - No tests for concurrent expense updates / real-time sync
  - Limited tests for error handling (network failures, quota exceeded)
- **Files:** `e2e/*.spec.ts`
- **Risk:** Complex workflows break without notice; billing cycle bugs go undetected
- **Priority:** High (production impact)

### Import/Classification Test Gaps
- **What's not tested:** Bank pattern detection; transaction classification (expense/income/transfer/investment/government); duplicate detection logic
- **Files:** `supabase/functions/process-import-file/index.ts` (1044 lines with complex regex and logic)
- **Risk:** Users import wrong bank's format → silent incorrect categorization
- **Priority:** High (data integrity)

---

## Dependencies at Risk

### Package Version Drift
- **Risk:** Several dependencies on `^` (caret) version constraints that allow minor/patch updates; could introduce breaking changes
- **Examples:**
  - `@supabase/supabase-js@^2.76.1` (supabase minor bumps can change API)
  - `react-router-dom@^6.30.1` (known vulnerabilities require major bump)
  - `recharts@^2.15.4` (chart component updates could break layouts)
- **Impact:** Unexpected behavior after `npm install` in CI/CD
- **Mitigation:** Use `package-lock.json` (committed) to pin transitive dependencies; lock critical packages with `~` instead of `^`
- **Recommendation:** Review top-level dependencies; consider lock file strategy

### Lovable AI API Dependency
- **Risk:** `supabase/functions/process-receipt/index.ts` and likely others depend on Lovable API (`https://ai.gateway.lovable.dev/`) which is external
- **Files:** `supabase/functions/process-receipt/index.ts` (line 34)
- **Impact:** Rate limits (429), credit exhaustion (402), outages silently fail
- **Current mitigation:** Error responses handled (lines 81-95); but user experience degrades
- **Recommendation:** Implement fallback OCR; add circuit breaker; cache results to reduce API calls; add monitoring for Lovable API health

---

## Architecture Concerns

### State Management Complexity
- **Issue:** Multiple sources of truth for derived state (billing cycles, category goals, unlock progress) calculated on-demand in hooks rather than centralized
- **Files:** `src/hooks/use*.ts` (30+ custom hooks with their own caching, invalidation logic)
- **Impact:** Hard to trace data flow; cache invalidation bugs; inconsistent behavior
- **Recommendation:** Consider React Context + useReducer or Zustand for critical shared state; document invalidation patterns

### Type Generation Mismatch
- **Issue:** `src/integrations/supabase/types.ts` (1203 lines) is auto-generated; if database schema changes without regeneration, types become stale
- **Files:** `src/integrations/supabase/types.ts`, database migrations
- **Impact:** `as any` casts become necessary when schema drifts; silent type errors
- **Recommendation:** Add pre-commit hook to verify types match schema; document regeneration process; CI should fail if types stale

---

## Recommendations Summary (Priority Order)

1. **Security:** Apply `npm audit fix`; upgrade `vitest` (critical dev-only); plan `react-router` major bump
2. **Reliability:** Add unit tests for `useImportTransactions`, `useBillingCycle`, currency utilities
3. **Type Safety:** Systematically replace 81 `as any` instances with proper types (phased approach)
4. **Performance:** Add pagination/virtualization to Reports; batch gamification queries; implement log levels
5. **Maintainability:** Split large files (Reports, Dashboard, AddExpense); extract business logic to utilities
6. **Fragile Areas:** Add validation schemas for gamification unlocks; document real-time cleanup assumptions; extract bank patterns to config

---

*Concerns audit: 2026-08-15*
*Data sources: npm lint (97 errors, 17 warnings — see note above), npm audit (7 vulnerabilities), file analysis, docs/STATE.md*
