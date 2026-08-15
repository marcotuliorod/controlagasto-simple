# Project State

Living snapshot of where the project stands. Update at the end of any session that ships a change — this is what the next session (human or agent) reads first to avoid re-discovering context.

## Current focus
_(nothing tracked yet — update after the next piece of work)_

## Recently shipped
- Fixed billing-cycle timezone bug (`getDateBillingCycle`/`formatDateRange` in `src/lib/dateRange.ts` no longer parse `YYYY-MM-DD` strings through UTC — was misclassifying a date landing exactly on the cycle day into the previous cycle in negative-UTC-offset zones). Removed the orphaned, unused `src/lib/dateRangeTimezone.ts`.
- Fixed PDF export stripping all accented Portuguese characters (`supabase/functions/export-pdf/index.ts` `escapeText` was removing `\x7F-\xFF`, which is the WinAnsiEncoding range covering á/ç/ã/é/etc — now only strips true control chars).
- Wired up the test scripts (`test`, `test:ui`, `test:e2e*`) that `CLAUDE.md` already documented but `package.json` was missing; scoped Vitest to unit tests only (`e2e/**` was being picked up and false-failing); added `src/test/setup.ts` for shared PWA/serviceWorker/matchMedia/PushManager mocks; fixed several pre-existing test-authoring bugs (Vitest mock hoisting, stale UI text assertions, missing `#root` in jsdom). Full unit suite (97 tests) now passes.
- Applied `npm audit fix` (27 → 7 vulnerabilities; remaining are dev-only tooling, `xlsx` with no upstream fix, and one `react-router` moderate issue needing a breaking major bump — not applied without confirmation).

## Known open items
- `xlsx` (prod dependency) has a high-severity prototype pollution/ReDoS advisory with no upstream fix available. No action taken; revisit if a patched release ships or the app starts processing untrusted spreadsheet input more broadly.
- `react-router`/`react-router-dom` has a moderate open-redirect/SSR-hydration advisory with fix only available via a major version bump (breaking change) — deferred pending a decision to take that upgrade.
- ~97 ESLint errors remain (mostly `@typescript-eslint/no-explicit-any` in `src/` and `supabase/functions/`) — cosmetic, tracked as Rotina-tier backlog per `docs/WORKFLOW.md`, not addressed in this pass.

## Notes for next session
_(none yet)_
