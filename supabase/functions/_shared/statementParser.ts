/**
 * Parser determinístico de extrato brasileiro em texto.
 *
 * Motivação (Fase 4): hoje todo PDF de extrato vai inteiro para o modelo —
 * titular, agência, conta, CPF, saldo e limite — quando o que se quer são as
 * transações. A maioria dos extratos segue um padrão fechado o bastante para
 * ser lido por regra, sem IA nenhuma: sem custo, sem latência de rede e sem
 * mandar dado pessoal para fora.
 *
 * A IA continua existindo como fallback para layouts que a regra não pega.
 *
 * Detalhe que moldou o desenho: a extração de texto de PDF costuma achatar as
 * quebras de linha, entregando tudo numa linha só. Por isso o parser NÃO é
 * baseado em linha — ele ancora na data, que marca o início de cada transação.
 *
 * `pdfText.ts` hoje reconstrói as linhas pela posição dos itens, então o texto
 * normalmente chega quebrado. A âncora na data continua: é o que mantém o
 * parser funcionando com extração de terceiros que achate tudo de novo. O que
 * mudou é que uma transação nunca atravessa uma quebra de linha quando ela
 * existe — sem isso, o valor de um lançamento emenda na descrição do seguinte.
 */

import { matchStatementLayout } from "./statementLayouts.ts";

export interface RawTransaction {
  date: string;
  description: string;
  amount: number;
  /** 'D' débito, 'C' crédito. null quando o extrato não marca. */
  indicator: "D" | "C" | null;
}

export interface ParseTextResult {
  transactions: RawTransaction[];
  /** Trechos com cara de transação que a regra não conseguiu ler. */
  unparsedCount: number;
}

/**
 * Data (DD/MM/AAAA ou DD/MM/AA) + descrição + valor no formato brasileiro +
 * indicador D/C opcional.
 *
 * A descrição é não-gulosa e o valor exige vírgula decimal com 2 casas, para
 * a descrição não engolir a próxima transação quando o texto vem achatado.
 *
 * Os separadores são espaço horizontal (`[^\S\n]`), nunca `\s`: `\s` inclui a
 * quebra de linha, o que deixava a data de uma linha casar com o valor da
 * outra e engolir tudo no meio como descrição.
 *
 * O sinal negativo é capturado à parte. Muitos extratos marcam o débito com
 * `-` em vez do indicador `D`, e sem esta captura o valor `-96,05` não casava
 * (o dígito não vem precedido de espaço): a regex seguia procurando e emendava
 * os lançamentos seguintes na descrição.
 */
const TRANSACTION_RE =
  /(\d{2}\/\d{2}\/\d{2,4})[^\S\n]+(.+?)[^\S\n]+(-)?(\d{1,3}(?:\.\d{3})*,\d{2})[^\S\n]*([DC])?(?=\s|$)/g;

/** Linha com cara de lançamento: tem data e tem valor com centavos. */
const LOOKS_LIKE_TRANSACTION = /\d{2}\/\d{2}\/\d{2,4}/;
const LOOKS_LIKE_AMOUNT = /\d{1,3}(?:\.\d{3})*,\d{2}/;

/** Linhas que não são transação, mesmo tendo data e valor. */
const NOT_A_TRANSACTION =
  /^(saldo|total|subtotal|limite|extrato|periodo|per[íi]odo|fatura|vencimento|pagamento m[íi]nimo)\b/i;

