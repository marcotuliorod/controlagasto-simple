# Testing Patterns

**Analysis Date:** 2026-08-15

## Test Framework

**Runner:**
- Vitest 4.0.1
- Config: `vite.config.ts` (no separate `vitest.config.ts`)
- Environment: jsdom (browser-like environment for unit tests)
- Globals: `true` (test functions auto-imported)
- Setup files: `./src/test/setup.ts` (provides baseline mocks)

**Assertion Library:**
- Vitest built-in expect (compatible with Jest)
- `@testing-library/react` for component testing
- `@testing-library/dom` for DOM queries
- `@testing-library/user-event` for user interactions

**Run Commands:**
```bash
npm test                # Run tests in watch mode
npm run test -- --run   # Run tests once (CI mode)
npm run test:ui         # Open Vitest UI
```

**E2E Test Runner:**
- Playwright 1.57.0
- Config: `/playwright.config.ts`
- Run commands:
  ```bash
  npm run test:e2e         # Run all E2E tests (headless)
  npm run test:e2e:headed  # Run with browser visible
  npm run test:e2e:ui      # Open Playwright UI
  npm run test:e2e:debug   # Debug mode
  ```

## Test File Organization

**Location:**
- **Unit tests:** Co-located with source files using `.test.ts` or `.test.tsx` suffix
  - Example: `src/hooks/useMemoryLeak.test.ts` (tests `useMemoryLeak.ts`)
  - Example: `src/providers/PWAInstallProvider.test.tsx` (tests `PWAInstallProvider.tsx`)
  
- **E2E tests:** Centralized in `/e2e/` directory with `.spec.ts` suffix
  - Example: `e2e/auth.spec.ts`
  - Example: `e2e/recurring-expenses.spec.ts`
  - Setup file: `e2e/auth.setup.ts` (pre-authentication for all tests)
  - Fixtures: `e2e/fixtures/test-data.ts` (shared test constants and helpers)

**Naming:**
- Unit test files: `{ComponentName}.test.tsx` or `{hookName}.test.ts`
- E2E test suites: `{feature}.spec.ts` (kebab-case feature name)
- Test functions: `test('should...')` or `it('should...', ...)` (both work with Vitest)

## Test Structure

**Suite Organization:**

Unit test example (from `PWAInstallProvider.test.tsx`):
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { waitFor } from '@testing-library/dom';

describe('PWAInstallProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock setup for each test
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        // ... mock implementation
      })),
    });
  });

  it('should provide initial state', () => {
    const { result } = renderHook(() => usePWAInstall(), {
      wrapper: PWAInstallProvider,
    });

    expect(result.current.canInstall).toBe(false);
    expect(result.current.isIOS).toBe(false);
  });

  it('should detect iOS', () => {
    // Override navigator for specific test scenario
    Object.defineProperty(window, 'navigator', {
      writable: true,
      value: {
        userAgent: 'iPhone',
        // ... mock navigator
      },
    });

    const { result } = renderHook(() => usePWAInstall(), {
      wrapper: PWAInstallProvider,
    });

    expect(result.current.isIOS).toBe(true);
  });

  describe('Nested describe blocks', () => {
    it('nested test case', () => {
      // Organized by feature/behavior
    });
  });
});
```

E2E test example (from `auth.spec.ts`):
```typescript
import { test, expect } from '@playwright/test';
import { generateTestEmail, waitForPageLoad } from './fixtures/test-data';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await waitForPageLoad(page);
  });

  test('should display auth page correctly', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /entenda seus gastos/i })).toBeVisible();
    await expect(page.getByPlaceholder('seu@email.com')).toBeVisible();
  });

  test('should sign up new user successfully', async ({ page }) => {
    const email = generateTestEmail();
    const password = 'TestPassword123!';

    await page.getByPlaceholder('seu@email.com').fill(email);
    await page.getByPlaceholder('Sua senha').fill(password);
    await page.getByRole('button', { name: /criar conta/i }).click();

    // Assert with timeout for async operations
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: /defina sua meta/i })).toBeVisible();
  });
});
```

## Mocking

**Framework:** Vitest's `vi` (similar to Jest)

**Patterns:**

Module mocking example (from `useMemoryLeak.test.ts`):
```typescript
const { channelMock } = vi.hoisted(() => ({
  channelMock: {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    unsubscribe: vi.fn(),
  },
}));

