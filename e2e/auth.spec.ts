import { test, expect } from '@playwright/test';
import { generateTestEmail, signUpAndOnboard, waitForPageLoad } from './fixtures/test-data';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await waitForPageLoad(page);
  });

  test('should display auth page correctly', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /entenda seus gastos/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Entrar' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Criar Conta' })).toBeVisible();
  });

  test('should sign up new user successfully', async ({ page }) => {
    // "Criar Conta" é uma aba, não um botão: sem clicar nela o formulário
    // preenchido era o de login. E o campo de senha do cadastro tem outro
    // placeholder — "Sua senha", que o teste antigo procurava, não existe.
    await page.getByRole('tab', { name: 'Criar Conta' }).click();
    const signup = page.getByRole('tabpanel');

    await signup.getByPlaceholder('Seu nome').fill('Novo Usuário');
    await signup.getByPlaceholder('seu@email.com').fill(generateTestEmail());
    await signup.getByPlaceholder('Mínimo 6 caracteres').fill('TestPassword123!');
    await signup.getByRole('button', { name: /criar conta/i }).click();

    await expect(page).toHaveURL(/\/onboarding/, { timeout: 15000 });
    // Mesmo timeout da navegação: /onboarding é lazy-loaded, e com a suíte
    // inteira em 4 workers o chunk demorava mais que os 5s padrão.
    await expect(page.getByRole('heading', { name: /defina sua meta/i })).toBeVisible({
      timeout: 15000,
    });
  });

  test('should validate email format', async ({ page }) => {
    await page.getByRole('tab', { name: 'Criar Conta' }).click();
    const signup = page.getByRole('tabpanel');

    const email = signup.getByPlaceholder('seu@email.com');
    await signup.getByPlaceholder('Seu nome').fill('Novo Usuário');
    await email.fill('invalid-email');
    await signup.getByPlaceholder('Mínimo 6 caracteres').fill('TestPassword123!');
    await signup.getByRole('button', { name: /criar conta/i }).click();

    /*
     * `type="email"` faz o próprio navegador barrar o submit, então não há
     * mensagem na tela para esperar — era isso que o teste antigo fazia.
     * Verifica-se a rejeição de fato: campo inválido e nenhuma conta criada.
     */
    const typeMismatch = await email.evaluate(
      (el: HTMLInputElement) => el.validity.typeMismatch
    );
    expect(typeMismatch).toBe(true);
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should login existing user', async ({ page }) => {
    /*
     * Não existe usuário fixo no banco — o teste antigo usava um inventado e
     * passava aceitando "logou OU deu erro", o que qualquer resultado
     * satisfaz. Aqui o usuário é criado, a sessão é descartada, e o login é
     * de verdade.
     */
    const email = generateTestEmail();
    const password = 'TestPassword123!';

    await page.getByRole('tab', { name: 'Criar Conta' }).click();
    const signup = page.getByRole('tabpanel');
    await signup.getByPlaceholder('Seu nome').fill('Usuário Existente');
    await signup.getByPlaceholder('seu@email.com').fill(email);
    await signup.getByPlaceholder('Mínimo 6 caracteres').fill(password);
    await signup.getByRole('button', { name: /criar conta/i }).click();
    await page.waitForURL(/\/onboarding/, { timeout: 15000 });

    // Descarta a sessão sem passar pelo logout, que é o teste seguinte.
    await page.evaluate(() => window.localStorage.clear());
    await page.goto('/auth');
    await waitForPageLoad(page);

    const signin = page.getByRole('tabpanel');
    await signin.getByPlaceholder('seu@email.com').fill(email);
    await signin.getByPlaceholder('••••••••').fill(password);
    await signin.getByRole('button', { name: /entrar/i }).click();

    await expect(
      page.locator('[data-sonner-toast]').filter({ hasText: /login realizado/i }).first()
    ).toBeVisible({ timeout: 15000 });
    // Com o onboarding incompleto o app manda para o wizard, não ao dashboard.
    await expect(page).toHaveURL(/\/(dashboard|onboarding)/, { timeout: 15000 });
  });
});

test.describe('Logout', () => {
  /*
   * Usuário PRÓPRIO, não o `storageState` do auth.setup.ts.
   *
   * `supabase.auth.signOut()` (AppSidebar.tsx) tem escopo `global` por padrão:
   * revoga TODOS os refresh tokens do usuário, não só o desta aba. Com a
   * sessão compartilhada, este teste derrubava os 5 specs que rodam em
   * paralelo com ela — e eles falhavam por token inválido, sem nenhuma pista
   * de que a causa estava aqui.
   */
  test('should logout successfully', async ({ page }) => {
    await signUpAndOnboard(page);
    await waitForPageLoad(page);

    // O botão vive na sidebar, que no mobile só existe atrás do menu.
    const menuTrigger = page.getByRole('button', { name: /abrir menu de navegação/i });
    if (await menuTrigger.isVisible()) {
      await menuTrigger.click();
    }

    await page.getByRole('button', { name: 'Sair' }).click();
    await expect(page).toHaveURL(/\/auth/, { timeout: 15000 });
  });
});
