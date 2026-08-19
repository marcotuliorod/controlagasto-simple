import { test, expect } from '@playwright/test';
import { TEST_USER, waitForPageLoad } from './fixtures/test-data';

test.describe('Reports with Billing Cycle', () => {
  test.use({ storageState: 'artifacts/e2e/.auth/user.json' });

  test.beforeEach(async ({ page }) => {
    /*
     * O `FirstVisitTip` do cartão "Total no Período" abre sozinho enquanto o
     * localStorage não tiver a chave de dispensa — e ele é um segundo
     * `role="tooltip"` na tela, o que quebra por strict mode a asserção do
     * tooltip do ciclo. Ele só aparece quando há despesa, então isso ficou
     * invisível enquanto o usuário de teste não tinha nenhuma; passou a valer
     * quando `import-transactions.spec.ts` começou a criar dados. Marcar a
     * dica como vista antes do load tira do caminho uma peça que não é o
     * objeto deste spec.
     */
    await page.addInitScript(() => {
      localStorage.setItem('tip-seen-reports-total-card', 'true');
    });

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
   * O Reports renderiza <EmptyState> NO LUGAR dos KPIs e dos gráficos quando
   * não há despesa no período. Como a importação pode ou não ter rodado antes
   * nesta passagem, o contrato honesto é: a página resolve para um dos dois
   * estados, nunca para tela quebrada.
   *
   * O KPI é localizado pelo rótulo, não por `#reports-total-card`:
   * "reports-total-card" é o `id` do FirstVisitTip (chave de localStorage),
   * não um id de DOM — nenhum elemento na página o carrega. O seletor antigo
   * não casava com nada e o teste vivia do ramo do estado vazio, que era o
   * único que existia enquanto ninguém criava despesa.
   */
  const kpisOrEmptyState = (page: import('@playwright/test').Page) =>
    page.getByText('Total no Período').or(page.getByText('Nenhuma despesa no período'));

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

    const tooltipDoCiclo = page.getByRole('tooltip').filter({ hasText: 'Seu ciclo:' });
    await expect(tooltipDoCiclo).toBeVisible({ timeout: 5000 });
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
    if (await page.getByText('Total no Período').isVisible()) {
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
