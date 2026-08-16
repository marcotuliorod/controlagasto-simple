import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AIServiceError, callAIService } from '../_shared/aiService.ts';
import { extractPdfText } from '../_shared/pdfText.ts';
import { isReliable, parseStatementText } from '../_shared/statementParser.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// =============================================================================
// BANK DETECTION AND CLASSIFICATION
// =============================================================================

interface BankInfo {
  name: string;
  code: string;
  displayName: string;
  patterns: RegExp[];
}

interface UserCategory {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

interface ExistingExpense {
  id: string;
  date: string;
  amount: number;
  merchant: string | null;
}

const SUPPORTED_BANKS: BankInfo[] = [
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
    patterns: [/caixa\s*econ[ôo]mica/i, /\bcef\b/i]
  },
  {
    name: 'santander',
    code: '033',
    displayName: 'Santander',
    patterns: [/santander/i]
  }
];

type TransactionClassification = 'expense' | 'income' | 'investment' | 'transfer' | 'government' | 'ignore';

// Patterns for auto-exclusion
const AUTO_EXCLUDE_PATTERNS = {
  investment: [
    /apl\.?\s*bb\s*fundos/i,
    /resg\.?\s*bb\s*fundos/i,
    /aplica[çc][ãa]o\s*(cdb|lci|lca|tesouro|fundos)/i,
    /resgate\s*(cdb|lci|lca|tesouro|fundos)/i,
    /poupan[çc]a\s*(aplica|resgate)/i,
    /fundos?\s*(exclusivo|investimento)/i,
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
    /cr[ée]dito\s+(sal[áa]rio|rend)/i,
    /dep[óo]sito\s+(recebido|cheque)/i,
    /pix\s+recebido/i,
    /ted\s+recebido/i,
  ],
  ignore: [
    /saldo\s*(anterior|final|em\s*c\/c|inicial)/i,
    /^s\s*a\s*l\s*d\s*o$/i,
    /total\s*(geral|mensal)/i,
    /subtotal/i,
  ],
};

// Patterns for transfers that need review
const TRANSFER_PATTERNS = [
  /transfer[êe]ncia\s*(enviada)?/i,
  /\+?\s*transfer[êe]ncia/i,
  /trfctu/i,
  /ted\s+(enviado|efetuado)/i,
  /pix\s+(enviado|efetuado)/i,
];

// Patterns for definite expenses
const EXPENSE_PATTERNS = [
  /pagamentos?\s*diversos/i,
  /saque\s+(sem\s+cart[ãa]o|atm)/i,
  /tarifa\s*(banc[áa]ria|mensal)/i,
  /deb\s*aut/i,
  /compra\s+cart[ãa]o/i,
  /pag\s+(boleto|titulo|conta)/i,
];

function detectBank(content: string): BankInfo | null {
  for (const bank of SUPPORTED_BANKS) {
    if (bank.patterns.some(p => p.test(content))) {
      return bank;
    }
  }
  return null;
}

function classifyTransaction(
  description: string,
  type: 'debit' | 'credit'
): TransactionClassification {
  // 1. Always ignore balance lines
  if (AUTO_EXCLUDE_PATTERNS.ignore.some(p => p.test(description))) {
    return 'ignore';
  }
  
  // 2. Investments
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
  
  // 5. Credits are generally income
  if (type === 'credit') {
    return 'income';
  }
  
  // 6. Check for transfer patterns (needs review)
  if (TRANSFER_PATTERNS.some(p => p.test(description))) {
    return 'transfer';
  }
  
  // 7. Explicit expense patterns
  if (EXPENSE_PATTERNS.some(p => p.test(description))) {
    return 'expense';
  }
  
  // 8. Default: if debit, probably expense
  if (type === 'debit') {
    return 'expense';
  }
  
  return 'ignore';
}

// =============================================================================
// COLUMN PATTERNS AND CATEGORY KEYWORDS
// =============================================================================

