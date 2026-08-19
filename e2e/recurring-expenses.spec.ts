import { test, expect, Page } from '@playwright/test';
import {
  acceptNativeConfirm,
  selectRadixOption,
  uniqueLabel,
  waitForPageLoad,
} from './fixtures/test-data';

/**
 * Cria uma recorrência pela UI e devolve o cartão dela junto do nome sorteado.
 *
 * O nome recebe sufixo de execução (`uniqueLabel`): o banco é compartilhado
 * entre specs E entre projetos do Playwright, então um `merchant` fixo faz a
 * segunda passagem tropeçar no registro que a primeira deixou.
 */
async function createRecurring(
  page: Page,
  base: string,
  amount: string,
  { frequency = 'Mensal', endDate }: { frequency?: string; endDate?: string } = {},
) {
  const merchant = uniqueLabel(base);

  await page.getByRole('button', { name: 'Nova Recorrência' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  await page.getByLabel('Estabelecimento *').fill(merchant);
  await page.getByLabel('Valor (R$) *').fill(amount);
  await selectRadixOption(page, 'Frequência *', frequency);
  await page.getByLabel('Data Início *').fill('2026-01-01');
  if (endDate) await page.getByLabel('Data Fim (opcional)').fill(endDate);

  await dialog.getByRole('button', { name: 'Criar Recorrência' }).click();
  await expect(dialog).toBeHidden();

  return { card: card(page, merchant), merchant };
}

/** O cartão da recorrência: o ancestral que contém o título e os botões de ação. */
function card(page: Page, merchant: string) {
  // `rounded-md` é a classe base do <Card> (src/components/ui/card.tsx).
  return page
    .locator('div.rounded-md')
    .filter({ has: page.getByRole('heading', { name: merchant, exact: true }) })
    .first();
}

test.describe('Recurring Expenses', () => {
  test.use({ storageState: 'artifacts/e2e/.auth/user.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/recurring-expenses');
    await waitForPageLoad(page);
  });

  test('should display recurring expenses page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Despesas Recorrentes' })).toBeVisible();
    await expect(
      page.getByText('Gerencie despesas que se repetem periodicamente'),
    ).toBeVisible();
  });

  test('should create a new recurring expense', async ({ page }) => {
    const { card: netflix } = await createRecurring(page, 'Netflix E2E', '49.90');

    await expect(netflix).toBeVisible();
    await expect(netflix.getByText('R$ 49.90')).toBeVisible();
    await expect(netflix.getByText('Mensal')).toBeVisible();
  });

  test('should display frequency options', async ({ page }) => {
    await page.getByRole('button', { name: 'Nova Recorrência' }).click();
    await page.getByLabel('Frequência *', { exact: true }).click();

    // Os rótulos visíveis são em português; os values (daily/weekly/...) não
    // aparecem no DOM do Radix.
    for (const label of ['Diária', 'Semanal', 'Mensal', 'Anual']) {
      await expect(page.getByRole('option', { name: label, exact: true })).toBeVisible();
    }
  });

  test('should edit a recurring expense', async ({ page }) => {
    const { card: spotify, merchant } = await createRecurring(page, 'Spotify E2E', '24.90');

    await spotify.getByRole('button', { name: `Editar recorrência ${merchant}` }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(page.getByLabel('Estabelecimento *')).toHaveValue(merchant);

    await page.getByLabel('Valor (R$) *').fill('29.90');
    await dialog.getByRole('button', { name: 'Salvar Alterações' }).click();
    await expect(dialog).toBeHidden();

    await expect(spotify.getByText('R$ 29.90')).toBeVisible();
  });

  test('should toggle recurring expense active status', async ({ page }) => {
    const { card: gym, merchant } = await createRecurring(page, 'Academia E2E', '100.00');

    await expect(gym.getByText('Ativo')).toBeVisible();

    await gym.getByRole('button', { name: `Pausar recorrência ${merchant}` }).click();
    await expect(gym.getByText('Pausado')).toBeVisible();

    // Pausado, o botão passa a oferecer a ação inversa.
    await expect(gym.getByRole('button', { name: `Retomar recorrência ${merchant}` })).toBeVisible();
  });

  test('should delete a recurring expense', async ({ page }) => {
    const { card: doomed, merchant } = await createRecurring(
      page,
      'Assinatura Descartavel E2E',
      '19.90',
    );

    // A exclusão passa por window.confirm(); sem aceitar, a mutação não roda.
    acceptNativeConfirm(page);
    await doomed.getByRole('button', { name: `Excluir recorrência ${merchant}` }).click();

    await expect(page.getByRole('heading', { name: merchant, exact: true })).toBeHidden();
  });

  test('should display next occurrence date', async ({ page }) => {
    const { card: bill } = await createRecurring(page, 'Conta Mensal E2E', '150.00');

    await expect(bill.getByText('Próxima ocorrência:')).toBeVisible();
    await expect(bill.getByText('01/01/2026')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.getByRole('button', { name: 'Nova Recorrência' }).click();
    const dialog = page.getByRole('dialog');

    await dialog.getByRole('button', { name: 'Criar Recorrência' }).click();

    // A validação é o `required` nativo do HTML, não uma mensagem em texto: o
    // navegador bloqueia o submit e o diálogo continua aberto.
    await expect(dialog).toBeVisible();
    await expect(page.getByLabel('Estabelecimento *')).toHaveJSProperty('validity.valid', false);
  });

  test('should allow setting end date', async ({ page }) => {
    const { card: limited } = await createRecurring(page, 'Assinatura Limitada E2E', '39.90', {
      endDate: '2026-12-31',
    });

    await expect(limited.getByText('Encerra em:')).toBeVisible();
    await expect(limited.getByText('31/12/2026')).toBeVisible();
  });
});
