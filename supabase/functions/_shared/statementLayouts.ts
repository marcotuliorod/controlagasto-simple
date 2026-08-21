/**
 * Leitores de layout específico de banco.
 *
 * A regra genérica de `statementParser.ts` ancora numa data `DD/MM/AAAA` e lê
 * cada transação de forma independente. Isso cobre boa parte dos extratos
 * brasileiros, mas não cobre os do Nubank, que precisam de leitura **com
 * estado**: no extrato de conta a data aparece uma vez por dia e vale para
 * todas as linhas seguintes (inclusive atravessando a quebra de página), e o
 * sinal vem de um cabeçalho `Total de entradas`/`Total de saídas`. Na fatura a
 * data não traz o ano.
 *
 * Afrouxar a regex genérica para dar conta disso corromperia os outros bancos
 * — uma data que se propaga por linhas erradas gera transação fantasma. Por
 * isso cada layout é um leitor próprio, escolhido por assinatura do documento.
 *
 * Cada leitor é uma função pura `(text) => ParseTextResult`. Quem não casa com
 * nenhuma assinatura cai na regra genérica, que continua intacta.
 */

import { toAmount } from "./statementParser.ts";
import type { ParseTextResult, RawTransaction } from "./statementParser.ts";

/** Abreviações de mês em português, na ordem, como o Nubank imprime. */
const MONTHS = [
  "JAN",
  "FEV",
  "MAR",
  "ABR",
  "MAI",
  "JUN",
  "JUL",
  "AGO",
  "SET",
  "OUT",
  "NOV",
  "DEZ",
];

const MONTH_SRC = MONTHS.join("|");

/** `JAN` → 1 … `DEZ` → 12. `null` quando não é mês conhecido. */
export function monthFromAbbrev(abbrev: string): number | null {
  const index = MONTHS.indexOf(abbrev.toUpperCase());
  return index === -1 ? null : index + 1;
}

