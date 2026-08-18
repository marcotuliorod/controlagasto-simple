/**
 * Detecção de colunas de CSV de extrato.
 *
 * Estava dentro de `process-import-file/index.ts`, onde não havia como testar:
 * o arquivo tem 1000+ linhas e abre com `serve()`. Saiu para cá junto com a
 * correção do bug abaixo, seguindo o mesmo caminho de `statementParser.ts`.
 *
 * O mapa devolvido é `campo -> índice da coluna`, e índice 0 é um valor
 * legítimo — é a primeira coluna do arquivo, que em extrato brasileiro é quase
 * sempre a data. Toda checagem de "esse campo foi detectado?" precisa comparar
 * com `undefined`; `!mapping.date` trata a coluna 0 como ausente e foi
 * exatamente esse o bug que estas funções corrigem.
 */

export interface ColumnMapping {
  date?: number;
  description?: number;
  amount?: number;
  type?: number;
  balance?: number;
}

/** Campos sem os quais não há como ler uma transação da linha. */
const REQUIRED_FIELDS = ["date", "description", "amount"] as const;

export const COLUMN_PATTERNS: Record<string, string[]> = {
  date: ['data', 'date', 'data lançamento', 'data lancamento', 'dt. lançamento', 'dt lancamento', 'data movimento', 'data transação', 'data transacao'],
  description: ['descrição', 'descricao', 'description', 'histórico', 'historico', 'memo', 'lançamento', 'lancamento', 'detalhe', 'estabelecimento', 'nome'],
  amount: ['valor', 'amount', 'value', 'quantia', 'montante', 'total'],
  type: ['tipo', 'type', 'natureza', 'débito/crédito', 'debito/credito', 'd/c'],
  balance: ['saldo', 'balance', 'saldo final'],
};

/**
 * Casa cada campo com a primeira coluna cujo cabeçalho bate com um dos padrões.
 *
 * "Primeira" importa: vários extratos têm mais de uma coluna casando com o
 * mesmo campo (`Valor` e `Total`, `Data` e `Data Movimento`). A anterior é a
 * boa — a segunda costuma ser total consolidado ou data de processamento.
 * A checagem era `!mapping[field]`, então um campo já mapeado na coluna 0 era
 * sobrescrito pela coluna seguinte que casasse.
 */
export function autoDetectMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};

  headers.forEach((header, index) => {
    const normalizedHeader = header.toLowerCase().trim();

    for (const [field, patterns] of Object.entries(COLUMN_PATTERNS)) {
      if (patterns.some(p => normalizedHeader.includes(p))) {
        if (!(field in mapping)) {
          (mapping as Record<string, number>)[field] = index;
        }
      }
    }
  });

  return mapping;
}

/**
 * Se o usuário precisa mapear as colunas à mão.
 *
 * `type` e `balance` são opcionais: o parser deduz débito/crédito pelo sinal do
 * valor quando não há coluna de tipo, e saldo não vira transação.
 */
export function needsColumnMapping(mapping: ColumnMapping): boolean {
  return REQUIRED_FIELDS.some(field => mapping[field] === undefined);
}
