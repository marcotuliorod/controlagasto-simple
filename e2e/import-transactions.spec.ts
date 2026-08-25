import { test, expect } from '@playwright/test';
import { waitForPageLoad } from './fixtures/test-data';

/**
 * Importação de extrato — a ÚNICA porta de entrada de gasto do app.
 *
 * O lançamento manual saiu; se este fluxo quebrar, não há como registrar
 * despesa nenhuma. Até aqui a suíte não tinha nada cobrindo ele — o comentário
 * em `expense-crud.spec.ts` chegava a afirmar que a criação estava "coberta em
 * import-transactions", o que não era verdade.
 *
 * Escopo deliberado: CSV, que é o caminho **determinístico** — a edge function
 * `process-import-file` lê CSV e OFX por regra e só chama IA para PDF de
 * layout desconhecido. Isso mantém o teste hermético: roda contra o stack
 * Supabase local do CI sem `AI_SERVICE_URL` e sem chave de fornecedor nenhum.
 * Cobrir PDF exigiria o serviço de IA no ar, que é outro tipo de teste.
 */

/** Cabeçalhos que o `autoDetectMapping` reconhece — sem eles o fluxo desviaria
 *  para o passo de mapeamento manual de colunas, que não é o que se testa aqui. */
const CABECALHO = 'Data;Historico;Valor';

/**
 * Token único desta execução, só com letras, usado como PREFIXO do histórico.
 *
 * Três restrições se somam, e cada uma já custou uma falha aqui:
 *
 * 1. chromium e Mobile Chrome dividem um usuário e um banco, então dado de
 *    nome fixo é reencontrado pela segunda passagem — o mesmo motivo que
 *    levou ao `uniqueLabel()` nas outras suítes.
 * 2. O `checkDuplicates()` da edge function casa comerciantes pelos 10
 *    PRIMEIROS caracteres, com data ±1 dia e valor igual. Com o token no fim
 *    ("SUPERMERCADO abc"), a segunda passagem casa em "supermerca" e as três
 *    linhas viram duplicatas: a aba Despesas chega em 0 e o teste quebra só no
 *    segundo projeto. Por isso o token vem na frente.
 * 3. `extractMerchant()` apaga sequências de 5+ dígitos — é assim que ele tira
 *    número de documento do histórico. Um token com dígitos poderia ser
 *    parcialmente comido, e o comerciante salvo deixaria de ser o procurado.
 *    Daí ser só de letras.
 */
function tokenUnico(): string {
  let token = '';
  while (token.length < 12) {
    token += Math.random().toString(36).replace(/[^a-z]/g, '');
  }
  return token.slice(0, 12).toUpperCase();
}

