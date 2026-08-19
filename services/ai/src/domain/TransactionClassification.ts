/**
 * Extração de transações de extrato bancário / fatura de cartão.
 *
 * Duas entradas de propósito:
 *  - `fromDocument`: manda o PDF ao modelo. É a paridade com o comportamento
 *    atual, e a maior exposição de dado pessoal do app inteiro (o PDF leva
 *    titular, agência, conta, CPF, saldo e limite, quando o que se quer são
 *    as transações).
 *  - `fromText`: recebe texto já extraído localmente e redigido. É o caminho
 *    que a Fase 4 vai tornar padrão, deixando a IA só para o caso em que o
 *    layout do banco não é reconhecido.
 *
 * As duas existem desde já para que a Fase 4 seja uma troca de chamador, e
 * não uma reescrita desta camada.
 */
import type { LLMProvider } from "../providers/types.ts";
import { AIError } from "../shared/errors.ts";
import { withRetry, withTimeout } from "../shared/resilience.ts";
import { redact, type RedactionKind } from "../shared/redaction.ts";
import {
  STATEMENT_SCHEMA,
  STATEMENT_SYSTEM_PROMPT,
  STATEMENT_TEXT_USER_PROMPT,
  STATEMENT_USER_PROMPT,
} from "../prompts/statement.ts";
import { parseAmount, parseDate, parseText } from "./normalize.ts";

/**
 * Documento binário enviado ao modelo. Morava em DocumentExtraction.ts, que
 * saiu junto com o OCR de cupom; extrato/fatura é o único documento que o
 * serviço ainda recebe.
 */
export interface BinaryInput {
  mimeType: string;
  /** base64 puro, sem o prefixo `data:`. */
  data: string;
}

export type TransactionType = "debit" | "credit" | "investment";

export interface StatementTransaction {
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
  documentNumber: string | null;
}

export interface StatementResult {
  transactions: StatementTransaction[];
  /** Quantas linhas o modelo devolveu mas foram descartadas por inválidas. */
  discarded: number;
  /** Tipos de PII removidos antes do envio (só no caminho de texto). */
  redacted: Partial<Record<RedactionKind, number>>;
}

export interface TransactionClassification {
  fromDocument(input: BinaryInput, signal?: AbortSignal): Promise<StatementResult>;
  fromText(text: string, signal?: AbortSignal): Promise<StatementResult>;
}

/** Extratos são maiores e mais lentos que cupons. */
const STATEMENT_TIMEOUT_MS = 120_000;
const MAX_OUTPUT_TOKENS = 16_000;
/** Baixa, porque extração deve ser reprodutível — mesmo valor do código antigo. */
const TEMPERATURE = 0.1;

const VALID_TYPES: TransactionType[] = ["debit", "credit", "investment"];

export function createTransactionClassification(
  provider: LLMProvider,
): TransactionClassification {
  async function run(
    userParts: Parameters<LLMProvider["complete"]>[0]["messages"][number]["parts"],
    signal?: AbortSignal,
  ) {
    return withRetry(
      () =>
        withTimeout(
          STATEMENT_TIMEOUT_MS,
          (timeoutSignal) =>
            provider.complete({
              system: STATEMENT_SYSTEM_PROMPT,
              messages: [{ role: "user", parts: userParts }],
              schema: provider.supports("structuredOutput")
                ? (STATEMENT_SCHEMA as unknown as Record<string, unknown>)
                : undefined,
              temperature: TEMPERATURE,
              maxOutputTokens: MAX_OUTPUT_TOKENS,
              signal: timeoutSignal,
            }),
          signal,
        ),
      { signal },
    );
  }

  return {
    async fromDocument(input, signal): Promise<StatementResult> {
      if (input.mimeType !== "application/pdf") {
        throw new AIError("unsupported", `extrato precisa ser PDF, recebido: ${input.mimeType}`);
      }
      if (!provider.supports("document")) {
        throw new AIError("unsupported", `provider ${provider.name} não lê documentos`);
      }

      const result = await run(
        [
          { type: "text", text: STATEMENT_USER_PROMPT },
          { type: "document", mimeType: input.mimeType, data: input.data },
        ],
        signal,
      );

      return { ...normalizeStatement(result.parsed ?? safeParse(result.text)), redacted: {} };
    },

    async fromText(text, signal): Promise<StatementResult> {
      const trimmed = text.trim();
      if (!trimmed) throw new AIError("unsupported", "texto de extrato vazio");

      // Minimização antes de sair do servidor.
      const { text: safeText, removed } = redact(trimmed);

      const result = await run(
        [{ type: "text", text: STATEMENT_TEXT_USER_PROMPT + safeText }],
        signal,
      );

      return { ...normalizeStatement(result.parsed ?? safeParse(result.text)), redacted: removed };
    },
  };
}

function safeParse(text: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  const candidate = (fenced?.[1] ?? text).trim();
  try {
    return JSON.parse(candidate);
  } catch (error) {
    throw new AIError("invalid_response", "resposta não é JSON", { cause: error });
  }
}

/**
 * Descarta linhas inválidas em vez de deixá-las virar despesa errada.
 * Uma transação sem data válida ou sem valor positivo não é aproveitável, e
 * é preferível perdê-la a inserir lixo no extrato do usuário.
 */
function normalizeStatement(raw: unknown): Omit<StatementResult, "redacted"> {
  const source = (raw ?? {}) as Record<string, unknown>;
  const rows = Array.isArray(source["transactions"]) ? source["transactions"] : [];

  const transactions: StatementTransaction[] = [];
  let discarded = 0;

  for (const row of rows) {
    const entry = (row ?? {}) as Record<string, unknown>;
    const date = parseDate(entry["date"]);
    const amount = parseAmount(entry["amount"]);
    const description = parseText(entry["description"]);
    const rawType = parseText(entry["type"]);
    const type = VALID_TYPES.includes(rawType as TransactionType)
      ? (rawType as TransactionType)
      : "debit";

    if (!date || !description || amount === null || amount <= 0) {
      discarded++;
      continue;
    }

    transactions.push({
      date,
      description,
      amount,
      type,
      documentNumber: parseText(entry["documentNumber"]),
    });
  }

  return { transactions, discarded };
}