// Mock entire module
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: vi.fn(() => channelMock),
    removeChannel: vi.fn(),
  },
}));
```

Browser API mocking example (from `PWAInstallProvider.test.tsx`):
```typescript
// Mock navigator.serviceWorker
Object.defineProperty(window, 'navigator', {
  writable: true,
  value: {
    userAgent: 'Chrome',
    serviceWorker: {
      ready: Promise.resolve({}),
      getRegistration: vi.fn().mockResolvedValue(null),
    },
  },
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
});
```

Spy and mock hybrid example:
```typescript
const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
// ... run test ...
expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', handler);
```

Toast mock example (from `PWAInstallProvider.test.tsx`):
```typescript
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
  },
}));
```

## Coverage

**Requirements:** None enforced
- No coverage thresholds configured
- Coverage collection not enabled by default
- Coverage can be run manually if needed

## Test Types

**Unit Tests:**
- **Scope:** Individual hooks, utilities, components, and functions
- **Approach:** 
  - Hooks tested with `renderHook()` from `@testing-library/react`
  - Components tested with `@testing-library/react` render functions
  - Utilities tested by direct function calls
  - Mocks provided for external dependencies (Supabase, toast, browser APIs)
  - Browser APIs mocked in setup file at `src/test/setup.ts`

- **File locations:**
  - `src/hooks/*.test.ts` - Hook tests
  - `src/components/*.test.tsx` - Component tests
  - `src/lib/*.test.ts` - Utility tests (if any)
  - `src/providers/*.test.tsx` - Provider tests

**E2E Tests:**
- **Framework:** Playwright (browser automation)
- **Scope:** User workflows, authentication, feature flows
- **Approach:**
  - Page Object Model pattern used indirectly (shared fixtures in `e2e/fixtures/test-data.ts`)
  - Tests wait for navigation with `waitForPageLoad(page)`
  - Accessibility-first selectors: `page.getByRole()`, `page.getByPlaceholder()`
  - Retry logic: 2 retries on CI, 0 in local development
  - Artifacts collected on failure: screenshots, videos, traces

- **Test suites (9 total):**
  1. `auth.spec.ts` - Sign up, login, logout flows
  2. `expenses.spec.ts` - Expense CRUD operations
  3. `ocr-basic.spec.ts` - Receipt OCR processing
  4. `reports-cycle.spec.ts` - Reports with billing cycles
  5. `export-pdf.spec.ts` - PDF export functionality
  6. `export-excel.spec.ts` - Excel export functionality
  7. `insights.spec.ts` - AI insights feature
  8. `scheduled-exports.spec.ts` - Scheduled exports
  9. `recurring-expenses.spec.ts` - Recurring expense handling

## Common Patterns

**Async Testing (Unit):**

Hook testing with async data:
```typescript
// From PWAInstallProvider.test.tsx
it('should capture beforeinstallprompt event', async () => {
  const { result } = renderHook(() => usePWAInstall(), {
    wrapper: PWAInstallProvider,
  });

  const mockPromptEvent = {
    preventDefault: vi.fn(),
    prompt: vi.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({ outcome: 'accepted' as const }),
  };

  act(() => {
    window.dispatchEvent(
      Object.assign(new Event('beforeinstallprompt'), mockPromptEvent)
    );
  });

  // Wait for state update
  await waitFor(() => {
    expect(result.current.canInstall).toBe(true);
  });
});
```

**Async Testing (E2E):**

Navigation and loading assertions:
```typescript
// From auth.spec.ts
test('should sign up new user successfully', async ({ page }) => {
  // ... fill form ...
  await page.getByRole('button', { name: /criar conta/i }).click();

  // Wait with explicit timeout for slow operations
  await expect(page).toHaveURL(/\/onboarding/, { timeout: 15000 });
  
  // Assert element visibility after navigation
  await expect(page.getByRole('heading', { name: /defina sua meta/i })).toBeVisible();
});
```

**Pre-authentication in E2E:**

Setup file (from `auth.setup.ts`):
```typescript
setup('authenticate', async ({ page }) => {
  console.log('🔐 Setting up authentication...');
  
  await page.goto('/auth');
  await waitForPageLoad(page);

  // Attempt signup/login
  try {
    await page.getByPlaceholder('seu@email.com').fill(TEST_USER.email);
    // ... complete flow ...
    await page.context().storageState({ path: authFile });
  } catch (error) {
    console.log('⚠️ Signup failed, trying login...');
    // Fallback to login
  }
  
  console.log('✅ Authentication setup complete');
});
```

All E2E tests use this setup via Playwright's `authFile` configuration.

**Test Fixtures (E2E):**

Shared test data (from `e2e/fixtures/test-data.ts`):
```typescript
export const TEST_USER = {
  email: `test-${Date.now()}@example.com`,
  password: 'Test123456!',
  name: 'Test User',
  monthlyGoal: 5000,
  billingCycleDay: 5,
};

export const TEST_EXPENSE = {
  amount: '150.50',
  merchant: 'Supermercado Teste',
  date: new Date().toISOString().split('T')[0],
  notes: 'Compras mensais de teste',
  paymentMethod: 'Crédito',
};

// Helper functions
export async function waitForPageLoad(page: any) {
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
}

export function generateTestEmail(): string {
  return `e2e-test-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`;
}
```

**Setup File (Unit Tests):**

From `src/test/setup.ts` - provides baseline mocks for jsdom environment:
```typescript
import { vi } from 'vitest';

// Mock navigator.serviceWorker (PWA API)
if (!('serviceWorker' in navigator)) {
  Object.defineProperty(window.navigator, 'serviceWorker', {
    writable: true,
    configurable: true,
    value: {
      ready: Promise.resolve({}),
      getRegistration: vi.fn().mockResolvedValue(null),
    },
  });
}

// Mock matchMedia (media queries)
if (!('matchMedia' in window)) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
}

// Mock PushManager
if (!('PushManager' in window)) {
  Object.defineProperty(window, 'PushManager', {
    writable: true,
    configurable: true,
    value: function PushManager() {},
  });
}
```

**Assertion Patterns:**

Sync assertions:
```typescript
expect(result.current.canInstall).toBe(false);
expect(result.current.isIOS).toBe(true);
expect(addEventListenerSpy).toHaveBeenCalledWith('resize', handler);
expect(cleanupFn).toHaveBeenCalled();
```

Async assertions with waitFor:
```typescript
await waitFor(() => {
  expect(result.current.canInstall).toBe(true);
});
```

Playwright assertions with timeout:
```typescript
await expect(page).toHaveURL(/\/onboarding/, { timeout: 15000 });
await expect(page.getByRole('heading', { name: /defina sua meta/i })).toBeVisible();
```

---

*Testing analysis: 2026-08-15*
