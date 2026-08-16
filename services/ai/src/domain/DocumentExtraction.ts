/**
 * Extração de dados de documentos (cupom fiscal e, na Fase 4, extrato).
 *
 * Este arquivo não sabe qual provedor está por trás — recebe um LLMProvider.
 * É o que permite trocar de fornecedor sem tocar em regra de negócio.
 */
import type { LLMProvider } from "../providers/types.ts";
import { AIError } from "../shared/errors.ts";
import { withRetry, withTimeout } from "../shared/resilience.ts";
import {
  RECEIPT_SCHEMA,
  RECEIPT_SYSTEM_PROMPT,
  RECEIPT_USER_PROMPT,
} from "../prompts/receipt.ts";
import { parseAmount, parseDate, parseText } from "./normalize.ts";

export interface ReceiptItem {
  name: string;
  value: number | null;
}

export interface ReceiptData {
  amount: number | null;
  date: string | null;
  merchant: string | null;
  cnpj: string | null;
  items: ReceiptItem[];
}

export interface BinaryInput {
  mimeType: string;
  /** base64 puro, sem o prefixo `data:`. */
  data: string;
}

export interface DocumentExtraction {
  extractReceipt(input: BinaryInput, signal?: AbortSignal): Promise<ReceiptData>;
}

const RECEIPT_TIMEOUT_MS = 60_000;

/** Aceita só o que faz sentido fotografar como cupom. */
const SUPPORTED_RECEIPT_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export function createDocumentExtraction(provider: LLMProvider): DocumentExtraction {
  return {
    async extractReceipt(input, signal): Promise<ReceiptData> {
      if (!SUPPORTED_RECEIPT_TYPES.includes(input.mimeType)) {
        throw new AIError("unsupported", `mime type não suportado: ${input.mimeType}`);
      }

      const isPdf = input.mimeType === "application/pdf";
      const needed = isPdf ? "document" : "vision";
      if (!provider.supports(needed)) {
        throw new AIError("unsupported", `provider ${provider.name} não suporta ${needed}`);
      }

      const result = await withRetry(
        () =>
          withTimeout(
            RECEIPT_TIMEOUT_MS,
            (timeoutSignal) =>
              provider.complete({
                system: RECEIPT_SYSTEM_PROMPT,
                messages: [
                  {
                    role: "user",
                    parts: [
                      { type: "text", text: RECEIPT_USER_PROMPT },
                      isPdf
                        ? { type: "document", mimeType: input.mimeType, data: input.data }
                        : { type: "image", mimeType: input.mimeType, data: input.data },
                    ],
                  },
                ],
                schema: provider.supports("structuredOutput")
                  ? (RECEIPT_SCHEMA as unknown as Record<string, unknown>)
                  : undefined,
                signal: timeoutSignal,
              }),
            signal,
          ),
        { signal },
      );

      return normalizeReceipt(result.parsed ?? safeParse(result.text));
    },
  };
}

/** Fallback para adapters sem structured output nativo. */
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
 * Converte a saída crua do modelo no tipo do domínio. Toda a coerção é
 * determinística — o modelo pode devolver "R$ 1.234,56" ou "15/01/2024" e o
 * resultado é sempre número e ISO.
 */
function normalizeReceipt(raw: unknown): ReceiptData {
  const source = (raw ?? {}) as Record<string, unknown>;
  const rawItems = Array.isArray(source["items"]) ? source["items"] : [];

  return {
    amount: parseAmount(source["amount"]),
    date: parseDate(source["date"]),
    merchant: parseText(source["merchant"]),
    cnpj: parseText(source["cnpj"]),
    items: rawItems
      .map((item): ReceiptItem | null => {
        const entry = (item ?? {}) as Record<string, unknown>;
        const name = parseText(entry["name"]);
        return name ? { name, value: parseAmount(entry["value"]) } : null;
      })
      .filter((item): item is ReceiptItem => item !== null)
      .slice(0, 3),
  };
}
