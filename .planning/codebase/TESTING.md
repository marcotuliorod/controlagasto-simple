# Testing Patterns

**Analysis Date:** 2026-09-17

## Test Framework

**Runner (Unit):**
- Vitest, configured inline in `vite.config.ts` under the `test:` block (no separate `vitest.config.ts` file)
- `setupFiles: ['./src/test/setup.ts']` — jsdom baseline mocks (see below)
- Deno tests also exist for edge functions (`supabase/functions/*`) run via `deno test`, which does not use the jsdom setup — the two suites are separate and not interchangeable; a comment in `vite.config.ts` explicitly notes neither Vitest nor Deno's runner works with the other's setup.

**Runner (E2E):**
- Playwright, configured in `playwright.config.ts`
- `testDir: './e2e'`, `baseURL: 'http://localhost:8080'` (must match `vite.config.ts` dev server port)
- Reporters: HTML (`artifacts/e2e/report`), JSON (`artifacts/e2e/results.json`), list

**Assertion Library:**
- Vitest's built-in `expect` (Jest-compatible API) for unit tests
- Playwright's built-in `expect` for E2E

**Run Commands:**
```bash
npm test                # Vitest watch mode
npm run test -- --run   # Vitest run once (CI mode)
npm run test:ui         # Vitest UI

npm run test:e2e        # Playwright, headless
npm run test:e2e:headed # Playwright, browser visible
npm run test:e2e:ui     # Playwright UI
npm run test:e2e:debug  # Playwright debug mode
npx playwright test e2e/auth.spec.ts   # single file
```

## Test File Organization

**Unit tests — co-located with source, `.test.ts`/`.test.tsx` suffix.** Examples found in repo:
- `src/main.test.tsx`
- `src/providers/PWAInstallProvider.test.tsx`
- `src/components/FirstVisitTip.test.tsx`
- `src/components/InstallPWA.test.tsx`
- `src/components/PushOnboarding.test.tsx`
- `src/pages/Settings.pwa.test.tsx`
- `src/hooks/useMemoryLeak.test.ts`
- `src/hooks/useAutoTheme.test.ts`
- `src/hooks/useImportTransactions.test.ts`
- `src/hooks/usePushNotifications.test.ts`
- `src/hooks/useBillingCycle.test.ts`
- `src/hooks/useExpensesRealtime.test.ts`
- `src/lib/pushUtils.test.ts`
- `src/lib/amountUtils.test.ts`
- `src/lib/bankPatterns.test.ts`
- `src/lib/pwaUtils.test.ts`
- `src/lib/currencyUtils.test.ts`
- `src/lib/dateRange.test.ts`

**Setup file:** `src/test/setup.ts` — provides jsdom polyfills for `navigator.serviceWorker`, `window.matchMedia`, and `window.PushManager` since jsdom doesn't implement PWA-related browser APIs. Individual test files may still override `navigator`/`matchMedia` for scenario-specific behavior (e.g. simulating iOS).

**E2E — flat directory, `.spec.ts` suffix in `/e2e`:**
```
e2e/
├── auth.setup.ts             # Playwright "setup" project — NOT a test suite
├── auth.spec.ts
├── expense-crud.spec.ts
├── export-pdf.spec.ts
├── import-transactions.spec.ts
├── insights.spec.ts
├── recurring-expenses.spec.ts
├── reports-cycle.spec.ts
├── scheduled-exports.spec.ts
└── fixtures/
    └── test-data.ts
```

## `auth.setup.ts` — not a spec, a dependency of every other spec

`e2e/auth.setup.ts` is registered in `playwright.config.ts` as the Playwright **`setup` project** (`testMatch: /.*\.setup\.ts/`), not matched by the default `*.spec.ts` pattern. It:
- Creates the test account
- Writes authenticated `storageState` to `artifacts/e2e/.auth/user.json`
- Is a declared dependency of the browser projects in `playwright.config.ts`, so every other spec project depends on it running first

If `auth.setup.ts` fails or is skipped, all downstream specs fail with "state inexistente" (no session) rather than their own logic being wrong — check this file first when the whole E2E suite goes red at once.

## Current E2E Suite (verified 2026-09-17)

There is **no manual expense-creation E2E test**. That coverage was removed when manual expense entry was removed from the app (see CLAUDE.md: gastos only enter via statement/invoice import). Current specs:

