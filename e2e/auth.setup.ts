import { test as setup, expect } from '@playwright/test';
import { TEST_USER, waitForPageLoad } from './fixtures/test-data';

const authFile = 'artifacts/e2e/.auth/user.json';

/**
 * Cria um usuário novo, completa o onboarding e salva o estado autenticado
 * que os demais specs consomem via `storageState`.
 *
 * Roda uma vez, antes de tudo, pelo projeto `setup` do playwright.config.ts.
 * Antes existia mas nunca era executado: não havia projeto `setup` nem
 * `dependencies`, e `.setup.ts` não casa com o `testMatch` padrão. Por isso
 * os seletores abaixo tinham acumulado divergências sem ninguém notar —
 * apontavam para uma tela de login e um onboarding que já não existem.
 *
 * `TEST_USER.email` tem timestamp, então cada execução cria um usuário
 * diferente e sempre passa pelo wizard completo.
 */
setup('authenticate', async ({ page }) => {
  await page.goto('/auth');
  await waitForPageLoad(page);

  // "Criar Conta" é uma aba (TabsTrigger), não um botão. O e-mail aparece nas
  // duas abas, então os campos são buscados dentro do painel de cadastro para
  // não dar ambiguidade.
  await page.getByRole('tab', { name: 'Criar Conta' }).click();
  const signup = page.getByRole('tabpanel');

  await signup.getByPlaceholder('Seu nome').fill(TEST_USER.name);
  await signup.getByPlaceholder('seu@email.com').fill(TEST_USER.email);
  await signup.getByPlaceholder('Mínimo 6 caracteres').fill(TEST_USER.password);
  await signup.getByRole('button', { name: /criar conta/i }).click();

  await page.waitForURL(/\/(onboarding|dashboard)/, { timeout: 15000 });

  // Wizard de 3 passos: meta → ciclo de faturamento → primeira conta.
  if (page.url().includes('onboarding')) {
    // Passo 1 — meta mensal. Busca por label: o placeholder é "1500.00".
    await page.getByLabel(/meta mensal/i).fill(String(TEST_USER.monthlyGoal));
    await page.getByRole('button', { name: 'Próximo' }).click();

    // Passo 2 — dia do ciclo.
    await page.getByRole('button', { name: `Dia ${TEST_USER.billingCycleDay}` }).click();
    await page.getByRole('button', { name: 'Próximo' }).click();

    // Passo 3 — primeira conta. Só o nome é obrigatório; o resto tem padrão.
    await page.getByLabel(/nome da conta/i).fill('Conta de Teste');
    await page.getByRole('button', { name: 'Concluir' }).click();

    await page.waitForURL('/dashboard', { timeout: 15000 });
  }

  await expect(page).toHaveURL(/\/dashboard/);

  await page.context().storageState({ path: authFile });
});
