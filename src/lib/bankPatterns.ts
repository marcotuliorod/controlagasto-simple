// Bank detection and transaction classification patterns for Brazilian bank statements

export interface BankInfo {
  name: string;
  code: string;
  displayName: string;
  patterns: RegExp[];
}

export const SUPPORTED_BANKS: BankInfo[] = [
  {
    name: 'banco_do_brasil',
    code: '001',
    displayName: 'Banco do Brasil',
    patterns: [/banco\s*do\s*brasil/i, /\bB\.?B\b/i, /BB\s*S\.?A/i]
  },
  {
    name: 'itau',
    code: '341',
    displayName: 'Itaú',
    patterns: [/ita[uú]/i, /itauunibanco/i]
  },
  {
    name: 'bradesco',
    code: '237',
    displayName: 'Bradesco',
    patterns: [/bradesco/i]
  },
  {
    name: 'nubank',
    code: '260',
    displayName: 'Nubank',
    patterns: [/nubank/i, /nu\s*pagamentos/i]
  },
  {
    name: 'caixa',
    code: '104',
    displayName: 'Caixa Econômica Federal',
    patterns: [/caixa\s*econ[ôo]mica/i, /\bcef\b/i, /caixa\s*federal/i]
  },
  {
    name: 'santander',
    code: '033',
    displayName: 'Santander',
    patterns: [/santander/i]
  },
  {
    name: 'inter',
    code: '077',
    displayName: 'Banco Inter',
    patterns: [/banco\s*inter/i, /\binter\b/i]
  },
  {
    name: 'c6',
    code: '336',
    displayName: 'C6 Bank',
    patterns: [/c6\s*bank/i, /\bc6\b/i]
  }
];

export type TransactionClassification = 
  | 'expense'      // Despesa real - IMPORTAR
  | 'income'       // Receita - NÃO IMPORTAR
  | 'investment'   // Aplicação/Resgate - NÃO IMPORTAR
  | 'transfer'     // Transferência - REVISAR
  | 'government'   // Repasse governamental - NÃO IMPORTAR
  | 'ignore';      // Saldo, total - NÃO IMPORTAR

// Patterns that should be AUTO-EXCLUDED
export const AUTO_EXCLUDE_PATTERNS = {
  investment: [
    /apl\.?\s*bb\s*fundos/i,
    /resg\.?\s*bb\s*fundos/i,
    /aplica[çc][ãa]o\s*(cdb|lci|lca|tesouro|fundos)/i,
    /resgate\s*(cdb|lci|lca|tesouro|fundos)/i,
    /poupan[çc]a\s*(aplica|resgate|dep[óo]sito)/i,
    /cdb\s*(aplica|resgate)/i,
    /fundos?\s*(exclusivo|investimento|renda)/i,
    /tesouro\s*direto/i,
  ],
  government: [
    /repasse/i,
    /fpe\/fpm/i,
    /fpe\s*\/?\s*fpm/i,
    /deb\.?\s*distribui[çc][ãa]o/i,
    /distribui[çc][ãa]o\s*estadual/i,
    /icms.*recebimento/i,
    /recebimento\s*de\s*icms/i,
    /sispag\s*sal[áa]rios/i,
  ],
  income: [
    /transfer[êe]ncia\s+recebida/i,
    /trfctu\s*recebida/i,
    /cr[ée]dito\s+(sal[áa]rio|rend|prov)/i,
    /dep[óo]sito\s+(recebido|cheque|dinheiro)/i,
    /pix\s+recebido/i,
    /ted\s+recebido/i,
    /doc\s+recebido/i,
  ],
  ignore: [
    /saldo\s*(anterior|final|em\s*c\/c|inicial)/i,
    /^s\s*a\s*l\s*d\s*o$/i,
    /total\s*(geral|mensal|di[áa]rio)/i,
    /subtotal/i,
    /encargos?\s*rotat/i,
    /encargos?\s*financ/i,
    /iof\s*(complementar|adicional)$/i,
  ],
};

// Patterns that should be AUTO-INCLUDED as expenses
export const EXPENSE_PATTERNS = [
  /pagamentos?\s*diversos/i,
  /saque\s+(sem\s+cart[ãa]o|atm|terminal)/i,
  /tarifa\s*(banc[áa]ria|mensal|pacote|servi[çc]o)/i,
  /deb\s*aut/i,
  /d[ée]bito\s*autom[áa]tico/i,
  /compra\s+cart[ãa]o/i,
  /compra\s+(d[ée]bito|cr[ée]dito)/i,
  /pag\s+(boleto|titulo|conta)/i,
  /pagamento\s+(de\s+)?(conta|boleto|titulo)/i,
];

// Patterns that indicate TRANSFERS (needs review)
export const TRANSFER_PATTERNS = [
  /transfer[êe]ncia\s*(enviada)?/i,
  /\+?\s*transfer[êe]ncia/i,
  /trfctu/i,
  /trf\s+entre\s+contas/i,
  /ted\s+(enviado|efetuado)/i,
  /doc\s+(enviado|efetuado)/i,
  /pix\s+(enviado|efetuado|transferido)/i,
];

