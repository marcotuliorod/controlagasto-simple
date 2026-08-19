import { test, expect } from '@playwright/test';
import { waitForPageLoad } from './fixtures/test-data';

test.describe('Expense List & Edit', () => {
  test.use({ storageState: 'artifacts/e2e/.auth/user.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await waitForPageLoad(page);
  });

  /*
   * A lista é virtualizada: cada linha é um `role="listitem"` dentro do
   * `role="list"` rotulado "Lista de despesas". Os testes daqui usavam
   * `[class*="expense"], [data-testid*="expense"]`, que não casa com nada
   * nessa árvore — combinado com o `if (isVisible)` que os embrulha, passavam
   * sem exercitar nada e continuariam passando com a lista quebrada.
   */
  const linhas = (page: import('@playwright/test').Page) =>
    page.getByRole('list', { name: 'Lista de despesas' }).getByRole('listitem');

  /*
   * Rodando um projeto por vez contra banco limpo, esta suíte vem antes de
   * `import-transactions` na ordem alfabética — o usuário ainda pode não ter
   * despesa nenhuma. Por isso os testes abaixo aceitam os dois estados, mas
   * agora contra o DOM real: havendo dado, a asserção é de verdade.
   */
  const listaVazia = (page: import('@playwright/test').Page) =>
    page.getByText('Nenhuma despesa encontrada');

  /*
   * Criar despesa saiu daqui junto com o lançamento manual: /add-expense,
   * FAB e drawer rápido não existem mais. A entrada de gastos é a importação
   * de extrato/fatura, coberta em `import-transactions.spec.ts`. O que resta
   * abaixo é o ciclo de vida do que já entrou: listar, editar e excluir.
   */
  test('deve redirecionar /add-expense para a importação', async ({ page }) => {
    await page.goto('/add-expense');
    await expect(page).toHaveURL(/\/import-transactions/, { timeout: 15000 });
  });

  test('should display expense in list', async ({ page }) => {
    await page.goto('/expenses');
    await waitForPageLoad(page);

    // Nome exato, não regex: o AppLayout tem um h1 "Entenda Gastos" no
    // cabeçalho mobile (md:hidden), que casa com /gastos/i. No desktop ele
    // está oculto e só a página casava — por isso passava aqui e quebrava no
    // Mobile Chrome, com strict mode violation.
    await expect(page.getByRole('heading', { name: 'Minhas Despesas' })).toBeVisible();
    
    await expect(linhas(page).first().or(listaVazia(page))).toBeVisible({ timeout: 15000 });
  });

  test('should edit existing expense', async ({ page }) => {
    await page.goto('/expenses');
    await waitForPageLoad(page);
    await expect(linhas(page).first().or(listaVazia(page))).toBeVisible({ timeout: 15000 });

    test.skip(await listaVazia(page).isVisible(), 'sem despesa importada nesta passagem');

    // A rota é /expenses/:id/edit — a asserção antiga era /expenses/edit, que
    // não existe; nunca rodou, então nunca reclamou.
    await page.getByRole('button', { name: /^Editar despesa/ }).first().click();
    await expect(page).toHaveURL(/\/expenses\/[^/]+\/edit/, { timeout: 15000 });

    await page.getByLabel('Valor (R$)').fill('200.00');
    await page.getByRole('button', { name: 'Salvar Alterações' }).click();

    await expect(page.getByText(/atualizada|sucesso/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('should delete expense', async ({ page }) => {
    await page.goto('/expenses');
    await waitForPageLoad(page);
    await expect(linhas(page).first().or(listaVazia(page))).toBeVisible({ timeout: 15000 });

    test.skip(await listaVazia(page).isVisible(), 'sem despesa importada nesta passagem');

    /*
     * Contar linhas não serve de asserção: a lista é virtualizada, então o
     * número de `listitem` no DOM é o que cabe na viewport, não o total.
     * O que dá para afirmar é que a linha excluída sumiu — daí guardar o
     * comerciante dela antes.
     */
    const excluir = page.getByRole('button', { name: /^Excluir despesa/ }).first();
    const comerciante = (await excluir.getAttribute('aria-label')).replace('Excluir despesa ', '');

    await excluir.click();
    // Nome exato: o botão da linha também casa com /excluir/i, e o diálogo
    // renderiza por cima dela.
    await page.getByRole('button', { name: 'Excluir', exact: true }).click();

    await expect(page.getByText('Despesa excluída com sucesso')).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByRole('button', { name: `Excluir despesa ${comerciante}` }),
    ).toHaveCount(0, { timeout: 15000 });
  });

});
