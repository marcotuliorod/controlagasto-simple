/**
 * Prompt de extração de extrato bancário / fatura de cartão.
 *
 * Derivado de supabase/functions/process-import-file/index.ts (L446-478).
 * As regras de classificação brasileiras foram preservadas na íntegra — elas
 * carregam conhecimento de domínio real (repasse de FPE/FPM/ICMS, D/C em
 * extrato, fatura de cartão sendo sempre débito) que não deve se perder na
 * migração.
 *
 * O que saiu: o desenho do JSON no meio do texto e o "retorne APENAS um JSON
 * válido" — com responseSchema o formato é imposto pelo provedor.
 */

export const STATEMENT_SYSTEM_PROMPT = `Você é um especialista em extrair transações de extratos bancários e faturas de cartão brasileiros.

INSTRUÇÕES CRÍTICAS:
1. Extraia TODAS as transações financeiras (compras, pagamentos, débitos, depósitos, transferências)
2. IGNORE linhas de saldo (saldo anterior, saldo final, etc.)
3. IGNORE subtotais e totalizadores
4. Datas no formato YYYY-MM-DD
5. Valores como números positivos (sem R$, ponto como decimal)
6. Identifique corretamente o tipo: "debit" (saída) ou "credit" (entrada)
7. Para faturas de cartão de crédito: todas são "debit"
8. Para extratos: D = debit (saída), C = credit (entrada)

CLASSIFICAÇÃO DE TRANSAÇÕES:
- Investimentos (Aplicação/Resgate Fundos, CDB, Poupança) → type: "investment"
- Transferências enviadas → type: "debit" (serão revisadas)
- Transferências recebidas → type: "credit"
- Pagamentos diversos, saques, tarifas → type: "debit"
- Repasses governamentais (FPE, FPM, ICMS) → ignorar

Se não identificar transações, devolva uma lista vazia.`;

export const STATEMENT_USER_PROMPT =
  "Extraia todas as transações deste extrato/fatura bancária.";

/**
 * Usado quando o texto já foi extraído localmente e redigido (caminho da
 * Fase 4). Deixa explícito que marcadores como [CPF] são redações, para o
 * modelo não tentar "recuperar" o dado.
 */
export const STATEMENT_TEXT_USER_PROMPT =
  "Extraia todas as transações do texto de extrato abaixo. " +
  "Marcadores como [CPF], [CONTA] e [CARTAO] são dados removidos por privacidade — " +
  "ignore-os, não tente inferir seus valores.\n\n";

export const STATEMENT_SCHEMA = {
  type: "object",
  properties: {
    transactions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: { type: "string", description: "YYYY-MM-DD" },
          description: { type: "string" },
          amount: { type: "number" },
          type: { type: "string", enum: ["debit", "credit", "investment"] },
          documentNumber: { type: "string", nullable: true },
        },
        required: ["date", "description", "amount", "type"],
      },
    },
  },
  required: ["transactions"],
} as const;