const COLUMN_PATTERNS: Record<string, string[]> = {
  date: ['data', 'date', 'data lançamento', 'data lancamento', 'dt. lançamento', 'dt lancamento', 'data movimento', 'data transação', 'data transacao'],
  description: ['descrição', 'descricao', 'description', 'histórico', 'historico', 'memo', 'lançamento', 'lancamento', 'detalhe', 'estabelecimento', 'nome'],
  amount: ['valor', 'amount', 'value', 'quantia', 'montante', 'total'],
  type: ['tipo', 'type', 'natureza', 'débito/crédito', 'debito/credito', 'd/c'],
  balance: ['saldo', 'balance', 'saldo final'],
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Alimentação': ['ifood', 'uber eats', 'rappi', 'restaurante', 'lanchonete', 'padaria', 'supermercado', 'mercado', 'açougue', 'hortifruti', 'pizza', 'burger', 'mcdonald', 'subway', 'starbucks', 'café', 'bar', 'pub'],
  'Transporte': ['uber', '99', 'cabify', 'lyft', 'taxi', 'posto', 'combustivel', 'combustível', 'estacionamento', 'pedágio', 'pedagio', 'onibus', 'ônibus', 'metro', 'metrô', 'trem', 'bike', 'patinete'],
  'Moradia': ['aluguel', 'condomínio', 'condominio', 'iptu', 'luz', 'energia', 'enel', 'cpfl', 'cemig', 'celesc', 'água', 'agua', 'sabesp', 'compesa', 'gás', 'gas', 'comgas', 'internet', 'vivo', 'claro', 'tim', 'oi', 'net'],
  'Saúde': ['farmacia', 'farmácia', 'drogaria', 'hospital', 'clinica', 'clínica', 'médico', 'medico', 'consulta', 'exame', 'laboratorio', 'laboratório', 'dentista', 'psicólogo', 'psicologo', 'fisioterapia', 'academia', 'gym'],
  'Educação': ['escola', 'faculdade', 'universidade', 'curso', 'udemy', 'coursera', 'alura', 'livro', 'livraria', 'papelaria', 'material escolar'],
  'Lazer': ['cinema', 'teatro', 'show', 'ingresso', 'netflix', 'spotify', 'amazon prime', 'disney', 'hbo', 'globoplay', 'youtube', 'twitch', 'steam', 'playstation', 'xbox', 'nintendo', 'jogo', 'game'],
  'Compras': ['amazon', 'mercado livre', 'magalu', 'magazine luiza', 'americanas', 'shopee', 'aliexpress', 'shein', 'renner', 'c&a', 'riachuelo', 'zara', 'h&m', 'nike', 'adidas'],
  'Serviços': ['assinatura', 'mensalidade', 'anuidade', 'seguro', 'banco', 'tarifa', 'iof', 'juros'],
};

// =============================================================================
// INTERFACES
// =============================================================================

interface ParsedTransaction {
  date: string;
  description: string;
  merchant: string;
  amount: number;
  type: 'debit' | 'credit';
  balance?: number;
  suggestedCategory?: {
    id: string | null;
    name: string;
    confidence: 'high' | 'medium' | 'low';
  };
  isDuplicate: boolean;
  duplicateReason?: string;
  originalRow?: number;
  classification?: TransactionClassification;
  originalDescription?: string;
  documentNumber?: string;
}

// Shape the AI response is expected to match — enforced by the runtime
// guards around each use site below, since it's untrusted model output.
interface RawAITransaction {
  date: string;
  description: string;
  amount: number | string;
  type?: string;
  documentNumber?: string;
}

interface ImportResult {
  transactions: ParsedTransaction[];
  totalCount: number;
  duplicatesCount: number;
  excludedCount: number;
  reviewCount: number;
  columns?: string[];
  previewRows?: string[][];
  needsMapping: boolean;
  detectedBank?: BankInfo | null;
}

// =============================================================================
// PARSING FUNCTIONS
// =============================================================================

