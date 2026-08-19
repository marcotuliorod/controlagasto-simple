import { expect, type Page } from '@playwright/test';

/**
 * Test data fixtures for E2E tests
 */

export const TEST_USER = {
  email: `test-${Date.now()}@example.com`,
  password: 'Test123456!',
  name: 'Test User',
  monthlyGoal: 5000,
  billingCycleDay: 5,
};

/**
 * Wait for navigation and loading states
 */
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
}

/**
 * Generate unique test email
 */
export function generateTestEmail(): string {
  return `e2e-test-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`;
}

/**
 * Escolhe uma opção num Select do shadcn/Radix.
 *
 * Não é um <select> nativo, então `selectOption()` não funciona: é um botão
 * que abre um listbox em portal. Precisa clicar no gatilho e depois na opção.
 *
 * `triggerLabel` é o texto do <Label> ligado ao gatilho (ex: "Frequência");
 * `optionName`, o rótulo VISÍVEL da opção (ex: "Mensal", não o value "monthly").
 */
export async function selectRadixOption(
  page: Page,
  triggerLabel: string,
  optionName: string,
) {
  await page.getByLabel(triggerLabel, { exact: true }).click();
  await page.getByRole('option', { name: optionName, exact: true }).click();
}

/**
 * Aceita o `window.confirm()` nativo usado nas exclusões.
 *
 * O Playwright DISPENSA qualquer diálogo nativo por padrão quando não há
 * listener — então, sem isto, `confirm()` devolve false, a mutação de exclusão
 * nunca roda e o teste falha sem dizer por quê.
 *
 * Chamar ANTES da ação que dispara o diálogo.
 */
export function acceptNativeConfirm(page: Page) {
  page.once('dialog', (dialog) => dialog.accept());
}

/**
 * Cria uma conta nova e leva até o dashboard, com o onboarding completo e o
 * modal de boas-vindas dispensado.
 *
 * O `auth.setup.ts` usa isto para gravar o `storageState` compartilhado. Quem
 * mais chama é o teste de logout — e ele PRECISA de usuário próprio: sair
 * revoga a sessão, e o `storageState` é UMA sessão, dividida por todos os
 * specs que rodam em paralelo. Eles passavam a falhar por token inválido
 * (diálogo de criação que não fecha, perfil que não carrega) sem nenhuma pista
 * de que a causa estava em outro arquivo.
 */
export async function signUpAndOnboard(
  page: Page,
  {
    email = generateTestEmail(),
    password = TEST_USER.password,
    name = TEST_USER.name,
    monthlyGoal = TEST_USER.monthlyGoal,
    billingCycleDay = TEST_USER.billingCycleDay,
  }: Partial<typeof TEST_USER> = {},
) {
  await page.goto('/auth');
  await waitForPageLoad(page);

  // "Criar Conta" é uma aba (TabsTrigger), não um botão. O e-mail aparece nas
  // duas abas, então os campos são buscados dentro do painel de cadastro para
  // não dar ambiguidade.
  await page.getByRole('tab', { name: 'Criar Conta' }).click();
  const signup = page.getByRole('tabpanel');

  await signup.getByPlaceholder('Seu nome').fill(name);
  await signup.getByPlaceholder('seu@email.com').fill(email);
  await signup.getByPlaceholder('Mínimo 6 caracteres').fill(password);
  await signup.getByRole('button', { name: /criar conta/i }).click();

  await page.waitForURL(/\/(onboarding|dashboard)/, { timeout: 15000 });

  // Wizard de 3 passos: meta → ciclo de faturamento → primeira conta.
  if (page.url().includes('onboarding')) {
    // Passo 1 — meta mensal. Busca por label: o placeholder é "1500.00".
    await page.getByLabel(/meta mensal/i).fill(String(monthlyGoal));
    await page.getByRole('button', { name: 'Próximo' }).click();

    // Passo 2 — dia do ciclo.
    await page.getByRole('button', { name: `Dia ${billingCycleDay}` }).click();
    await page.getByRole('button', { name: 'Próximo' }).click();

    // Passo 3 — primeira conta. Só o nome é obrigatório; o resto tem padrão.
    await page.getByLabel(/nome da conta/i).fill('Conta de Teste');
    await page.getByRole('button', { name: 'Concluir' }).click();

    await page.waitForURL('/dashboard', { timeout: 15000 });
  }

  /*
   * Dispensa o modal de boas-vindas da gamificação.
   *
   * Ele aparece para todo usuário novo. Sem dispensar, fica por cima de
   * qualquer página: `getByRole('heading')` só enxerga o dele, e os seletores
   * das outras suítes falham por "element not found".
   *
   * "Pular (Desbloquear Tudo)" em vez de "Começar a Aprender": além de fechar,
   * libera os itens de menu que o desbloqueio progressivo esconderia, e sem
   * eles as suítes não conseguiriam navegar.
   *
   * Precisa ESPERAR: o modal só renderiza depois que a consulta de gamificação
   * resolve. Um isVisible() imediato retorna false e o modal segue lá.
   *
   * E é preciso esperar o TOAST, não bastava o modal sumir: `handleSkip` faz
   * `setOpen(false)` na hora e deixa o UPDATE de `profiles` correndo solto
   * (`useSkipGamification`). Salvar o `storageState` e fechar o contexto nesse
   * intervalo cancela a requisição — o bypass não persiste, o modal reabre em
   * TODA página da execução e as suítes caem em bloco com "element not found",
   * porque o diálogo tira o resto da árvore de acessibilidade do caminho. Era
   * sorte: às vezes o UPDATE ganhava a corrida, às vezes não. O toast só sai
   * depois que o banco confirma.
   */
  const pular = page.getByRole('button', { name: /pular/i });
  const modalApareceu = await pular
    .waitFor({ state: 'visible', timeout: 15000 })
    .then(() => true)
    .catch(() => false);

  if (modalApareceu) {
    await pular.click();
    await expect(page.getByText(/funcionalidades foram desbloqueadas/i)).toBeVisible({
      timeout: 15000,
    });
  }

  return { email, password };
}

/**
 * Sufixa um nome com um token único desta execução.
 *
 * Os specs compartilham UM usuário e UM banco — inclusive entre projetos: o CI
 * roda `--project=chromium --project="Mobile Chrome"`, e os dois consomem o
 * mesmo `storageState`. Sem o sufixo, a segunda passagem reencontra o registro
 * que a primeira deixou e `card(...).first()` resolve para o velho: o teste de
 * toggle achava "Pausado" onde esperava "Ativo", e só no Mobile Chrome.
 *
 * Vale também para rodar duas vezes seguidas sem recriar o banco local.
 */
export function uniqueLabel(base: string): string {
  return `${base} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