function isoDate(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Compara valores em centavos: somar reais em float acumula erro. */
function cents(value: number): number {
  return Math.round(value * 100);
}

function cleanDescription(raw: string): string {
  return raw
    .trim()
    // Cartão mascarado no início da descrição da fatura (`•••• 0019 Uber`).
    // Não é informação de gasto e atrapalha a classificação por padrão.
    .replace(/^[•·*•·]{2,}\s*\d{4}\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

export interface StatementLayout {
  name: string;
  /** Assinatura do documento. Só o primeiro que casar é usado. */
  matches(text: string): boolean;
  parse(text: string): ParseTextResult;
}

// ---------------------------------------------------------------------------
// Nubank — extrato de conta
// ---------------------------------------------------------------------------

/** `01 JUL 2026 ...` no início da linha define a data corrente. */
const NUCONTA_DATE = new RegExp(`^(\\d{1,2})\\s+(${MONTH_SRC})\\s+(\\d{4})\\b`, "i");

/** `Total de entradas + 20,00` — cabeçalho de grupo, nunca uma transação. */
const NUCONTA_GROUP = /Total de (entradas|sa[íi]das)\s*([+-])?\s*(\d{1,3}(?:\.\d{3})*,\d{2})/i;

/** Valor brasileiro no fim da linha, que é onde o Nubank alinha o valor. */
const NUCONTA_AMOUNT = /(\d{1,3}(?:\.\d{3})*,\d{2})\s*$/;

/** Cabeçalho e rodapé que se repetem a cada página. */
const NUCONTA_NOISE =
  /^(saldo (inicial|final)|rendimento l[íi]quido|extrato gerado|tem alguma d[úu]vida|caso a solu[çc][ãa]o|dispon[íi]veis em nubank|cpf\b|o saldo l[íi]quido|n[ãa]o nos responsabilizamos|asseguramos a autenticidade|cnpj:)/i;

function nuContaMatches(text: string): boolean {
  return (
    /Movimenta[çc][õo]es/i.test(text) && /Nu Pagamentos|Nu Financeira/i.test(text)
  );
}

/**
 * Máquina de estado sobre as linhas.
 *
 * A data corrente atravessa a quebra de página de propósito: o grupo de 03 JUL
 * começa numa página e termina na seguinte, e o cabeçalho repetido no meio não
 * pode resetá-la.
 *
 * Exigir a data corrente já definida é o que protege o bloco-resumo da primeira
 * página (`Saldo inicial 4.617,02`, `Total de entradas +1.259,00`), que vem
 * antes da primeira data e cujos valores não são lançamentos.
 */
function nuContaParse(text: string): ParseTextResult {
  const transactions: RawTransaction[] = [];
  let unparsedCount = 0;

  let currentDate: string | null = null;
  let currentIndicator: "D" | "C" | null = null;

  // O extrato declara o total de cada grupo. Conferir a soma do grupo contra
  // esse total é o que impede uma transação perdida (ou contada duas vezes) de
  // passar por leitura bem-sucedida — que é o modo de falha que o usuário não
  // tem como perceber.
  let groupExpected: number | null = null;
  let groupSum = 0;
  let groupCount = 0;

  const closeGroup = () => {
    if (groupExpected !== null && groupSum !== groupExpected) {
      unparsedCount += Math.max(1, groupCount);
    }
    groupExpected = null;
    groupSum = 0;
    groupCount = 0;
  };

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    const dateMatch = NUCONTA_DATE.exec(line);
    if (dateMatch) {
      const month = monthFromAbbrev(dateMatch[2]);
      const date = month
        ? isoDate(Number(dateMatch[3]), month, Number(dateMatch[1]))
        : null;
      if (date) {
        closeGroup();
        currentDate = date;
        currentIndicator = null;
      }
      // Segue para a checagem de grupo: a linha da data já traz o cabeçalho
      // `Total de entradas + 20,00` do primeiro grupo do dia.
    }

    const groupMatch = NUCONTA_GROUP.exec(line);
    if (groupMatch) {
      if (!dateMatch) closeGroup();
      currentIndicator = /entradas/i.test(groupMatch[1]) ? "C" : "D";
      const total = toAmount(groupMatch[3]);
      groupExpected = total === null ? null : cents(total);
      groupSum = 0;
      groupCount = 0;
      // Totalizador: descartado. Sem isto cada dia entraria em dobro.
      continue;
    }

    if (!currentDate) continue;
    if (NUCONTA_NOISE.test(line)) continue;

    const amountMatch = NUCONTA_AMOUNT.exec(line);
    if (!amountMatch) continue; // linha de continuação (agência, conta, CNPJ)

    const amount = toAmount(amountMatch[1]);
    const description = cleanDescription(line.slice(0, amountMatch.index));
    if (amount === null || !description) {
      unparsedCount++;
      continue;
    }

    transactions.push({
      date: currentDate,
      description,
      amount,
      indicator: currentIndicator,
    });
    groupSum += cents(amount);
    groupCount++;
  }

  closeGroup();

  return { transactions, unparsedCount };
}

// ---------------------------------------------------------------------------
// Nubank — fatura de cartão
// ---------------------------------------------------------------------------

/**
 * `26 JUN •••• 0019 Supermercados Bh R$ 15,48`
 *
 * O `^` é essencial: sem ele, `Total de compras de todos os cartões, 26 JUN a
 * 27 JUL R$ 6.166,34` (página de resumo) viraria transação. O `$` no fim é a
 * outra metade da defesa — as páginas de simulação de parcelamento estão
 * cheias de valores em reais que não são lançamentos.
 *
 * O sinal aceita `−` (U+2212), que é o que a fatura usa em
 * `Pagamento em 30 JUN −R$ 4.575,66` — não é hífen ASCII.
 */
const NUFATURA_TX = new RegExp(
  `^(\\d{1,2})\\s+(${MONTH_SRC})\\s+(.+?)\\s*([-−–])?\\s*R\\$\\s*(\\d{1,3}(?:\\.\\d{3})*,\\d{2})\\s*$`,
  "i",
);

/** Linha que começa com data mas não virou transação: sinal de layout mudado. */
const NUFATURA_ANCHOR = new RegExp(`^\\d{1,2}\\s+(${MONTH_SRC})\\s`, "i");

/** `FATURA 03 AGO 2026` — a única data da fatura que traz o ano. */
const NUFATURA_HEADER = new RegExp(
  `FATURA\\s+(\\d{1,2})\\s+(${MONTH_SRC})\\s+(\\d{4})`,
  "i",
);

function nuFaturaMatches(text: string): boolean {
  return /TRANSA[ÇC][ÕO]ES DE/i.test(text) && /Nu Pagamentos/i.test(text);
}

/**
 * A fatura imprime `26 JUN`, sem ano. O ano sai do vencimento no cabeçalho:
 * lançamento com mês **maior** que o do vencimento é do ano anterior.
 *
 * É o que resolve a fatura que atravessa o réveillon — vence 03 JAN 2027 e tem
 * compras de 26 DEZ, que são de 2026.
 */
function inferYear(month: number, dueMonth: number, dueYear: number): number {
  return month > dueMonth ? dueYear - 1 : dueYear;
}

function nuFaturaParse(text: string): ParseTextResult {
  const transactions: RawTransaction[] = [];
  let unparsedCount = 0;

  const header = NUFATURA_HEADER.exec(text);
  const dueMonth = header ? monthFromAbbrev(header[2]) : null;
  const dueYear = header ? Number(header[3]) : null;
  // Sem o ano de referência não dá para datar lançamento nenhum. Devolver vazio
  // faz o chamador cair para a IA, que é o comportamento certo aqui.
  if (!dueMonth || !dueYear) return { transactions, unparsedCount };

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    if (!NUFATURA_ANCHOR.test(line)) continue;

    const match = NUFATURA_TX.exec(line);
    if (!match) {
      unparsedCount++;
      continue;
    }

    const [, rawDay, rawMonth, rawDescription, sign, rawAmount] = match;
    const month = monthFromAbbrev(rawMonth);
    const date = month
      ? isoDate(inferYear(month, dueMonth, dueYear), month, Number(rawDay))
      : null;
    const amount = toAmount(rawAmount);
    const description = cleanDescription(rawDescription);

    if (!date || amount === null || !description) {
      unparsedCount++;
      continue;
    }

    transactions.push({
      date,
      description,
      amount,
      // Valor negativo na fatura é pagamento/estorno, não gasto. Marcado como
      // débito, o classificador criaria uma despesa fantasma do valor da
      // fatura anterior — aqui, R$ 4.575,66.
      indicator: sign ? "C" : "D",
    });
  }

  return { transactions, unparsedCount };
}

// ---------------------------------------------------------------------------

export const STATEMENT_LAYOUTS: StatementLayout[] = [
  { name: "nubank-conta", matches: nuContaMatches, parse: nuContaParse },
  { name: "nubank-fatura", matches: nuFaturaMatches, parse: nuFaturaParse },
];

/**
 * Devolve o resultado do primeiro layout cuja assinatura casa, ou `null` quando
 * nenhum casa — aí o chamador usa a regra genérica.
 */
export function matchStatementLayout(
  text: string,
): { layout: string; result: ParseTextResult } | null {
  for (const layout of STATEMENT_LAYOUTS) {
    if (!layout.matches(text)) continue;
    return { layout: layout.name, result: layout.parse(text) };
  }
  return null;
}