function parseCSV(content: string): { headers: string[]; rows: string[][] } {
  const lines = content.trim().split(/\r?\n/);
  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header and one data row');
  }

  const firstLine = lines[0];
  let delimiter = ',';
  if (firstLine.includes(';') && !firstLine.includes(',')) {
    delimiter = ';';
  } else if (firstLine.includes('\t') && !firstLine.includes(',') && !firstLine.includes(';')) {
    delimiter = '\t';
  }

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]).map(h => h.toLowerCase().replace(/['"]/g, ''));
  const rows = lines.slice(1).map(parseRow).filter(row => row.some(cell => cell.trim()));

  return { headers, rows };
}

function autoDetectMapping(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {};

  headers.forEach((header, index) => {
    const normalizedHeader = header.toLowerCase().trim();
    
    for (const [field, patterns] of Object.entries(COLUMN_PATTERNS)) {
      if (patterns.some(p => normalizedHeader.includes(p))) {
        if (!mapping[field]) {
          mapping[field] = index;
        }
      }
    }
  });

  return mapping;
}

function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;

  // Try DD/MM/YYYY or DD-MM-YYYY
  let match = dateStr.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Try YYYY-MM-DD or YYYY/MM/DD
  match = dateStr.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (match) {
    const [, year, month, day] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Try DD/MM/YY
  match = dateStr.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2})/);
  if (match) {
    const [, day, month, yearShort] = match;
    const year = parseInt(yearShort) > 50 ? `19${yearShort}` : `20${yearShort}`;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return null;
}

function parseAmount(amountStr: string): number | null {
  if (!amountStr) return null;

  let cleaned = amountStr.replace(/[R$\s]/gi, '').trim();
  
  const isNegative = cleaned.startsWith('(') && cleaned.endsWith(')') || cleaned.startsWith('-');
  cleaned = cleaned.replace(/[()]/g, '').replace(/^-/, '');

  // Brazilian format: 1.234,56
  if (cleaned.includes(',') && cleaned.includes('.')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',') && !cleaned.includes('.')) {
    const parts = cleaned.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      cleaned = cleaned.replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  }

  const amount = parseFloat(cleaned);
  if (isNaN(amount)) return null;

  return isNegative ? -Math.abs(amount) : Math.abs(amount);
}

function parseOFX(content: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const stmttrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match;
  let rowNum = 0;

  while ((match = stmttrnRegex.exec(content)) !== null) {
    rowNum++;
    const block = match[1];

    const getTag = (tag: string): string => {
      const tagMatch = block.match(new RegExp(`<${tag}>([^<\\n]+)`, 'i'));
      return tagMatch ? tagMatch[1].trim() : '';
    };

    const dateStr = getTag('DTPOSTED');
    const amount = parseFloat(getTag('TRNAMT')) || 0;
    const name = getTag('NAME');
    const memo = getTag('MEMO');
    const description = memo || name;

    let formattedDate = '';
    if (dateStr.length >= 8) {
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      formattedDate = `${year}-${month}-${day}`;
    }

    if (formattedDate && amount !== 0) {
      const txType = amount < 0 ? 'debit' : 'credit';
      const classification = classifyTransaction(description, txType);
      
      transactions.push({
        date: formattedDate,
        description,
        merchant: name || extractMerchant(description),
        amount: Math.abs(amount),
        type: txType,
        isDuplicate: false,
        originalRow: rowNum,
        classification,
        originalDescription: description,
      });
    }
  }

  return transactions;
}

// =============================================================================
// PDF PARSING WITH AI
// =============================================================================

/**
 * Fluxo de PDF em camadas (Fase 4). A ordem importa: cada degrau só existe
 * porque o anterior não deu conta.
 *
 *  1. Extrai o texto localmente. Nada sai do servidor.
 *  2. Tenta ler as transações por regra determinística. Se der certo, NENHUMA
 *     chamada de IA acontece — sem custo, sem latência de rede e sem enviar
 *     titular, conta ou CPF para fora.
 *  3. Se a regra não reconhecer o layout, manda o TEXTO para a IA, e o serviço
 *     redige o que é dado pessoal antes de chamar o modelo.
 *  4. Só se não houver camada de texto (PDF escaneado) o arquivo inteiro vai
 *     para a IA com visão — que é o único caminho possível nesse caso.
 */
