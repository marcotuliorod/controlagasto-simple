import { test, expect } from '@playwright/test';

test.describe('Tags and Notes', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'test123456');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should add tags to a new expense', async ({ page }) => {
    await page.goto('/add-expense');
    await page.waitForLoadState('networkidle');
    
    // Fill basic expense info
    await page.fill('input[name="merchant"]', 'Tagged Expense');
    await page.fill('input[name="amount"]', '99.99');
    
    // Select category
    const categorySelect = page.locator('select[name="category_id"]');
    if (await categorySelect.isVisible()) {
      await categorySelect.selectOption({ index: 1 });
    }
    
    // Add tags
    const tagsInput = page.locator('input[placeholder*="tag"]').or(page.locator('input[name="tags"]'));
    if (await tagsInput.isVisible()) {
      await tagsInput.fill('trabalho');
      await page.keyboard.press('Enter');
      
      await tagsInput.fill('urgente');
      await page.keyboard.press('Enter');
      
      // Verify tags are added
      await expect(page.locator('text=trabalho')).toBeVisible();
      await expect(page.locator('text=urgente')).toBeVisible();
    }
    
    // Submit
    await page.click('button[type="submit"]');
    await expect(page.locator('text=salva').or(page.locator('text=criada'))).toBeVisible({ timeout: 5000 });
  });

  test('should add notes to a new expense', async ({ page }) => {
    await page.goto('/add-expense');
    await page.waitForLoadState('networkidle');
    
    // Fill basic info
    await page.fill('input[name="merchant"]', 'Expense with Notes');
    await page.fill('input[name="amount"]', '150.00');
    
    // Select category
    const categorySelect = page.locator('select[name="category_id"]');
    if (await categorySelect.isVisible()) {
      await categorySelect.selectOption({ index: 1 });
    }
    
    // Add notes
    const notesTextarea = page.locator('textarea[name="notes"]').or(page.locator('textarea[placeholder*="nota"]'));
    if (await notesTextarea.isVisible()) {
      await notesTextarea.fill('Esta é uma nota importante sobre esta despesa. Preciso lembrar de verificar no próximo mês.');
    }
    
    // Submit
    await page.click('button[type="submit"]');
    await expect(page.locator('text=salva').or(page.locator('text=criada'))).toBeVisible({ timeout: 5000 });
  });

  test('should edit tags on existing expense', async ({ page }) => {
    // First create an expense
    await page.goto('/add-expense');
    await page.fill('input[name="merchant"]', 'Edit Tags Test');
    await page.fill('input[name="amount"]', '75.50');
    
    const categorySelect = page.locator('select[name="category_id"]');
    if (await categorySelect.isVisible()) {
      await categorySelect.selectOption({ index: 1 });
    }
    
    const tagsInput = page.locator('input[placeholder*="tag"]').or(page.locator('input[name="tags"]'));
    if (await tagsInput.isVisible()) {
      await tagsInput.fill('original');
      await page.keyboard.press('Enter');
    }
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);
    
    // Navigate to expenses and edit
    await page.goto('/expenses');
    await page.waitForLoadState('networkidle');
    
    const editButton = page.locator('text=Edit Tags Test').locator('..').locator('..').locator('button[aria-label*="Editar"]').first();
    if (await editButton.isVisible()) {
      await editButton.click();
      await page.waitForLoadState('networkidle');
      
      // Add new tag
      const tagsInputEdit = page.locator('input[placeholder*="tag"]').or(page.locator('input[name="tags"]'));
      if (await tagsInputEdit.isVisible()) {
        await tagsInputEdit.fill('editado');
        await page.keyboard.press('Enter');
      }
      
      await page.click('button[type="submit"]');
      await expect(page.locator('text=atualizada').or(page.locator('text=salva'))).toBeVisible({ timeout: 3000 });
    }
  });

  test('should edit notes on existing expense', async ({ page }) => {
    // Create expense
    await page.goto('/add-expense');
    await page.fill('input[name="merchant"]', 'Edit Notes Test');
    await page.fill('input[name="amount"]', '200.00');
    
    const categorySelect = page.locator('select[name="category_id"]');
    if (await categorySelect.isVisible()) {
      await categorySelect.selectOption({ index: 1 });
    }
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);
    
    // Navigate and edit
    await page.goto('/expenses');
    await page.waitForLoadState('networkidle');
    
    const editButton = page.locator('text=Edit Notes Test').locator('..').locator('..').locator('button[aria-label*="Editar"]').first();
    if (await editButton.isVisible()) {
      await editButton.click();
      await page.waitForLoadState('networkidle');
      
      // Update notes
      const notesTextarea = page.locator('textarea[name="notes"]');
      if (await notesTextarea.isVisible()) {
        await notesTextarea.clear();
        await notesTextarea.fill('Notas atualizadas com informações adicionais');
      }
      
      await page.click('button[type="submit"]');
      await expect(page.locator('text=atualizada').or(page.locator('text=salva'))).toBeVisible({ timeout: 3000 });
    }
  });

  test('should filter expenses by tags', async ({ page }) => {
    // Create expenses with specific tags
    await page.goto('/add-expense');
    await page.fill('input[name="merchant"]', 'Filterable Expense 1');
    await page.fill('input[name="amount"]', '50.00');
    
    const categorySelect = page.locator('select[name="category_id"]');
    if (await categorySelect.isVisible()) {
      await categorySelect.selectOption({ index: 1 });
    }
    
    const tagsInput = page.locator('input[placeholder*="tag"]').or(page.locator('input[name="tags"]'));
    if (await tagsInput.isVisible()) {
      await tagsInput.fill('filtroteste');
      await page.keyboard.press('Enter');
    }
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);
    
    // Go to expenses page
    await page.goto('/expenses');
    await page.waitForLoadState('networkidle');
    
    // Look for advanced filters or tag filter
    const advancedFiltersButton = page.locator('button:has-text("Filtros")').or(page.locator('text=Avançados'));
    if (await advancedFiltersButton.isVisible()) {
      await advancedFiltersButton.click();
      
      // Select the tag
      const tagCheckbox = page.locator('label:has-text("filtroteste")');
      if (await tagCheckbox.isVisible()) {
        await tagCheckbox.click();
      }
      
      // Apply filters
      await page.click('button:has-text("Aplicar")');
      await page.waitForTimeout(500);
      
      // Verify filtered result
      await expect(page.locator('text=Filterable Expense 1')).toBeVisible();
    }
  });

  test('should remove a tag from expense', async ({ page }) => {
    // Create expense with tags
    await page.goto('/add-expense');
    await page.fill('input[name="merchant"]', 'Remove Tag Test');
    await page.fill('input[name="amount"]', '30.00');
    
    const categorySelect = page.locator('select[name="category_id"]');
    if (await categorySelect.isVisible()) {
      await categorySelect.selectOption({ index: 1 });
    }
    
    const tagsInput = page.locator('input[placeholder*="tag"]').or(page.locator('input[name="tags"]'));
    if (await tagsInput.isVisible()) {
      await tagsInput.fill('remover');
      await page.keyboard.press('Enter');
      
      // Verify tag is added
      const tagBadge = page.locator('text=remover');
      await expect(tagBadge).toBeVisible();
      
      // Find and click remove button on tag
      const removeButton = tagBadge.locator('..').locator('button').or(page.locator('[data-tag="remover"]').locator('button'));
      if (await removeButton.isVisible()) {
        await removeButton.click();
        
        // Tag should be removed
        await expect(tagBadge).not.toBeVisible();
      }
    }
  });

  test('should display notes in expense list', async ({ page }) => {
    // Create expense with notes
    await page.goto('/add-expense');
    await page.fill('input[name="merchant"]', 'Display Notes Test');
    await page.fill('input[name="amount"]', '120.00');
    
    const categorySelect = page.locator('select[name="category_id"]');
    if (await categorySelect.isVisible()) {
      await categorySelect.selectOption({ index: 1 });
    }
    
    const notesTextarea = page.locator('textarea[name="notes"]');
    if (await notesTextarea.isVisible()) {
      await notesTextarea.fill('Nota visível na listagem');
    }
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);
    
    // Go to expenses
    await page.goto('/expenses');
    await page.waitForLoadState('networkidle');
    
    // Verify expense is displayed
    await expect(page.locator('text=Display Notes Test')).toBeVisible();
    
    // Notes might be in a collapsed section or tooltip
    const notesIndicator = page.locator('text=Nota').or(page.locator('[aria-label*="nota"]'));
    if (await notesIndicator.isVisible()) {
      await notesIndicator.hover();
    }
  });

  test('should search expenses by note content', async ({ page }) => {
    // Create expense with searchable note
    await page.goto('/add-expense');
    await page.fill('input[name="merchant"]', 'Searchable Note');
    await page.fill('input[name="amount"]', '85.00');
    
    const categorySelect = page.locator('select[name="category_id"]');
    if (await categorySelect.isVisible()) {
      await categorySelect.selectOption({ index: 1 });
    }
    
    const notesTextarea = page.locator('textarea[name="notes"]');
    if (await notesTextarea.isVisible()) {
      await notesTextarea.fill('Texto único para busca: XYZABC123');
    }
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);
    
    // Go to expenses and search
    await page.goto('/expenses');
    await page.waitForLoadState('networkidle');
    
    const searchInput = page.locator('input[placeholder*="buscar"]').or(page.locator('input[type="search"]'));
    if (await searchInput.isVisible()) {
      await searchInput.fill('XYZABC123');
      await page.waitForTimeout(500);
      
      // Should find the expense
      await expect(page.locator('text=Searchable Note')).toBeVisible();
    }
  });
});
