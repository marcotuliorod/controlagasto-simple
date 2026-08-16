# Project State

Living snapshot of where the project stands. Update at the end of any session that ships a change — this is what the next session (human or agent) reads first to avoid re-discovering context.

## Current focus
`.planning/ROADMAP.md` Phase 1 (Code Quality & CI Health) is done. Next up per the roadmap: Phase 2 (Dependency & Security Hardening — SEC-01, SEC-02).

## Recently shipped
- **Phase 1 (QUAL-01/02/03) complete.** `npm run lint` errors: 97 → 0 (all 76 `@typescript-eslint/no-explicit-any` replaced with real types/`unknown`/narrow justified casts, not suppressed; plus 21 mechanical fixes — `no-useless-escape`, `prefer-const`, `no-empty-object-type`, `no-control-regex`, `no-require-imports`). Along the way found and fixed a real bug: `Reports.tsx`'s XLSX export always wrote an empty `notes` column because the query never selected it. New unit test coverage: `useBillingCycle.test.ts` (6 tests), `src/lib/bankPatterns.test.ts` (18 tests — this is where bank-format detection actually lives, not in the hook), `useImportTransactions.test.ts` (7 tests). Full suite: 128/128 passing across 16 files.
- Fixed billing-cycle timezone bug (`getDateBillingCycle`/`formatDateRange` in `src/lib/dateRange.ts` no longer parse `YYYY-MM-DD` strings through UTC — was misclassifying a date landing exactly on the cycle day into the previous cycle in negative-UTC-offset zones). Removed the orphaned, unused `src/lib/dateRangeTimezone.ts`.
- Fixed PDF export stripping all accented Portuguese characters (`supabase/functions/export-pdf/index.ts` `escapeText` was removing `\x7F-\xFF`, which is the WinAnsiEncoding range covering á/ç/ã/é/etc — now only strips true control chars).
- Wired up the test scripts (`test`, `test:ui`, `test:e2e*`) that `CLAUDE.md` already documented but `package.json` was missing; scoped Vitest to unit tests only (`e2e/**` and, later, `.claude/**`/`.agents/**`/`.planning/**` vendored-tooling test fixtures were being picked up and false-failing); added `src/test/setup.ts` for shared PWA/serviceWorker/matchMedia/PushManager mocks; fixed several pre-existing test-authoring bugs (Vitest mock hoisting, stale UI text assertions, missing `#root` in jsdom).
- Applied `npm audit fix` (27 → 7 vulnerabilities; remaining are dev-only tooling, `xlsx` with no upstream fix, and one `react-router` moderate issue needing a breaking major bump — not applied without confirmation).
- Installed `gsd-core` (project planning/phase-loop tooling) and the `caveman` skill (output compression) under `.claude/`/`.agents/`; ran onboarding (`/gsd-map-codebase` → `/gsd-ingest-docs` → `gsd-roadmapper`) producing `.planning/codebase/*`, `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`. `eslint.config.js` and `vite.config.ts` both needed a `.claude`/`.agents`/`.planning` exclude added afterward — the vendored tooling's own files/tests were otherwise getting swept into this project's lint and test runs (lint briefly went 97→537; a caveman test fixture briefly broke `npx vitest --run`).

## Known open items
- `xlsx` (prod dependency) has a high-severity prototype pollution/ReDoS advisory with no upstream fix available. No action taken; revisit if a patched release ships or the app starts processing untrusted spreadsheet input more broadly.
- `react-router`/`react-router-dom` has a moderate open-redirect/SSR-hydration advisory with fix only available via a major version bump (breaking change) — deferred pending a decision to take that upgrade. This is Phase 2 (SEC-01) territory now.
- 17 ESLint warnings remain (`react-hooks/exhaustive-deps`, `react-refresh/only-export-components`) — don't block `npm run lint`, left as-is, out of scope for Phase 1.
- `docs/STATE.md` (this file, hand-written) and `.planning/STATE.md`/`.planning/ROADMAP.md` (gsd-core-generated) now both exist and overlap in purpose — not yet consolidated into one source of truth for "what's left to do."

## Notes for next session
Phase 2 (Dependency & Security Hardening) is next: resolve/mitigate the `xlsx` and `react-router-dom` findings (SEC-01), and audit every `supabase/functions/*` edge function for consistent Authorization-header validation, not just the VAPID-key fix already applied (SEC-02). See `.planning/ROADMAP.md` for full success criteria.
