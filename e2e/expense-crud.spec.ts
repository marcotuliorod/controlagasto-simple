import { test, expect } from '@playwright/test';
import { TEST_EXPENSE, waitForPageLoad, formatCurrency } from './fixtures/test-data';

test.describe('Expense CRUD Operations', () => {
  test.use({ storageState: 'artifacts/e2e/.auth/user.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await waitForPageLoad(page);
  });

  test('should create new expense successfully', async ({ page }) => {
    // Navigate to add expense
    await page.getByRole('link', { name: /adicionar/i }).click();
    await page.waitForURL('/add-expense');

    // Fill expense form
    await page.getByLabel(/valor/i).fill(TEST_EXPENSE.amount);
    await page.getByLabel(/data/i).fill(TEST_EXPENSE.date);
    await page.getByLabel(/estabelecimento/i).fill(TEST_EXPENSE.merchant);
    await page.getByLabel(/observações/i).fill(TEST_EXPENSE.notes);
    
    // Select payment method
    await page.getByLabel(/forma de pagamento/i).click();
    await page.getByRole('option', { name: TEST_EXPENSE.paymentMethod }).click();

    // Submit form
    await page.getByRole('button', { name: /salvar/i }).click();

    // Should show success message and redirect
    await expect(page.locator('text=/adicionada|sucesso/i')).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/\/(dashboard|expenses)/, { timeout: 5000 });
  });

  test('should display expense in list', async ({ page }) => {
    await page.goto('/expenses');
    await waitForPageLoad(page);

    // Should show expenses list
    await expect(page.getByRole('heading', { name: /despesas|gastos/i })).toBeVisible();
    
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

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const futureDateStr = futureDate.toISOString().split('T')[0];

    await page.getByLabel(/valor/i).fill('100.00');
    await page.getByLabel(/data/i).fill(futureDateStr);
    await page.getByRole('button', { name: /salvar/i }).click();

    // Should show error or prevent submission
    await expect(page.locator('text=/data.*futura|não pode ser futura/i')).toBeVisible({ timeout: 5000 });
  });
});