/**
 * Detect bank from PDF/statement content
 */
export function detectBank(content: string): BankInfo | null {
  for (const bank of SUPPORTED_BANKS) {
    if (bank.patterns.some(p => p.test(content))) {
      return bank;
    }
  }
  return null;
}

/**
 * Classify a transaction based on description and type
 */
export function classifyTransaction(
  description: string,
  type: 'debit' | 'credit',
  amount?: number
): TransactionClassification {
  const desc = description.toLowerCase();
  
  // 1. Always ignore balance lines
  if (AUTO_EXCLUDE_PATTERNS.ignore.some(p => p.test(description))) {
    return 'ignore';
  }
  
  // 2. Investments (can be debit or credit)
  if (AUTO_EXCLUDE_PATTERNS.investment.some(p => p.test(description))) {
    return 'investment';
  }
  
  // 3. Government operations
  if (AUTO_EXCLUDE_PATTERNS.government.some(p => p.test(description))) {
    return 'government';
  }
  
  // 4. Explicit income patterns
  if (AUTO_EXCLUDE_PATTERNS.income.some(p => p.test(description))) {
    return 'income';
  }
  
  // 5. Credits are generally income (not expenses)
  if (type === 'credit') {
    return 'income';
  }
  
  // 6. Check for transfer patterns (needs review)
  if (TRANSFER_PATTERNS.some(p => p.test(description))) {
    return 'transfer';
  }
  
  // 7. Check for explicit expense patterns
  if (EXPENSE_PATTERNS.some(p => p.test(description))) {
    return 'expense';
  }
  
  // 8. Default: if it's a debit, probably an expense
  if (type === 'debit') {
    return 'expense';
  }
  
  return 'ignore';
}

/**
 * Get classification display info
 */
export function getClassificationInfo(classification: TransactionClassification): {
  label: string;
  icon: string;
  color: string;
  description: string;
} {
  switch (classification) {
    case 'expense':
      return {
        label: 'Despesa',
        icon: '💸',
        color: 'green',
        description: 'Será importado como despesa'
      };
    case 'income':
      return {
        label: 'Receita',
        icon: '💰',
        color: 'blue',
        description: 'Receita - não será importado'
      };
    case 'investment':
      return {
        label: 'Investimento',
        icon: '📈',
        color: 'purple',
        description: 'Operação de investimento'
      };
    case 'transfer':
      return {
        label: 'Transferência',
        icon: '🔄',
        color: 'yellow',
        description: 'Pode ser despesa ou movimentação interna'
      };
    case 'government':
      return {
        label: 'Governo',
        icon: '🏛️',
        color: 'gray',
        description: 'Operação governamental'
      };
    case 'ignore':
      return {
        label: 'Ignorar',
        icon: '⏭️',
        color: 'gray',
        description: 'Saldo ou totalizador'
      };
  }
}

/**
 * Extract clean merchant name from bank description
 */
export function extractMerchantName(description: string): string {
  if (!description) return '';
  
  let merchant = description;
  
  // 1. Remove common prefixes
  merchant = merchant
    .replace(/^\+?\s*transfer[êe]ncia\s*(enviada|recebida)?/i, '')
    .replace(/^pagamentos?\s*diversos/i, '')
    .replace(/^sispag\s*/i, '')
    .replace(/^deb\s*aut\s*/i, '')
    .replace(/^compra\s+(cart[ãa]o|d[ée]bito|cr[ée]dito)\s*/i, '')
    .replace(/^pix\s*(enviado|recebido)?\s*/i, '')
    .replace(/^ted\s*(enviado|recebido)?\s*/i, '')
    .replace(/^doc\s*(enviado|recebido)?\s*/i, '');
  
  // 2. Remove dates (DD/MM or DD/MM/YYYY)
  merchant = merchant.replace(/\d{1,2}\/\d{1,2}(\/\d{2,4})?/g, '');
  
  // 3. Remove document/account numbers
  merchant = merchant
    .replace(/\d{3,}\s*[-.]?\s*\d*/g, '')
    .replace(/[A-Z]{2,}\s+\d+/g, '');
  
  // 4. Normalize asterisks (UBER *TRIP → UBER TRIP)
  merchant = merchant.replace(/\*/g, ' ');
  
  // 5. Take first significant part (before common separators)
  const parts = merchant.split(/[-/|]/);
  if (parts.length > 1) {
    merchant = parts[0];
  }
  
  // 6. Clean up whitespace and limit length
  merchant = merchant.replace(/\s+/g, ' ').trim().substring(0, 50);
  
  // 7. Title case
  if (merchant.length > 0) {
    merchant = merchant
      .split(' ')
      .filter(w => w.length > 0)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }
  
  return merchant || description.substring(0, 50).trim();
}
