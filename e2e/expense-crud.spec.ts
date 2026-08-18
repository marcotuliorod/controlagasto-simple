import { test, expect } from '@playwright/test';
import { TEST_EXPENSE, waitForPageLoad } from './fixtures/test-data';

test.describe('Expense CRUD Operations', () => {
  test.use({ storageState: 'artifacts/e2e/.auth/user.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await waitForPageLoad(page);
  });

  test('should create new expense successfully', async ({ page }) => {
    /*
     * Não existe link nenhum para /add-expense no app — o teste antigo
     * procurava um `role: link` que nunca esteve lá. O caminho real é o FAB,
     * que abre o drawer rápido, e de lá o formulário completo.
     */
    await page.getByRole('button', { name: /adicionar nova despesa/i }).click();
    await page.getByRole('button', { name: /formulário completo/i }).click();
    await page.waitForURL('**/add-expense');

    /*
     * O drawer sai por animação, e ele tem um `id="amount"` igual ao do
     * formulário completo. Enquanto os dois coexistem, o preenchimento cai no
     * campo que está morrendo — foi assim que o teste chegou ao submit com o
     * valor vazio. Esperar o desmonte é o que torna o resto determinístico.
     */
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await page.getByLabel(/valor/i).fill(TEST_EXPENSE.amount);
    await page.getByLabel(/data/i).fill(TEST_EXPENSE.date);
    await page.getByLabel(/estabelecimento/i).fill(TEST_EXPENSE.merchant);
    await page.getByLabel(/observações/i).fill(TEST_EXPENSE.notes);

    // Select do Radix, não <select> nativo: abre no trigger, escolhe por role.
    await page.getByLabel(/forma de pagamento/i).click();
    await page.getByRole('option', { name: TEST_EXPENSE.paymentMethod }).click();

    await page.getByRole('button', { name: /salvar/i }).click();

    // O toast informa o ciclo de faturamento em que a despesa caiu.
    await expect(
      page.locator('[data-sonner-toast]').filter({ hasText: /adicionada|sucesso/i }).first()
    ).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  });

  test('should display expense in list', async ({ page }) => {
    await page.goto('/expenses');
    await waitForPageLoad(page);

    // Nome exato, não regex: o AppLayout tem um h1 "Entenda Gastos" no
    // cabeçalho mobile (md:hidden), que casa com /gastos/i. No desktop ele
    // está oculto e só a página casava — por isso passava aqui e quebrava no
    // Mobile Chrome, com strict mode violation.
    await expect(page.getByRole('heading', { name: 'Minhas Despesas' })).toBeVisible();
    
    // Check if there are any expenses
    const noExpensesText = await page.locator('text=/nenhuma despesa|sem despesas/i').isVisible({ timeout: 2000 }).catch(() => false);
    
    if (!noExpensesText) {
      // Should have at least one expense card/row
      const expenseItems = page.locator('[class*="expense"], [data-testid*="expense"]').first();
      await expect(expenseItems).toBeVisible();
    }
  });

  test('should edit existing expense', async ({ page }) => {
    await page.goto('/expenses');
    await waitForPageLoad(page);

    // Find first expense and click edit
    const firstExpense = page.locator('[class*="expense"], [data-testid*="expense"]').first();
    
    if (await firstExpense.isVisible({ timeout: 2000 }).catch(() => false)) {
      await firstExpense.click();
      
      // Should navigate to edit page
      await expect(page).toHaveURL(/\/expenses\/edit/, { timeout: 5000 });
      
      // Update amount
      const newAmount = '200.00';
      await page.getByLabel(/valor/i).fill(newAmount);
      
      // Save changes
      await page.getByRole('button', { name: /salvar/i }).click();
      
      // Should show success message
      await expect(page.locator('text=/atualizada|sucesso/i')).toBeVisible({ timeout: 5000 });
    } else {
      console.log('⚠️ No expenses found to edit');
    }
  });

  test('should delete expense', async ({ page }) => {
    await page.goto('/expenses');
    await waitForPageLoad(page);

    const firstExpense = page.locator('[class*="expense"], [data-testid*="expense"]').first();
    
    if (await firstExpense.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Find and click delete button
      const deleteButton = firstExpense.locator('button[aria-label*="delete"], button[aria-label*="excluir"]').first();
      
      if (await deleteButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await deleteButton.click();
        
        // Confirm deletion in dialog
        await page.getByRole('button', { name: /confirmar|excluir|deletar/i }).click();
        
        // Should show success message
        await expect(page.locator('text=/excluída|removida|sucesso/i')).toBeVisible({ timeout: 5000 });
      }
    } else {
      console.log('⚠️ No expenses found to delete');
    }
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/add-expense');
    await waitForPageLoad(page);

    // Try to submit empty form
    await page.getByRole('button', { name: /salvar/i }).click();

    // Should show validation errors or prevent submission
    const url = page.url();
    expect(url).toContain('/add-expense'); // Should stay on same page
  });

  test('should not allow future dates', async ({ page }) => {
    await page.goto('/add-expense');
    await waitForPageLoad(page);

    const today = new Date().toISOString().slice(0, 10);
    const future = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
    const dateInput = page.locator('#date');

    await expect(dateInput).toHaveAttribute('max', today);

    await page.locator('#amount').fill('100.00');
    await dateInput.fill(future);
    await page.getByRole('button', { name: /salvar/i }).click();

    /*
     * O `max` do campo faz o próprio navegador barrar o submit, então o
     * handler — que também rejeita futuro — nem roda, e não há toast para
     * esperar. Era isso que o teste antigo esperava. O que importa verificar
     * é que a despesa não foi criada: o campo está inválido e continuamos no
     * formulário.
     */
    const rangeOverflow = await dateInput.evaluate(
      (el: HTMLInputElement) => el.validity.rangeOverflow
    );
    expect(rangeOverflow).toBe(true);
    await expect(page).toHaveURL(/\/add-expense/);
  });
});