function toIsoDate(raw: string): string | null {
  const [d, m, y] = raw.split("/");
  if (!d || !m || !y) return null;
  const year = y.length === 2 ? `20${y}` : y;
  const month = Number(m);
  const day = Number(d);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  // Rejeita 31/02 e afins.
  const date = new Date(Date.UTC(Number(year), month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

/** `1.234,56` → `1234.56`. Exportada para os leitores de layout. */
export function toAmount(raw: string): number | null {
  const value = Number.parseFloat(raw.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Ponto de entrada da leitura determinística.
 *
 * Tenta primeiro os leitores de layout conhecido (`statementLayouts.ts`), que
 * lidam com formatos que a regra genérica não alcança — data que se propaga por
 * várias linhas, data sem ano, sinal herdado de cabeçalho de seção. Sem
 * casamento de assinatura, cai na regra genérica de sempre.
 *
 * Um leitor de layout que casa a assinatura mas não devolve transação nenhuma
 * não bloqueia a genérica: pode ser um documento do banco certo num formato
 * diferente do previsto.
 */
export function parseStatement(text: string): ParseTextResult {
  const matched = matchStatementLayout(text);
  if (matched && matched.result.transactions.length > 0) return matched.result;
  return parseStatementText(text);
}

/**
 * Extrai transações de texto puro de extrato. Devolve lista vazia quando o
 * layout não é reconhecido — nesse caso o chamador deve cair para a IA.
 */
export function parseStatementText(text: string): ParseTextResult {
  const transactions: RawTransaction[] = [];
  let unparsedCount = 0;

  // Percorre linha a linha. Texto achatado é só o caso de uma linha só, então
  // isto não muda o comportamento com extração que não preserva quebras.
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;

    const parsed = parseLine(line);
    transactions.push(...parsed.transactions);
    unparsedCount += parsed.unparsedCount;

    // Linha que parece lançamento, não rendeu transação e não foi descartada
    // de propósito (saldo, total...): sinal de layout que a regra não conhece.
    // Sem isto, um extrato lido pela metade passava por confiável.
    if (
      parsed.transactions.length === 0 &&
      !parsed.deliberatelySkipped &&
      LOOKS_LIKE_TRANSACTION.test(line) &&
      LOOKS_LIKE_AMOUNT.test(line)
    ) {
      unparsedCount++;
    }
  }

  return { transactions, unparsedCount };
}

interface ParseLineResult extends ParseTextResult {
  /** true quando a linha casou mas foi ignorada por ser saldo, total etc. */
  deliberatelySkipped: boolean;
}

function parseLine(line: string): ParseLineResult {
  const transactions: RawTransaction[] = [];
  let unparsedCount = 0;
  let deliberatelySkipped = false;

  // A regex é global e stateful; recriar evita lastIndex vazando entre chamadas.
  const re = new RegExp(TRANSACTION_RE.source, TRANSACTION_RE.flags);

  let match: RegExpExecArray | null;
  while ((match = re.exec(line)) !== null) {
    const [, rawDate, rawDescription, sign, rawAmount, indicator] = match;
    if (!rawDate || !rawDescription || !rawAmount) continue;

    const description = rawDescription.trim().replace(/\s+/g, " ");
    const date = toIsoDate(rawDate);
    const amount = toAmount(rawAmount);

    if (!date || !amount || !description) {
      unparsedCount++;
      continue;
    }
    if (NOT_A_TRANSACTION.test(description)) {
      deliberatelySkipped = true;
      continue;
    }

    transactions.push({
      date,
      description,
      amount,
      // O indicador explícito manda; o sinal negativo é o que sobra quando o
      // extrato não usa D/C, que é o formato mais comum em conta corrente.
      indicator:
        indicator === "D" || indicator === "C" ? indicator : sign === "-" ? "D" : null,
    });
  }

  return { transactions, unparsedCount, deliberatelySkipped };
}

/**
 * Decide se o resultado determinístico é bom o bastante para dispensar a IA.
 *
 * Conservador de propósito: na dúvida, cai para a IA. Um extrato lido pela
 * metade é pior que um extrato lido pelo modelo, porque o usuário não tem como
 * perceber o que faltou.
 */
export function isReliable(result: ParseTextResult): boolean {
  if (result.transactions.length === 0) return false;
  // Muitos trechos ilegíveis em relação ao que foi lido indica layout diferente.
  return result.unparsedCount <= result.transactions.length * 0.2;
}
