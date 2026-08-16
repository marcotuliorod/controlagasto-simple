/**
 * Prompt de extração de cupom fiscal.
 *
 * Derivado do system prompt de supabase/functions/process-receipt/index.ts.
 * As instruções "retorne APENAS o JSON, sem explicações" e o desenho do JSON
 * no texto saíram: com responseSchema o formato é imposto pelo provedor, não
 * pedido em linguagem natural.
 */

export const RECEIPT_SYSTEM_PROMPT = `Você é um especialista em extrair informações de cupons fiscais brasileiros.

Analise a imagem do cupom e extraia:
- o valor TOTAL da compra (não o subtotal, não o troco)
- a data da compra
- o nome do estabelecimento
- o CNPJ do estabelecimento, quando visível
- até 3 itens principais comprados

Use null em qualquer campo que não estiver claro ou visível na imagem.
Não invente valores que você não consegue ler.`;

export const RECEIPT_USER_PROMPT = "Extraia as informações deste cupom fiscal.";

/**
 * Schema no subconjunto OpenAPI aceito pelo Gemini em responseSchema
 * (type/properties/items/nullable/required). Evita palavras-chave de JSON
 * Schema que o provedor rejeita, como oneOf ou additionalProperties.
 */
export const RECEIPT_SCHEMA = {
  type: "object",
  properties: {
    amount: { type: "number", nullable: true },
    date: { type: "string", nullable: true, description: "YYYY-MM-DD" },
    merchant: { type: "string", nullable: true },
    cnpj: { type: "string", nullable: true },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          value: { type: "number", nullable: true },
        },
        required: ["name"],
      },
    },
  },
  required: ["amount", "date", "merchant", "cnpj", "items"],
} as const;
