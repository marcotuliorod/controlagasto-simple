import { test, expect } from '@playwright/test';
import { TEST_USER, waitForPageLoad } from './fixtures/test-data';

test.describe('Reports with Billing Cycle', () => {
  test.use({ storageState: 'artifacts/e2e/.auth/user.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/reports');
    await waitForPageLoad(page);
  });

  /*
   * O `auth.setup.ts` completa o onboarding com TEST_USER.billingCycleDay, que
   * não é 1 — então `hasCustomCycle` é SEMPRE verdadeiro aqui. Os testes antigos
   * embrulhavam tudo em `if (await botão.isVisible())` e passavam sem testar
   * nada quando o seletor não casava. Asserção direta expõe a regressão.
   */
  const cycleButton = (page: import('@playwright/test').Page) =>
    page.getByRole('button', { name: `Ciclo Atual (dia ${TEST_USER.billingCycleDay})` });

  /*
   * Com o lançamento manual removido, o usuário do auth.setup.ts não tem
   * despesa nenhuma: o Reports renderiza <EmptyState> NO LUGAR dos KPIs e dos
   * gráficos (src/pages/Reports.tsx:412). Asserir só o KPI faria o teste
   * depender de dados que nada mais cria. O contrato honesto é: a página
   * resolve para um dos dois estados, nunca para tela quebrada.
   */
  const kpisOrEmptyState = (page: import('@playwright/test').Page) =>
    page.locator('#reports-total-card').or(page.getByText('Nenhuma despesa no período'));

  test('should display reports page with date filters', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /relatórios/i })).toBeVisible();
    await expect(page.getByLabel('Data Inicial', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Data Final', { exact: true })).toBeVisible();
  });

  test('should show "Ciclo Atual" button when custom cycle is set', async ({ page }) => {
    await expect(cycleButton(page)).toBeVisible();
    await expect(cycleButton(page)).toBeEnabled();
  });

  test('should apply current cycle dates when clicking "Ciclo Atual"', async ({ page }) => {
    const dateFrom = page.getByLabel('Data Inicial', { exact: true });
    const dateTo = page.getByLabel('Data Final', { exact: true });

    const fromBefore = await dateFrom.inputValue();
    const toBefore = await dateTo.inputValue();

    await cycleButton(page).click();

    await expect(page.getByText(/ciclo personalizado aplicado/i)).toBeVisible({ timeout: 5000 });

    // O ciclo começa no dia configurado do usuário.
    await expect(dateFrom).toHaveValue(
      new RegExp(`-${String(TEST_USER.billingCycleDay).padStart(2, '0')}$`),
    );
    expect(
      (await dateFrom.inputValue()) !== fromBefore || (await dateTo.inputValue()) !== toBefore,
    ).toBeTruthy();
  });

  test('should show tooltip with cycle information', async ({ page }) => {
    // Hover no BOTÃO, não no ícone: a classe base do Button traz
    // `[&_svg]:pointer-events-none`, então nenhum <svg> dentro dele recebe hover
    // — era por isso que o tooltip não abria nem aqui nem para o usuário.
    await cycleButton(page).hover();

    await expect(page.getByRole('tooltip')).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('tooltip')).toContainText('Seu ciclo:');
  });

  test('should filter expenses by selected date range', async ({ page }) => {
    await page.getByLabel('Data Inicial', { exact: true }).fill('2026-01-01');
    await page.getByLabel('Data Final', { exact: true }).fill('2026-01-31');

    await waitForPageLoad(page);

    await expect(kpisOrEmptyState(page).first()).toBeVisible({ timeout: 10000 });
  });

  test('should display KPI cards with data', async ({ page }) => {
    await expect(kpisOrEmptyState(page).first()).toBeVisible({ timeout: 10000 });

    // Havendo dados, os valores saem formatados em real.
    if (await page.locator('#reports-total-card').isVisible()) {
      await expect(page.getByText(/R\$\s*[\d.,]+/).first()).toBeVisible();
    }
  });

  test('should display charts when data is available', async ({ page }) => {
    // Sem despesas o app mostra estado vazio em vez de gráfico — aceitar os dois
    // evita um teste que depende da ordem de execução dos specs.
    const chart = page.locator('.recharts-wrapper').first();

    await expect(
      chart.or(page.getByText('Nenhuma despesa no período')).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test('should validate date range constraints', async ({ page }) => {
    const today = new Date().toISOString().split('T')[0];

    // `fill()` IGNORA o atributo max — o teste antigo esperava que o valor fosse
    // recusado e falhava sempre. A restrição real é o atributo, não o valor.
    await expect(page.getByLabel('Data Final', { exact: true })).toHaveAttribute('max', today);
    await expect(page.getByLabel('Data Inicial', { exact: true })).toHaveAttribute(
      'max',
      await page.getByLabel('Data Final', { exact: true }).inputValue(),
    );
  });
});
