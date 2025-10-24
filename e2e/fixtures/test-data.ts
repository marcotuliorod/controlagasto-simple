/**
 * Test data fixtures for E2E tests
 */

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

export const TEST_CATEGORIES = {
  alimentacao: { name: 'Alimentação', icon: '🍔' },
  transporte: { name: 'Transporte', icon: '🚗' },
  saude: { name: 'Saúde', icon: '💊' },
  educacao: { name: 'Educação', icon: '📚' },
};

export const TEST_ACCOUNT = {
  name: 'Conta Teste',
  type: 'checking',
  icon: '🏦',
  color: '#3b82f6',
  initialBalance: 1000,
};

/**
 * Wait for navigation and loading states
 */
export async function waitForPageLoad(page: any) {
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
}

/**
 * Generate unique test email
 */
export function generateTestEmail(): string {
  return `e2e-test-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`;
}

/**
 * Format currency for assertions
 */
export function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}