function hojeBR(): string {
  const hoje = new Date();
  const dia = String(hoje.getDate()).padStart(2, '0');
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${hoje.getFullYear()}`;
}

test.describe('Importação de extrato', () => {
  test.use({ storageState: 'artifacts/e2e/.auth/user.json' });

  test('importa um CSV e a despesa aparece na lista', async ({ page }) => {
    const token = tokenUnico();
    const mercado = `${token} PADARIA AÇAÍ`;
    const padaria = `${token} PADARIA`;
    const salario = `${token} SALARIO`;
    const data = hojeBR();

    /*
     * Comerciante com acento de propósito: cobre o bug de encoding já
     * corrigido em `process-import-file/index.ts` (`atob()` sozinho tratava
     * o arquivo como Latin-1, e "ção" chegava como "Ã§Ã£o"). A asserção lá
     * embaixo, que já procurava `mercado` na lista de despesas, passa a
     * provar ponta-a-ponta que o texto acentuado chega correto.
     *
     * Débito vira despesa; o crédito do salário é classificado como receita e
     * auto-excluído, o que dá a contagem 2/1 conferida abaixo.
     */
    const csv = [
      CABECALHO,
      `${data};${mercado};-123,45`,
      `${data};${padaria};-45,90`,
      `${data};${salario};3500,00`,
    ].join('\n');

    await page.goto('/import-transactions');
    await waitForPageLoad(page);

    await expect(page.getByRole('heading', { name: 'Importar Transações' })).toBeVisible();

    /*
     * A conta de destino é preenchida sozinha com a primeira conta do usuário,
     * mas só depois que a consulta resolve. Esperar por isso não é zelo: o
     * `accountId` vazio vira `account_id` inválido no INSERT e a importação
     * falharia no fim, longe da causa.
     */
    const contaDestino = page.getByRole('combobox');
    await expect(contaDestino).not.toContainText('Selecione uma conta', { timeout: 15000 });

    // O input é `hidden` — a zona de upload é uma div clicável. `setInputFiles`
    // não exige visibilidade para input de arquivo.
    await page.locator('input[type="file"]').setInputFiles({
      name: 'extrato-teste.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv, 'utf-8'),
    });

    // Cold start da edge function entra nesta espera.
    await expect(page.getByRole('heading', { name: 'Revisar Transações' })).toBeVisible({
      timeout: 30000,
    });

    // 2 despesas, 1 auto-excluído (o crédito), 0 duplicados.
    await expect(page.getByRole('tab', { name: /Despesas/ })).toContainText('2');
    await expect(page.getByRole('tab', { name: /Excluídos/ })).toContainText('1');
    await expect(page.getByRole('tab', { name: /Duplicados/ })).toContainText('0');

    await page.getByRole('button', { name: 'Continuar para Resumo' }).click();

    await expect(page.getByRole('heading', { name: 'Resumo da Importação' })).toBeVisible();
    /*
     * 123,45 + 45,90 — o salário não entra. Sem "R$": apesar do nome,
     * `formatCurrencyBR()` devolve só o número, sem símbolo.
     *
     * O mesmo valor aparece duas vezes na tela: no cartão "Valor total" e na
     * quebra por categoria, já que as duas despesas caíram em "Sem categoria".
     * O cartão é o único que usa <p>, e é ele que interessa aqui.
     */
    await expect(page.getByRole('paragraph').filter({ hasText: '169,35' })).toBeVisible();

    await page.getByRole('button', { name: /Importar 2 Transações/ }).click();

    // A página navega sozinha para a lista depois da celebração.
    await page.waitForURL('**/expenses', { timeout: 15000 });
    await waitForPageLoad(page);

    /*
     * A lista é virtualizada e o usuário acumula despesas das outras execuções,
     * então filtrar é o que garante que a linha procurada está renderizada.
     * O comerciante salvo passou pelo `extractMerchant()`, que aplica Title
     * Case — a busca do app compara em minúsculas, então o token basta.
     */
    await page.getByLabel('Buscar despesas').fill(token);

    await expect(page.getByText(new RegExp(mercado, 'i')).first()).toBeVisible({
      timeout: 15000,
    });
    // Ponto decimal, não vírgula: esta tela é a única que formata valor com
    // `toFixed(2)` em vez de `formatCurrencyBR()`. Está errado para pt-BR, mas
    // é o que o app mostra hoje — o teste registra o comportamento real.
    await expect(page.getByText('R$ 123.45').first()).toBeVisible();
  });

  test('recusa arquivo de formato não suportado', async ({ page }) => {
    await page.goto('/import-transactions');
    await waitForPageLoad(page);

    await page.locator('input[type="file"]').setInputFiles({
      name: 'extrato.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('isto nao e um extrato'),
    });

    /*
     * Validação é no cliente: nada sobe, nenhuma edge function é chamada.
     *
     * O filtro não é enfeite: o aviso do gamification ("Dica: comece pelo
     * curso...") também é `role="alert"`, e ele aparece de forma diferente em
     * desktop e mobile. `getByRole('alert')` sozinho ora casa com o aviso
     * errado, ora viola o modo estrito por achar dois. Filtrar mantém a
     * asserção acessível — o erro precisa ser anunciado — sem essa ambiguidade.
     */
    await expect(
      page.getByRole('alert').filter({ hasText: /formato não suportado/i }),
    ).toBeVisible();
  });
});