async function parsePDF(
  pdfBase64: string,
  userCategories: UserCategory[],
  historicalMerchants: Record<string, string>,
  userToken: string
): Promise<{ transactions: ParsedTransaction[]; error?: string; detectedBank?: BankInfo | null; usedAI: boolean }> {
  let extracted: Awaited<ReturnType<typeof extractPdfText>> | null = null;
  try {
    extracted = await extractPdfText(pdfBase64);
    console.log(`PDF: ${extracted.pages} página(s), ${extracted.text.length} chars, camada de texto: ${extracted.hasTextLayer}`);
  } catch (error) {
    // Falha na extração não é fatal: ainda dá para tentar a IA.
    console.warn("Falha ao extrair texto do PDF, caindo para IA:", error);
  }

  if (extracted?.hasTextLayer) {
    const parsed = parseStatementText(extracted.text);
    const detectedBank = detectBank(extracted.text);

    if (isReliable(parsed)) {
      console.log(`Extrato lido localmente: ${parsed.transactions.length} transações, sem chamar IA`);
      const transactions = parsed.transactions.map((tx, index) =>
        toParsedTransaction(
          {
            date: tx.date,
            description: tx.description,
            amount: tx.amount,
            // Sem indicador explícito, débito é o padrão — é o caso comum em
            // fatura de cartão, onde tudo é saída.
            type: tx.indicator === "C" ? "credit" : "debit",
            documentNumber: null,
          },
          index + 1,
          userCategories,
          historicalMerchants
        )
      );
      return { transactions, detectedBank, usedAI: false };
    }

    console.log(
      `Regra determinística não reconheceu o layout (${parsed.transactions.length} lidas, ` +
      `${parsed.unparsedCount} ilegíveis). Enviando texto redigido à IA.`
    );
    const viaText = await parseStatementViaAI(
      { text: extracted.text },
      userCategories,
      historicalMerchants,
      userToken
    );
    return { ...viaText, detectedBank: viaText.detectedBank ?? detectedBank, usedAI: true };
  }

  console.log("PDF sem camada de texto (provavelmente escaneado). Enviando arquivo à IA.");
  const viaDocument = await parseStatementViaAI(
    { mimeType: "application/pdf", data: pdfBase64 },
    userCategories,
    historicalMerchants,
    userToken
  );
  return { ...viaDocument, usedAI: true };
}

/** Converte a transação crua no formato do app, aplicando a lógica determinística. */
function toParsedTransaction(
  tx: { date: string; description: string; amount: number; type: string; documentNumber: string | null },
  rowNum: number,
  userCategories: UserCategory[],
  historicalMerchants: Record<string, string>
): ParsedTransaction {
  const txType: 'debit' | 'credit' = tx.type === 'credit' || tx.type === 'investment' ? 'credit' : 'debit';
  const classification = tx.type === 'investment'
    ? 'investment' as TransactionClassification
    : classifyTransaction(tx.description, txType);

  const merchant = extractMerchant(tx.description);

  return {
    date: tx.date,
    description: tx.description,
    merchant,
    amount: Math.abs(tx.amount),
    type: txType,
    suggestedCategory: suggestCategory(tx.description, merchant, userCategories, historicalMerchants),
    isDuplicate: false,
    originalRow: rowNum,
    classification,
    originalDescription: tx.description,
    documentNumber: tx.documentNumber ?? undefined,
  };
}

