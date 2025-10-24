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
- `expense-crud.spec.ts` - Expense CRUD operations
- `ocr-basic.spec.ts` - OCR receipt processing
- `reports-cycle.spec.ts` - Billing cycle reports
- `export-pdf.spec.ts` - PDF export functionality
- `insights.spec.ts` - Financial insights generation

### Writing E2E Tests

Example:
```typescript
import { test, expect } from '@playwright/test';

test('should add expense', async ({ page }) => {
  await page.goto('/dashboard');
  await page.click('text=Adicionar Despesa');
  await page.fill('[name="description"]', 'Test Expense');
  await page.fill('[name="amount"]', '50.00');
  await page.click('button[type="submit"]');
  await expect(page.locator('text=Despesa adicionada')).toBeVisible();
});
```

### Test Data
Location: `e2e/fixtures/test-data.ts`

Contains reusable test data:
```typescript
export const TEST_USER = {
  email: 'test@example.com',
  password: 'Test123!@#'
};

export const TEST_EXPENSE = {
  description: 'Test Expense',
  amount: 50.00,
  category: 'Alimentação'
};
```

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
