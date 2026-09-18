# Codebase Concerns

**Analysis Date:** 2026-09-17

## Tech Debt

**Inconsistent form-handling stack:**
- Issue: `CLAUDE.md`-documented stack is React Hook Form + Zod, but only `src/pages/AccountProfile.tsx` actually uses it (`src/schemas/profileSchema.ts`). `src/pages/RecurringExpenses.tsx` and `src/pages/EditExpense.tsx` use `useState` + native HTML `required` instead.
- Files: `src/pages/RecurringExpenses.tsx`, `src/pages/EditExpense.tsx`, `src/pages/AccountProfile.tsx`
- Impact: No compile-time or Zod-level validation on two forms that write financial data; validation logic is duplicated ad hoc per field.
- Fix approach: Extract shared Zod schemas for expense-edit and recurring-expense forms, port both to `react-hook-form` + `zodResolver`, matching the `AccountProfile.tsx` pattern.

**`/add-expense` kept alive only as a redirect shim:**
- Issue: Manual expense entry was fully removed (19/08/2026), but the route survives as `<Navigate to="/import-transactions" replace>` purely because the installed PWA shell and old bookmarks/links still point at it.
- Files: `src/App.tsx` (route definition)
- Impact: Minor — dead-code-adjacent route that must be remembered and not "cleaned up" by someone unaware of the PWA-shell reason.
- Fix approach: No action needed unless install-base evidence (analytics on hits to `/add-expense`) shows it's safe to retire; keep as documented in `CLAUDE.md`.

**`useUnlockProgress` still makes 6 separate round-trips:**
- Issue: `Promise.all` parallelized 6 independent Supabase reads (education progress, educational content, quiz responses, quiz questions, expense count, expense dates) instead of consolidating into one RPC, because the environment had no live Supabase DB access to test a new migration.
- Files: `src/hooks/useGamification.ts` (`useUnlockProgress`, ~603 lines total in file)
- Impact: Latency floor is one HTTP round-trip (down from the sum of 6), but still 6x the request count of a single RPC call; larger blast radius if any one query's RLS/schema changes.
- Fix approach: Author a single Postgres RPC that returns all 6 datasets in one call, test against a real Supabase instance, then swap the hook to call it.

**Large, monolithic page/hook files:**
- Issue: Several files mix data-fetching, business logic, and rendering in a single large module.
- Files: `src/hooks/useGamification.ts` (603 lines), `src/pages/Reports.tsx` (594 lines), `src/pages/Dashboard.tsx` (491 lines), `src/components/import/TransactionFilterTabs.tsx` (451 lines), `src/pages/AccountProfile.tsx` (447 lines), `src/pages/RecurringExpenses.tsx` (392 lines), `src/pages/ExpensesVirtualized.tsx` (370 lines), `src/hooks/useImportTransactions.ts` (364 lines)
- Impact: Harder to review changes safely, higher chance of regressions when touching unrelated logic in the same file, slower onboarding for new contributors.
- Fix approach: No action required today; if any of these files needs a substantial change, consider extracting sub-hooks/components first as a preparatory refactor.

**`expenses.receipt_url` / `expenses.source` / `receipts` storage bucket are vestigial:**
- Issue: The OCR-of-receipt feature was fully removed (19/08/2026, alongside manual expense entry), but its schema and storage footprint were deliberately left in place to preserve historical data for users who used it previously.
- Files: `supabase/migrations/*` (original OCR-era migrations), `delete-account` edge function (still purges the `receipts` bucket)
- Impact: None functionally — nothing writes to the bucket or those columns anymore — but it's schema debt that could confuse a future reader into thinking OCR is still live.
- Fix approach: Deliberately deferred; only revisit as an explicit, separate destructive-cleanup decision (per `docs/STATE.md`).

