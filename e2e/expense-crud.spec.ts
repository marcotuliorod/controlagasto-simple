import { test, expect } from '@playwright/test';
import { waitForPageLoad } from './fixtures/test-data';

test.describe('Expense List & Edit', () => {
  test.use({ storageState: 'artifacts/e2e/.auth/user.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await waitForPageLoad(page);
  });

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

});