async function parseStatementViaAI(
  payload: { text: string } | { mimeType: string; data: string },
  userCategories: UserCategory[],
  historicalMerchants: Record<string, string>,
  userToken: string
): Promise<{ transactions: ParsedTransaction[]; error?: string; detectedBank?: BankInfo | null }> {
  try {
    // A extração roda no serviço de IA (services/ai). Some daqui: o PDF
    // disfarçado de image_url (hack do gateway antigo), o parsing defensivo em
    // três níveis e a validação de data/valor — o serviço já devolve
    // transações validadas e normalizadas, descartando as inaproveitáveis.
    //
    // O que fica: classificação, extração de comerciante e sugestão de
    // categoria, que são determinísticas e dependem dos dados do usuário.
    const aiResult = await callAIService<{
      transactions: Array<{
        date: string;
        description: string;
        amount: number;
        type: "debit" | "credit" | "investment";
        documentNumber: string | null;
      }>;
      discarded: number;
    }>("/v1/statement", payload, userToken);

    const parsed = aiResult;

    if (aiResult.discarded > 0) {
      console.warn(`Serviço de IA descartou ${aiResult.discarded} linha(s) inválida(s)`);
    }

    // detectBank rodava sobre o texto cru do modelo, que não existe mais.
    // As descrições concatenadas carregam os mesmos marcadores de banco.
    const detectedBank = detectBank(
      aiResult.transactions.map((t) => t.description).join("\n"),
    );
    console.log("Detected bank:", detectedBank?.displayName || "None");

    console.log(`AI extracted ${parsed.transactions.length} transactions`);

    // Convert to ParsedTransaction format with classification
    const transactions: ParsedTransaction[] = [];
    let rowNum = 0;

    for (const tx of parsed.transactions) {
      rowNum++;
      
      if (!tx.date || !tx.description || tx.amount === undefined) {
        console.warn(`Skipping invalid transaction at row ${rowNum}:`, tx);
        continue;
      }

      const dateMatch = String(tx.date).match(/(\d{4})-(\d{2})-(\d{2})/);
      if (!dateMatch) {
        console.warn(`Invalid date format at row ${rowNum}:`, tx.date);
        continue;
      }

      const amount = typeof tx.amount === 'number' ? tx.amount : parseFloat(String(tx.amount).replace(',', '.'));
      if (isNaN(amount) || amount <= 0) {
        console.warn(`Invalid amount at row ${rowNum}:`, tx.amount);
        continue;
      }

      const txType: 'debit' | 'credit' = tx.type === 'credit' || tx.type === 'investment' ? 'credit' : 'debit';
      const classification = tx.type === 'investment' 
        ? 'investment' as TransactionClassification
        : classifyTransaction(tx.description, txType);
      
      const merchant = extractMerchant(tx.description);
      const suggestedCategory = suggestCategory(tx.description, merchant, userCategories, historicalMerchants);

      transactions.push({
        date: tx.date,
        description: tx.description,
        merchant,
        amount: Math.abs(amount),
        type: txType,
        suggestedCategory,
        isDuplicate: false,
        originalRow: rowNum,
        classification,
        originalDescription: tx.description,
        // O serviço usa null para "ausente"; ParsedTransaction usa undefined.
        documentNumber: tx.documentNumber ?? undefined,
      });
    }

    console.log(`Returning ${transactions.length} valid transactions`);
    return { transactions, detectedBank };

  } catch (error) {
    console.error("Error in parseStatementViaAI:", error);

    if (error instanceof AIServiceError) {
      return { transactions: [], error: error.publicMessage };
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return { transactions: [], error: "Timeout ao processar PDF. O arquivo pode ser muito grande." };
      }
      return { transactions: [], error: `Erro ao processar PDF: ${error.message}` };
    }
    
    return { transactions: [], error: "Não foi possível processar o PDF. Tente exportar em formato CSV." };
  }
}

// =============================================================================
// MERCHANT AND CATEGORY HELPERS
// =============================================================================