**Stale generated codebase snapshots (this file's own history):**
- Issue: Prior to this refresh, `.planning/codebase/STRUCTURE.md`, `ARCHITECTURE.md`, and `INTEGRATIONS.md` still described `supabase/functions/process-receipt/` as an existing edge function (14 functions, tree entry, listed as an integration) — it was deleted from the repo on 19/08/2026 and undeployed from production on 21/08/2026.
- Files: `.planning/codebase/STRUCTURE.md`, `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/INTEGRATIONS.md`
- Impact: A reader trusting those docs would look for a security risk in a file that no longer exists (this happened to this very CONCERNS.md before this refresh — it cited `process-receipt/index.ts:34`, which is stale and now removed from this document).
- Fix approach: Regenerate all `.planning/codebase/*` docs together (`/gsd-map-codebase`) rather than hand-patching individual stale facts.

## Known Bugs

**None currently open.** The two most recent product-affecting bugs — the UTF-8/accent corruption in imported files, and the Nubank statement/invoice layout not being recognized by the deterministic parser — were both fixed and merged. See "Deployment gap" below for the one bug whose *fix* still needs a production deploy step.

## Security Considerations

**Historically versioned `.env` credentials not yet rotated:**
- Risk: A `.env` file was committed in the past (commit `26f29d3`, removed in `bc5bee4`) and its values remain in git history forever unless rotated.
- Files: git history only (no live file); `src/integrations/supabase/client.ts` reads the equivalent values from environment at runtime
- Current mitigation: Content was audited (`git show <commit>:.env`) and confirmed to contain only `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL` — no service-role key, JWT secret, or AI provider key. The publishable key is designed by Supabase to ship in the client bundle; real protection is RLS, not key secrecy.
- Recommendations: Still worth rotating for hygiene (Supabase dashboard → Project Settings → API → regenerate publishable key, then update the deploy platform's env var and any local `.env`). Not an active exploitable leak — deprioritize relative to other work.

**Dependency vulnerabilities, each with a documented deferral, not fixed:**
- Risk: `npm audit` (run 2026-09-17) currently reports 9 advisories against production-relevant packages when scoped to `--omit=dev` (`postcss-selector-parser` DoS via AST recursion, `react-router`/`react-router-dom` open-redirect + SSR deserialization issues, `xlsx` prototype pollution + ReDoS with no upstream fix) plus additional dev-only findings (`js-yaml`, `vite`/`esbuild`/`vitest` chain) in the full unscoped audit (15 total, up from the 7 recorded in `docs/STATE.md`'s SEC-01 pass — the set has grown since that audit).
- Files: `package.json`, `package-lock.json`
- Current mitigation, per usage audit already done (`docs/STATE.md` "Dependency security decisions"): `xlsx` — only the write path (`json_to_sheet`/`writeFile`) is used in `src/lib/exportUtils.ts`; the vulnerable parse path (`XLSX.read`/`readFile`) is never called anywhere in the repo. `react-router-dom` — the open-redirect CVE requires attacker-controlled navigation targets; every `navigate()`/`<Link to={}>` call site was audited and none take destinations from user input. `vite`/`vitest`/`esbuild` — dev-server-only exposure, doesn't affect the production bundle.
- Recommendations: Re-run `npm audit` periodically (the set has grown from 7 → 9 production-relevant since the last documented pass) and re-verify the `xlsx`/`react-router` usage-based mitigations still hold before shipping any new code that reads untrusted spreadsheet input or takes navigation targets from user-controlled data. A `react-router` v7 and Vite major-version bump are the actual fixes; both are deliberately deferred, not forgotten.

**Edge function auth: audited clean as of the last full pass, verify on any new function:**
- Risk: An edge function that skips or weakens JWT verification before doing paid/sensitive work (the historical failure mode, see `process-receipt`, below).
- Files: all `supabase/functions/*/index.ts` (13 functions currently in `supabase/functions/`: `chat-assistant`, `check-category-variations`, `delete-account`, `export-data`, `export-pdf`, `generate-insights`, `get-vapid-public-key`, `notify-goal-threshold`, `process-import-file`, `process-recurring-expenses`, `process-scheduled-exports`, `send-push-notification`, plus `_shared/`)
- Current mitigation: Per `docs/STATE.md` SEC-02, all 13 were read end-to-end and confirmed correct: 9 user-facing functions properly check both `error` and `!user` from `supabase.auth.getUser(token)` before sensitive work; 3 cron-triggered functions (`notify-goal-threshold`, `process-recurring-expenses`, `process-scheduled-exports`) correctly use `X-Cron-Secret` instead of a JWT (no end user to authenticate); `send-push-notification` correctly accepts either mode.
- Historical gap (now resolved, not a live risk): `process-receipt` used to accept any non-empty `Authorization` header and call a paid OCR API before validating the token. That function's code was deleted from the repo 19/08/2026 and the deployed instance was explicitly deleted from Supabase on 21/08/2026 (confirmed via `supabase functions delete`, after verifying zero invocations in the preceding 24h and zero references in `src/`, `e2e/`, `services/`). It does not exist in the codebase or in production anymore — do not treat it as a live finding.
- Recommendations: Re-verify auth checks on any newly added edge function before merge (the pattern that failed once: checking header non-emptiness instead of calling `getUser()` and checking its result). `CLAUDE.md`'s documented auth-pattern snippet was also corrected at the same time this was fixed, reducing the chance of the same drift recurring.

**AI provider isolation is enforced by convention, not by a lint rule:**
- Risk: `services/ai/src/domain/` is meant to only import from `providers/types.ts`, never from a concrete provider adapter — this boundary is documented (`CLAUDE.md`, `services/ai/README.md`) but not mechanically enforced (no ESLint import-boundary rule).
- Files: `services/ai/src/domain/*`, `services/ai/src/providers/*`
- Current mitigation: Small, single-maintainer codebase; convention has held so far.
- Recommendations: If the AI service gains more contributors or providers, consider an ESLint `no-restricted-imports` rule scoping `domain/` to only import `providers/types.ts`.

## Performance Bottlenecks

**None currently outstanding as unaddressed.** `Reports.tsx`'s expense list was virtualized (`@tanstack/react-virtual`), `useUnlockProgress`'s 6 sequential reads became parallel (see Tech Debt above — still 6 round-trips, just no longer serial), and console logging was gated behind `import.meta.env.DEV` in the hot-path providers (`PWAInstallProvider.tsx`, `main.tsx`). The unbounded expense query in `Reports.tsx` is intentional (KPI totals and category breakdown need the full billing-cycle result set), not a bug.

## Fragile Areas

**PDF import layout parsing (`_shared/statementLayouts.ts` + `_shared/statementParser.ts`):**
- Files: `supabase/functions/_shared/statementLayouts.ts`, `supabase/functions/_shared/statementParser.ts`, `supabase/functions/_shared/bankPatterns.ts` (equivalent logic also lives client-side in `src/lib/bankPatterns.ts`)
- Why fragile: Only Nubank's two layouts (account statement and card invoice) are validated against real user documents (via checksum against the totals printed on the documents themselves, added 21/08/2026). Every other supported bank (BB, Itaú, Bradesco, Santander, Caixa, Inter, C6) is validated only against synthetic/fabricated PDF fixtures — the real-world hit rate for those banks is unverified. An unrecognized layout falls through to the AI provider, which is itself untested end-to-end in CI (no `AI_SERVICE_URL` in the test environment).
- Safe modification: Any change to the generic regex matching (`LOOKS_LIKE_TRANSACTION` or similar) must be re-verified against the Nubank fixtures in `_shared/fixtures/nubank-*.txt` (checksummed against real totals) to avoid silently breaking the one bank with real-world proof. Adding a new bank-specific layout should follow the same checksum-fixture pattern used for Nubank, not just a synthetic PDF.
- Test coverage: PDF import path has zero E2E coverage (`e2e/import-transactions.spec.ts` covers CSV only) — noted as an open, easy-to-close item in `docs/STATE.md` since 21/08/2026 (deterministic parsing removed the prior blocker of needing `AI_SERVICE_URL` live for the test).

**Duplicate-detection heuristic (`checkDuplicates()`):**
- Files: `src/hooks/useImportTransactions.ts` (or equivalent import hook — matches merchant by first 10 characters + date ±1 day + equal amount)
- Why fragile: A 10-character merchant-name prefix match is a heuristic, not an exact key; it already produced one documented false-positive during E2E test authoring (a uniqueness token embedded in a test merchant name caused every re-import to register as duplicate). It also silently absorbs the effect of the accent/encoding bug below — since `file_hash` alone can no longer be trusted for previously-imported accented files, this heuristic is the *only* remaining duplicate-catch for that edge case.
- Safe modification: Any change to merchant-name extraction (`extractMerchant()`) or the prefix length must be checked against both real bank fixtures and the E2E import spec, since the two are coupled (the merchant-extraction logic strips digit sequences 5+, and test tokens must avoid triggering that stripping).
- Test coverage: Covered by `e2e/import-transactions.spec.ts` and unit tests, but only for the CSV path.

## Scaling Limits

Not assessed in this pass — no reported production-scale data (user count, expense volume) was available to evaluate against. `Reports.tsx`'s list virtualization was explicitly built to handle 1,000+ expenses per user; no data suggests larger scale needs.

## Dependencies at Risk

**`xlsx` (SheetJS) — no upstream fix available:**
- Risk: High-severity prototype pollution and ReDoS advisories with no patched release from the maintainer.
- Impact: None currently exercised — only the write path is used (see Security Considerations above). Would become a real risk only if a future feature calls `XLSX.read`/`readFile` on user-uploaded or otherwise untrusted spreadsheet data.
- Migration plan: Re-audit before ever adding an `XLSX.read`/`readFile` call; if that becomes necessary, evaluate replacing `xlsx` with a maintained alternative (e.g. `exceljs`) rather than accepting the parse-path risk.

**`react-router-dom` v6 — fix only in v7 (major, breaking):**
- Risk: Open-redirect and SSR-hydration-deserialization CVEs; SSR one is inapplicable (client-only SPA, no SSR). Open-redirect requires attacker-controlled navigation targets, which the codebase's current call sites don't have.
- Impact: Low today; would need re-verification any time new `navigate()`/`<Link to={}>` call sites are added that take a destination from user input.
- Migration plan: Deferred major-version bump; revisit if a v7 migration gets scheduled for other reasons (v7 also brings API changes worth planning for separately).

**Vite / Vitest / esbuild toolchain — fix requires Vite 6+:**
- Risk: Dev-server-only DoS/moderate advisories (`esbuild`), `vitest@4.1.x`'s patched line requires `vite: ^6.0.0 || ^7.0.0 || ^8.0.0` as a peer, and the project is pinned to `vite@5.4.19`.
- Impact: Dev-server-only exposure (a malicious site can reach the local dev server while `npm run dev` is running); does not affect the production bundle.
- Migration plan: Deferred — a Vite major bump is a real migration project (config changes, plugin compatibility across the PWA plugin, path aliases, etc.), not a quick patch. Bump `vite`, `vitest`, `@vitest/ui`, and re-verify `esbuild`'s transitive resolution together in one pass.

## Missing Critical Features

**No manual "sign out of all devices" action:**
- Problem: Sign-out now correctly uses `scope: 'local'` (fixed to stop desktop logout from also logging out mobile), but there is consequently no way for a user to deliberately kill all sessions at once (e.g. leaked password, lost device) — the prior `scope: 'global'` behavior covered this by accident.
- Blocks: A legitimate "sign out everywhere" security action a user might need.

## Test Coverage Gaps

**PDF bank-statement import path has zero E2E coverage:**
- What's not tested: The entire PDF upload → parse → preview → confirm flow, for both the deterministic Nubank layouts and the AI-fallback path for unrecognized layouts.
- Files: `e2e/import-transactions.spec.ts` (CSV-only today), `supabase/functions/process-import-file/index.ts`, `supabase/functions/_shared/statementParser.ts`
- Risk: A regression in PDF parsing (deterministic or AI-fallback) would not be caught by CI; this is exactly the class of bug that already caused a full-product outage once (Nubank layout not recognized, 21/08/2026 incident) because import is the app's only entry point for expense data.
- Priority: High — flagged as newly-actionable (no longer blocked on `AI_SERVICE_URL` availability for the deterministic-layout case) but not yet done, per `docs/STATE.md`.

**Non-Nubank bank layouts validated only against synthetic fixtures:**
- What's not tested: BB, Itaú, Bradesco, Santander, Caixa, Inter, C6 statement/invoice parsing against real user documents.
- Files: `supabase/functions/_shared/bankPatterns.ts`, `supabase/functions/_shared/statementLayouts.ts`, `src/lib/bankPatterns.ts`
- Risk: Real-world PDFs from these banks may not match the synthetic fixtures' formatting closely enough, silently falling through to the (also-untested-in-CI) AI path or producing incorrect deterministic parses.
- Priority: Medium — no reported incidents yet for non-Nubank banks, but the Nubank incident shows this exact failure mode is real for this codebase.

**Interactive onboarding/theme flows verified only up to build/smoke-test level:**
- What's not tested: The 3-step onboarding wizard and auto-theme override, as an actual logged-in user click-through (blocked in the authoring environment by no live Supabase auth access).
- Files: `src/pages/Onboarding.tsx`, `src/hooks/useAutoTheme.ts`, `src/components/ThemeToggle.tsx`
- Risk: Low-to-medium — lint, typecheck, unit tests, and production build all pass, and 7 new unit tests were added, but no one has clicked through the full wizard as a real authenticated user since it shipped.
- Priority: Medium — worth a manual pass whenever credentials/DB access are available, per `docs/STATE.md`.

---

*Concerns audit: 2026-09-17*
