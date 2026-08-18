import { test, expect } from '@playwright/test';
import { waitForPageLoad } from './fixtures/test-data';
import { fileURLToPath } from 'url';

// O projeto é ESM: `__dirname` não existe aqui. Era o que quebrava o upload
// abaixo — dentro do `test.fixme` o erro nunca aparecia.
const RECEIPT_FIXTURE = fileURLToPath(new URL('fixtures/mock-receipt.png', import.meta.url));

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

  /*
   * A resposta do process-receipt é interceptada de propósito. O que este teste
   * cobre é a ligação entre o OCR e o formulário — hoje sem cobertura nenhuma
   * — e não a qualidade da extração, que depende de serviço externo, de chave e
   * do conteúdo da imagem. Sem o route o teste seria não-determinístico.
   *
   * O input é `hidden` (a UI o abre pelo botão); `setInputFiles` funciona assim
   * mesmo e dispara o `onChange` real da página.
   */
  test('should accept image file upload', async ({ page }) => {
    // Derivada de hoje: o campo de data recusa futuro, e uma data fixa no
    // código vira bomba-relógio quando sai da janela aceita.
    const receiptDate = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

    await page.route('**/functions/v1/process-receipt', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            amount: 42.5,
            date: receiptDate,
            merchant: 'Padaria do Teste',
            cnpj: '12.345.678/0001-90',
            items: [{ item: 'Pão de queijo', value: 42.5 }],
          },
        }),
      })
    );

    await page.locator('input[type="file"]').setInputFiles(RECEIPT_FIXTURE);

    // Folga no timeout: passa por FileReader e pela invoke antes de preencher.
    await expect(page.locator('#merchant')).toHaveValue('Padaria do Teste', { timeout: 15000 });
    await expect(page.locator('#amount')).toHaveValue('42.5');
    await expect(page.locator('#date')).toHaveValue(receiptDate);
    await expect(page.locator('#notes')).toHaveValue(/Pão de queijo/);
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