function extractMerchant(description: string): string {
  if (!description) return '';
  
  let merchant = description
    // Remove common prefixes
    .replace(/^\+?\s*transfer[êe]ncia\s*(enviada|recebida)?/i, '')
    .replace(/^pagamentos?\s*diversos/i, '')
    .replace(/^sispag\s*/i, '')
    .replace(/^deb\s*aut\s*/i, '')
    .replace(/^compra\s+(cart[ãa]o|d[ée]bito|cr[ée]dito)\s*/i, '')
    .replace(/^pix\s*(enviado|recebido)?\s*/i, '')
    .replace(/^ted\s*(enviado|recebido)?\s*/i, '')
    .replace(/^doc\s*(enviado|recebido)?\s*/i, '')
    // Remove dates
    .replace(/\d{1,2}\/\d{1,2}(\/\d{2,4})?/g, '')
    // Remove document numbers
    .replace(/\d{5,}/g, '')
    // Normalize asterisks
    .replace(/\*+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Take first part before common separators
  const separators = [' - ', ' / ', ' | ', '  '];
  for (const sep of separators) {
    if (merchant.includes(sep)) {
      merchant = merchant.split(sep)[0].trim();
    }
  }

  // Limit length and title case
  merchant = merchant.substring(0, 50).trim();
  
  if (merchant.length > 0) {
    merchant = merchant
      .split(' ')
      .filter(w => w.length > 0)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  return merchant || description.substring(0, 50).trim();
}

function suggestCategory(
  description: string,
  merchant: string,
  userCategories: UserCategory[],
  historicalMerchants: Record<string, string>
): { id: string | null; name: string; confidence: 'high' | 'medium' | 'low' } {
  const searchText = `${description} ${merchant}`.toLowerCase();

  // First, check historical data
  const merchantLower = merchant.toLowerCase();
  if (historicalMerchants[merchantLower]) {
    const catId = historicalMerchants[merchantLower];
    const cat = userCategories.find(c => c.id === catId);
    if (cat) {
      return { id: catId, name: cat.name, confidence: 'high' };
    }
  }

  // Then, check keyword patterns
  for (const [categoryName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => searchText.includes(kw.toLowerCase()))) {
      const cat = userCategories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
      if (cat) {
        return { id: cat.id, name: cat.name, confidence: 'medium' };
      }
      return { id: null, name: categoryName, confidence: 'medium' };
    }
  }

  return { id: null, name: 'Sem categoria', confidence: 'low' };
}

// =============================================================================
// DUPLICATE DETECTION
// =============================================================================

async function checkDuplicates(
  transactions: ParsedTransaction[],
  existingExpenses: ExistingExpense[]
): Promise<ParsedTransaction[]> {
  return transactions.map(tx => {
    const txDate = new Date(tx.date);
    
    const duplicate = existingExpenses.find(exp => {
      const expDate = new Date(exp.date);
      const dayDiff = Math.abs((txDate.getTime() - expDate.getTime()) / (1000 * 60 * 60 * 24));
      const amountMatch = Math.abs(exp.amount - tx.amount) < 0.01;
      const merchantMatch = exp.merchant?.toLowerCase().includes(tx.merchant.toLowerCase().substring(0, 10)) ||
                           tx.merchant.toLowerCase().includes(exp.merchant?.toLowerCase().substring(0, 10) || '');
      
      return dayDiff <= 1 && amountMatch && merchantMatch;
    });

    if (duplicate) {
      return {
        ...tx,
        isDuplicate: true,
        duplicateReason: `Similar: ${duplicate.date} - ${duplicate.merchant}`
      };
    }

    return tx;
  });
}

async function generateFileHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    const body = await req.json();
    const { fileContent, fileType, mapping: customMapping, accountId } = body;

    if (!fileContent || !fileType) {
      throw new Error('Missing required fields: fileContent, fileType');
    }

    console.log(`Processing ${fileType} file for user ${user.id}`);

    const content = atob(fileContent);
    const fileHash = await generateFileHash(content);

    // Check for existing import
    const { data: existingImport } = await supabase
      .from('import_sessions')
      .select('id')
      .eq('user_id', user.id)
      .eq('file_hash', fileHash)
      .eq('status', 'completed')
      .single();

    if (existingImport) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Este arquivo já foi importado anteriormente.',
          alreadyImported: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch user's categories
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name, icon, color')
      .or(`user_id.eq.${user.id},is_default.eq.true`);

    // Fetch existing expenses for duplicate detection
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    const { data: existingExpenses } = await supabase
      .from('expenses')
      .select('id, date, amount, merchant')
      .eq('user_id', user.id)
      .gte('date', threeMonthsAgo.toISOString().slice(0, 10));

    // Build historical merchant mapping
    const { data: historicalData } = await supabase
      .from('expenses')
      .select('merchant, category_id')
      .eq('user_id', user.id)
      .not('category_id', 'is', null)
      .not('merchant', 'is', null)
      .order('created_at', { ascending: false })
      .limit(500);

    const historicalMerchants: Record<string, string> = {};
    historicalData?.forEach(exp => {
      if (exp.merchant && exp.category_id) {
        const key = exp.merchant.toLowerCase();
        if (!historicalMerchants[key]) {
          historicalMerchants[key] = exp.category_id;
        }
      }
    });

    let result: ImportResult;

    if (fileType === 'csv') {
      const { headers, rows } = parseCSV(content);
      const autoMapping = autoDetectMapping(headers);
      const needsMapping = !autoMapping.date || !autoMapping.amount || (!autoMapping.description && !customMapping);
      
      if (needsMapping && !customMapping) {
        return new Response(
          JSON.stringify({
            success: true,
            needsMapping: true,
            columns: headers,
            previewRows: rows.slice(0, 5),
            autoMapping,
            transactions: [],
            totalCount: 0,
            duplicatesCount: 0,
            excludedCount: 0,
            reviewCount: 0,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const mapping = customMapping || autoMapping;
      const transactions: ParsedTransaction[] = [];
      
      rows.forEach((row, index) => {
        const dateStr = row[mapping.date];
        const amountStr = row[mapping.amount];
        const descriptionStr = row[mapping.description] || '';
        const typeStr = mapping.type !== undefined ? row[mapping.type] : '';

        const date = parseDate(dateStr);
        let amount = parseAmount(amountStr);
        
        if (!date || amount === null) return;

        let txType: 'debit' | 'credit' = amount < 0 ? 'debit' : 'credit';
        if (typeStr) {
          const typeLower = typeStr.toLowerCase();
          if (typeLower.includes('déb') || typeLower.includes('deb') || typeLower === 'd') {
            txType = 'debit';
            amount = Math.abs(amount);
          } else if (typeLower.includes('créd') || typeLower.includes('cred') || typeLower === 'c') {
            txType = 'credit';
            amount = Math.abs(amount);
          }
        }

        const classification = classifyTransaction(descriptionStr, txType);
        const merchant = extractMerchant(descriptionStr);
        const suggestedCategory = suggestCategory(descriptionStr, merchant, categories || [], historicalMerchants);

        transactions.push({
          date,
          description: descriptionStr,
          merchant,
          amount: Math.abs(amount),
          type: txType,
          suggestedCategory,
          isDuplicate: false,
          originalRow: index + 2,
          classification,
          originalDescription: descriptionStr,
        });
      });

      const checkedTransactions = await checkDuplicates(transactions, existingExpenses || []);
      const duplicatesCount = checkedTransactions.filter(t => t.isDuplicate).length;
      const excludedCount = checkedTransactions.filter(t => 
        ['investment', 'government', 'income', 'ignore'].includes(t.classification || '')
      ).length;
      const reviewCount = checkedTransactions.filter(t => t.classification === 'transfer').length;

      result = {
        transactions: checkedTransactions,
        totalCount: checkedTransactions.length,
        duplicatesCount,
        excludedCount,
        reviewCount,
        columns: headers,
        needsMapping: false,
        detectedBank: detectBank(content),
      };

    } else if (fileType === 'ofx') {
      const transactions = parseOFX(content);
      
      const processedTransactions = transactions.map(tx => ({
        ...tx,
        suggestedCategory: suggestCategory(tx.description, tx.merchant, categories || [], historicalMerchants)
      }));

      const checkedTransactions = await checkDuplicates(processedTransactions, existingExpenses || []);
      const duplicatesCount = checkedTransactions.filter(t => t.isDuplicate).length;
      const excludedCount = checkedTransactions.filter(t => 
        ['investment', 'government', 'income', 'ignore'].includes(t.classification || '')
      ).length;
      const reviewCount = checkedTransactions.filter(t => t.classification === 'transfer').length;

      result = {
        transactions: checkedTransactions,
        totalCount: checkedTransactions.length,
        duplicatesCount,
        excludedCount,
        reviewCount,
        needsMapping: false,
        detectedBank: detectBank(content),
      };

    } else if (fileType === 'pdf') {
      console.log('Processing PDF file with AI extraction...');
      
      const pdfResult = await parsePDF(fileContent, categories || [], historicalMerchants, token);
      
      if (pdfResult.error) {
        return new Response(
          JSON.stringify({
            success: false,
            error: pdfResult.error,
            pdfNotSupported: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (pdfResult.transactions.length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Não foi possível identificar transações neste PDF. Verifique se é um extrato válido.',
            pdfNoTransactions: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const checkedTransactions = await checkDuplicates(pdfResult.transactions, existingExpenses || []);
      const duplicatesCount = checkedTransactions.filter(t => t.isDuplicate).length;
      const excludedCount = checkedTransactions.filter(t => 
        ['investment', 'government', 'income', 'ignore'].includes(t.classification || '')
      ).length;
      const reviewCount = checkedTransactions.filter(t => t.classification === 'transfer').length;

      result = {
        transactions: checkedTransactions,
        totalCount: checkedTransactions.length,
        duplicatesCount,
        excludedCount,
        reviewCount,
        needsMapping: false,
        detectedBank: pdfResult.detectedBank,
      };

    } else {
      throw new Error(`Formato não suportado: ${fileType}`);
    }

    console.log(`Parsed ${result.totalCount} transactions: ${result.duplicatesCount} duplicates, ${result.excludedCount} excluded, ${result.reviewCount} for review`);

    return new Response(
      JSON.stringify({
        success: true,
        ...result,
        categories: categories || [],
        fileHash
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing import file:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
