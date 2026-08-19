import type { Page } from '@playwright/test';

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
export async function waitForPageLoad(page: Page) {
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

/**
 * Escolhe uma opção num Select do shadcn/Radix.
 *
 * Não é um <select> nativo, então `selectOption()` não funciona: é um botão
 * que abre um listbox em portal. Precisa clicar no gatilho e depois na opção.
 *
 * `triggerLabel` é o texto do <Label> ligado ao gatilho (ex: "Frequência");
 * `optionName`, o rótulo VISÍVEL da opção (ex: "Mensal", não o value "monthly").
 */
export async function selectRadixOption(
  page: Page,
  triggerLabel: string,
  optionName: string,
) {
  await page.getByLabel(triggerLabel, { exact: true }).click();
  await page.getByRole('option', { name: optionName, exact: true }).click();
}

/**
 * Aceita o `window.confirm()` nativo usado nas exclusões.
 *
 * O Playwright DISPENSA qualquer diálogo nativo por padrão quando não há
 * listener — então, sem isto, `confirm()` devolve false, a mutação de exclusão
 * nunca roda e o teste falha sem dizer por quê.
 *
 * Chamar ANTES da ação que dispara o diálogo.
 */
export function acceptNativeConfirm(page: Page) {
  page.once('dialog', (dialog) => dialog.accept());
}

/**
 * Sufixa um nome com um token único desta execução.
 *
 * Os specs compartilham UM usuário e UM banco — inclusive entre projetos: o CI
 * roda `--project=chromium --project="Mobile Chrome"`, e os dois consomem o
 * mesmo `storageState`. Sem o sufixo, a segunda passagem reencontra o registro
 * que a primeira deixou e `card(...).first()` resolve para o velho: o teste de
 * toggle achava "Pausado" onde esperava "Ativo", e só no Mobile Chrome.
 *
 * Vale também para rodar duas vezes seguidas sem recriar o banco local.
 */
export function uniqueLabel(base: string): string {
  return `${base} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
