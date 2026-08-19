import { test, expect, Page } from '@playwright/test';
import {
  acceptNativeConfirm,
  selectRadixOption,
  uniqueLabel,
  waitForPageLoad,
} from './fixtures/test-data';

/**
 * Cria uma exportação agendada pela UI e devolve o cartão junto do nome sorteado.
 *
 * O nome recebe sufixo de execução (`uniqueLabel`): o banco é compartilhado
 * entre specs E entre projetos do Playwright, então um nome fixo faz a segunda
 * passagem tropeçar no registro que a primeira deixou.
 */
async function createExport(
  page: Page,
  base: string,
  { frequency = 'Mensal', format = 'PDF' }: { frequency?: string; format?: string } = {},
) {
  const name = uniqueLabel(base);

  await page.getByRole('button', { name: 'Nova Exportação' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  await page.getByLabel('Nome', { exact: true }).fill(name);
  await selectRadixOption(page, 'Frequência', frequency);
  await selectRadixOption(page, 'Formato', format);

  await dialog.getByRole('button', { name: 'Criar Exportação' }).click();
  await expect(dialog).toBeHidden();

  return { card: card(page, name), name };
}

/** O cartão da exportação — `rounded-md` é a classe base do <Card>. */
function card(page: Page, name: string) {
  return page
    .locator('div.rounded-md')
    .filter({ has: page.getByRole('heading', { name, exact: true }) })
    .first();
}

test.describe('Scheduled Exports', () => {
  test.use({ storageState: 'artifacts/e2e/.auth/user.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/scheduled-exports');
    await waitForPageLoad(page);
  });

  test('should display scheduled exports page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Exportações Agendadas' })).toBeVisible();

    // O subtítulo do CABEÇALHO. "Configure exportações automáticas" é do card de
    // estado vazio — asserir aquele fazia o teste depender de o banco estar
    // vazio, e ele quebraria assim que outro teste criasse uma exportação.
    await expect(page.getByText('Automatize seus relatórios periódicos')).toBeVisible();
  });

  test('should create a new scheduled export', async ({ page }) => {
    const { card: monthly } = await createExport(page, 'Relatorio Mensal E2E');

    await expect(monthly).toBeVisible();
    // `exact` importa: sem ele "Mensal" também casa o título "Relatorio Mensal E2E".
    await expect(monthly.getByText('Mensal', { exact: true })).toBeVisible();
    await expect(monthly.getByText('PDF', { exact: true })).toBeVisible();
  });

  test('should display frequency options correctly', async ({ page }) => {
    await page.getByRole('button', { name: 'Nova Exportação' }).click();
    await page.getByLabel('Frequência', { exact: true }).click();

    for (const label of ['Diário', 'Semanal', 'Mensal']) {
      await expect(page.getByRole('option', { name: label, exact: true })).toBeVisible();
    }
  });

  test('should display format options correctly', async ({ page }) => {
    await page.getByRole('button', { name: 'Nova Exportação' }).click();
    await page.getByLabel('Formato', { exact: true }).click();

    // Rótulos visíveis, não os values: "Excel (XLSX)", não "xlsx".
    for (const label of ['PDF', 'CSV', 'Excel (XLSX)']) {
      await expect(page.getByRole('option', { name: label, exact: true })).toBeVisible();
    }
  });

  test('should toggle export active status', async ({ page }) => {
    const { card: toggled, name } = await createExport(page, 'Export Para Pausar E2E', {
      frequency: 'Semanal',
      format: 'CSV',
    });

    await expect(toggled.getByText('Ativo')).toBeVisible();

    await toggled.getByRole('button', { name: `Pausar exportação ${name}` }).click();
    await expect(toggled.getByText('Pausado')).toBeVisible();
  });

  test('should delete a scheduled export', async ({ page }) => {
    const { card: doomed, name } = await createExport(page, 'Export Para Excluir E2E', {
      frequency: 'Diário',
      format: 'CSV',
    });

    // A exclusão passa por window.confirm(); sem aceitar, a mutação não roda.
    acceptNativeConfirm(page);
    await doomed.getByRole('button', { name: `Excluir exportação ${name}` }).click();

    await expect(page.getByRole('heading', { name, exact: true })).toBeHidden();
  });

  test('should display next run date', async ({ page }) => {
    const { card: scheduled } = await createExport(page, 'Export Proxima Execucao E2E');

    await expect(scheduled.getByText('Próxima execução:')).toBeVisible();
    await expect(scheduled.getByText(/\d{2}\/\d{2}\/\d{4} às \d{2}:\d{2}/)).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.getByRole('button', { name: 'Nova Exportação' }).click();
    const dialog = page.getByRole('dialog');

    await dialog.getByRole('button', { name: 'Criar Exportação' }).click();

    // Validação é o `required` nativo do HTML, sem mensagem em texto: o
    // navegador bloqueia o submit e o diálogo continua aberto.
    await expect(dialog).toBeVisible();
    await expect(page.getByLabel('Nome', { exact: true })).toHaveJSProperty('validity.valid', false);
  });
});
