# Testing Guide

## Overview
This project uses a comprehensive testing strategy with unit tests (Vitest) and E2E tests (Playwright).

## Unit Tests

### Running Tests
```bash
npm run test              # Run tests in watch mode
npm run test -- --run     # Run tests once
npm run test:ui           # Open Vitest UI
```

### Coverage
```bash
npm run test -- --coverage
```

### Writing Unit Tests
Location: `src/**/*.test.ts` or `src/**/*.test.tsx`

Example:
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

## E2E Tests (Playwright)

### Running E2E Tests
```bash
npm run test:e2e          # Run all E2E tests (headless)
npm run test:e2e:headed   # Run with browser visible
npm run test:e2e:ui       # Open Playwright UI
npm run test:e2e:debug    # Debug mode
```

### Test Files
Location: `e2e/*.spec.ts`

Available test suites:
- `auth.spec.ts` - Authentication flows
- `expense-crud.spec.ts` - Listagem, edição e exclusão (criação saiu com o lançamento manual)
- `reports-cycle.spec.ts` - Billing cycle reports
- `export-pdf.spec.ts` - PDF/CSV/XLSX export
- `insights.spec.ts` - Financial insights generation
- `recurring-expenses.spec.ts` - Despesas recorrentes
- `scheduled-exports.spec.ts` - Exportações agendadas
- `import-transactions.spec.ts` - Importação de CSV (única entrada de gasto)

`auth.setup.ts` não é suíte: é o projeto `setup`, que cria a conta e grava o
`storageState` compartilhado. A importação cobre só CSV — PDF depende do
serviço de IA no ar e ficou de fora de propósito.

### Writing E2E Tests

Example:
```typescript
import { test, expect } from '@playwright/test';
import { waitForPageLoad } from './fixtures/test-data';

test.use({ storageState: 'artifacts/e2e/.auth/user.json' });

test('deve abrir a edição de uma despesa', async ({ page }) => {
  await page.goto('/expenses');
  await waitForPageLoad(page);

  await page.getByRole('button', { name: /editar despesa/i }).first().click();
  await expect(page).toHaveURL(/\/expenses\/.+\/edit/, { timeout: 15000 });
});
```

Não há caminho de criação manual de despesa para testar: gasto entra só por
`/import-transactions`.

### Test Data
Location: `e2e/fixtures/test-data.ts`

Exports em uso (os fixtures de despesa saíram junto com o formulário manual):
```typescript
export const TEST_USER = { /* email, password, name, monthlyGoal, billingCycleDay */ };

export async function waitForPageLoad(page: Page)      // sempre após navegar
export function generateTestEmail(): string            // conta nova por execução
export async function selectRadixOption(...)           // Select do shadcn não é <select>
export function acceptNativeConfirm(page: Page)
export async function signUpAndOnboard(page: Page)     // cadastro + onboarding completo
export function uniqueLabel(base: string): string      // evita colisão entre projetos
```

`uniqueLabel` existe porque chromium e Mobile Chrome dividem um usuário e um
banco: nome fixo fazia a segunda execução esbarrar no registro da primeira.

## CI/CD Integration

### GitHub Actions
Tests run automatically on:
- Push to `main` or `develop`
- Pull requests to `main` or `develop`

Workflow: `.github/workflows/ci.yml`

### Running Quality Checks
```bash
npm run quality    # Run all quality checks (lint, typecheck, test)
npm run test:all   # Run unit + E2E tests
```

## Lighthouse CI

### Running Locally
```bash
npm run build
node scripts/lighthouse-ci.js
```

### Thresholds
- Performance: 90+
- Accessibility: 95+
- Best Practices: 90+
- SEO: 90+
- PWA: 80+

## Best Practices

### Unit Tests
- Test business logic and utilities
- Mock external dependencies (Supabase, APIs)
- Use `@testing-library/react` for component tests
- Keep tests fast and focused

### E2E Tests
- Test critical user journeys
- Use page objects for reusability
- Set up authentication state once
- Clean up test data after tests
- Use meaningful selectors (data-testid when needed)

### Coverage Goals
- Unit tests: >80% coverage
- E2E tests: Cover all critical flows
- Focus on edge cases and error handling

## Debugging

### Unit Tests
```bash
npm run test:ui  # Visual debugging
```

### E2E Tests
```bash
npm run test:e2e:debug  # Debug mode with browser
npx playwright show-report  # View HTML report
```

### CI Artifacts
When tests fail on CI:
- Check GitHub Actions artifacts
- Download test reports and screenshots
- Review trace files in Playwright report
