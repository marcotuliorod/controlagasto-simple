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
 */

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
 */
const TRANSACTION_RE =
  /(\d{2}\/\d{2}\/\d{2,4})\s+(.+?)\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s*([DC])?(?=\s|$)/g;

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

function toAmount(raw: string): number | null {
  const value = Number.parseFloat(raw.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Extrai transações de texto puro de extrato. Devolve lista vazia quando o
 * layout não é reconhecido — nesse caso o chamador deve cair para a IA.
 */
export function parseStatementText(text: string): ParseTextResult {
  const transactions: RawTransaction[] = [];
  let unparsedCount = 0;

  // A regex é global e stateful; recriar evita lastIndex vazando entre chamadas.
  const re = new RegExp(TRANSACTION_RE.source, TRANSACTION_RE.flags);

  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const [, rawDate, rawDescription, rawAmount, indicator] = match;
    if (!rawDate || !rawDescription || !rawAmount) continue;

    const description = rawDescription.trim().replace(/\s+/g, " ");
    const date = toIsoDate(rawDate);
    const amount = toAmount(rawAmount);

    if (!date || !amount || !description) {
      unparsedCount++;
      continue;
    }
    if (NOT_A_TRANSACTION.test(description)) continue;

    transactions.push({
      date,
      description,
      amount,
      indicator: indicator === "D" || indicator === "C" ? indicator : null,
    });
  }

  return { transactions, unparsedCount };
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
