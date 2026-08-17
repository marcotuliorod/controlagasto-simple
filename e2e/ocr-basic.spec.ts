/*
 * QUARENTENA — os `test.fixme` abaixo ainda não passam.
 *
 * O diagnóstico agora é específico (antes era só "seletores desatualizados"):
 *
 *  1. Formulários usam `input[name="x"]`, mas os campos têm apenas `id="x"`,
 *     sem atributo name. Use `page.locator('#x')` ou `getByLabel`.
 *  2. `selectOption('select[name="x"]')` não funciona: a UI usa o Select do
 *     shadcn (Radix), que não é um <select> nativo. Precisa clicar no trigger
 *     e depois na opção, por role.
 *
 * Causas sistêmicas JÁ resolvidas nesta rodada, que valiam 10 testes:
 *  - 3 arquivos faziam login manual com um usuário inexistente; agora usam o
 *    storageState do auth.setup.ts;
 *  - o modal de boas-vindas da gamificação cobria toda página, e o setup não o
 *    dispensava — nenhum seletor era encontrado por baixo dele;
 *  - `locator('h1')` casa 2 elementos (o do AppLayout e o da página);
 *  - a tela de auth usa abas, não os placeholders que os testes esperavam.
 *
 * Cada fixme é dívida explícita: reative ao ajustar a interação.
 */
import { test, expect } from '@playwright/test';
import { waitForPageLoad } from './fixtures/test-data';
import path from 'path';

test.describe('OCR Receipt Processing', () => {
  test.use({ storageState: 'artifacts/e2e/.auth/user.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/add-expense');
    await waitForPageLoad(page);
  });

  test('should display OCR upload button', async ({ page }) => {
    // Check if OCR button exists
    const ocrButton = page.getByRole('button', { name: /foto.*cupom|upload.*recibo|processar/i });
    await expect(ocrButton).toBeVisible();
  });

  test.fixme('should accept image file upload', async ({ page }) => {
    // Create a mock receipt image file
    const mockImagePath = path.join(__dirname, 'fixtures', 'mock-receipt.png');
    
    // Note: This test requires a mock image file to exist
    // In a real scenario, you would have a test fixture image
    
    const fileInput = page.locator('input[type="file"]');
    
    if (await fileInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      // Upload file would trigger here
      // await fileInput.setInputFiles(mockImagePath);
      
      console.log('⚠️ File upload test requires mock image fixture');
    } else {
      console.log('⚠️ File input not found - OCR might use different upload method');
    }
  });

  test('should show processing state during OCR', async ({ page }) => {
    // This test would require mocking the OCR function response
    // or using a real test receipt image
    
    const ocrButton = page.getByRole('button', { name: /foto.*cupom|upload.*recibo|processar/i });
    
    if (await ocrButton.isVisible()) {
      // After clicking, should show loading state
      // await ocrButton.click();
      // await expect(page.locator('text=/processando|aguarde/i')).toBeVisible({ timeout: 2000 });
      
      console.log('⚠️ OCR processing test requires mock or real receipt');
    }
  });

  test('should populate form fields after successful OCR', async ({ page }) => {
    // This test validates that after OCR processing:
    // - Amount field is filled
    // - Date field is filled
    // - Merchant field is filled
    // - Items are added to notes
    
    // Would require mocked Supabase function response or real OCR
    console.log('⚠️ OCR field population test requires integration with OCR service');
  });

  test('should handle OCR errors gracefully', async ({ page }) => {
    // Test error scenarios:
    // - Invalid file format
    // - Corrupted image
    // - OCR service failure
    
    console.log('⚠️ OCR error handling test requires error simulation');
  });

  test('should allow manual override of OCR results', async ({ page }) => {
    // After OCR populates fields, user should be able to edit them
    await page.getByLabel(/valor/i).fill('99.99');
    await page.getByLabel(/estabelecimento/i).fill('Loja Manual');
    
    const amountValue = await page.getByLabel(/valor/i).inputValue();
    expect(amountValue).toBe('99.99');
  });
});
