import { test as setup, expect } from '@playwright/test';
import { TEST_USER, signUpAndOnboard } from './fixtures/test-data';

const authFile = 'artifacts/e2e/.auth/user.json';

/**
 * Cria um usuário novo, completa o onboarding e salva o estado autenticado
 * que os demais specs consomem via `storageState`.
 *
 * Roda uma vez, antes de tudo, pelo projeto `setup` do playwright.config.ts.
 * Antes existia mas nunca era executado: não havia projeto `setup` nem
 * `dependencies`, e `.setup.ts` não casa com o `testMatch` padrão. Por isso
 * os seletores tinham acumulado divergências sem ninguém notar — apontavam
 * para uma tela de login e um onboarding que já não existem.
 *
 * `TEST_USER.email` tem timestamp, então cada execução cria um usuário
 * diferente e sempre passa pelo wizard completo.
 */
setup('authenticate', async ({ page }) => {
  await signUpAndOnboard(page, TEST_USER);

  await expect(page).toHaveURL(/\/dashboard/);

  await page.context().storageState({ path: authFile });
});