1. `auth.spec.ts` — authentication flow
2. `expense-crud.spec.ts` — expense list & edit only (not creation — its own comment used to claim creation was "covered in import-transactions", which per `import-transactions.spec.ts`'s own header comment was inaccurate until that spec was written)
3. `reports-cycle.spec.ts` — reports respecting billing cycle
4. `export-pdf.spec.ts` — PDF/CSV/XLSX export
5. `insights.spec.ts` — AI insights
6. `scheduled-exports.spec.ts` — scheduled data exports
7. `recurring-expenses.spec.ts` — recurring expenses
8. `import-transactions.spec.ts` — **the only expense-entry-path E2E test**

**`import-transactions.spec.ts` scope (verified by reading its header comment, 2026-09-17):** covers **CSV only** — the deterministic path (CSV/OFX parsed by rule in `process-import-file`, no AI call). It explicitly does **not** cover PDF import: PDF with an unrecognized layout falls through to the AI service, which would require `AI_SERVICE_URL` to be live in CI, so PDF stays untested by this spec on purpose (kept hermetic — runs against the local Supabase stack in CI with no `AI_SERVICE_URL` and no provider key at all). The comment block also notes the file's second scoped assertion: the flow correctly rejects unsupported file formats. When touching `components/import/*` or `supabase/functions/_shared/statementParser.ts`, remember the PDF path has zero E2E protection.

## Test Structure

**Unit — describe/it/expect, Vitest hoisted mocks:**
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useExpensesRealtime } from './useExpensesRealtime';

const { channelMock } = vi.hoisted(() => ({
  channelMock: {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    unsubscribe: vi.fn(),
  },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: vi.fn(() => channelMock),
    removeChannel: vi.fn(),
  },
}));

describe('Memory Leak Prevention Tests', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  describe('useExpensesRealtime - Cleanup', () => {
    it('should cleanup realtime subscription on unmount', () => {
      const { unmount } = renderHook(() =>
        useExpensesRealtime({ channelName: 'test-channel', onUpdate: vi.fn() })
      );
      unmount();
    });
  });
});
```
Note: some existing assertions in `src/hooks/useMemoryLeak.test.ts` are placeholder-style (`expect(true).toBe(true)`) pending real cleanup verification — don't copy that pattern for new tests; assert on the actual spy/mock call instead.

**Pure function tests — simple input/output tables:**
```typescript
import { describe, it, expect } from 'vitest';
import { sumAmounts, formatCurrency } from './amountUtils';

describe('sumAmounts', () => {
  it('should sum numeric values', () => {
    expect(sumAmounts([10, 20, 30])).toBe(60);
  });
  it('should handle string amounts', () => {
    expect(sumAmounts(["10.50", "5.25"])).toBe(15.75);
  });
  it('should ignore null/undefined', () => {
    expect(sumAmounts([10, null, 5, undefined])).toBe(15);
  });
});
```

## Mocking

**Framework:** Vitest's `vi.mock()` / `vi.fn()` / `vi.hoisted()`

**What to mock:**
- Supabase client (`@/integrations/supabase/client`) — always mocked in unit tests that touch data access or realtime channels
- Browser/PWA APIs not implemented in jsdom (`navigator.serviceWorker`, `window.matchMedia`, `window.PushManager`) — baseline mocks live in `src/test/setup.ts`; override per-test for scenario-specific behavior (e.g., simulating iOS Safari)

**What NOT to mock:**
- Pure utility functions (`currencyUtils`, `amountUtils`, `dateRange`) — tested directly with real inputs/outputs, no mocking needed

## AI Service Testing (`services/ai/`)

- Domain logic is tested against `providers/fake.ts`, a fake `LLMProvider` implementation — the entire domain runs with no network access and no API key required. When adding a capability under `domain/`, write its test against the fake provider, not a real provider adapter.

## Coverage

**Requirements:** No enforced coverage threshold detected (no `coverage.thresholds` config found).

## Test Types

**Unit Tests:** Hooks, utilities, and PWA-related components/providers — the large majority of `src/**/*.test.ts(x)` files target `src/hooks/` and `src/lib/`.

**Integration Tests:** Not present as a distinct category — Supabase interactions are unit-tested with a mocked client rather than against a real local Supabase stack in Vitest.

**E2E Tests:** Playwright, `/e2e/*.spec.ts`, described above. Uses Page Object–adjacent patterns via shared fixtures in `e2e/fixtures/test-data.ts`; always call `waitForPageLoad(page)` after navigation; prefer `page.getByRole()` for accessibility-first selectors; use 15s timeout for navigation assertions.

## Linting as a Test Gate

`npm run lint` currently passes with **0 errors, 17 warnings** (verified 2026-09-17) — see `.planning/codebase/CONVENTIONS.md` for the full warning list. Lint is not currently a hard 0-warnings gate; a PR that adds a new warning in an unrelated file should still be flagged, but the 17 pre-existing warnings are known and accepted.

---

*Testing analysis: 2026-09-17*
