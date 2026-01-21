import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Common Brazilian bank CSV patterns
const COLUMN_PATTERNS: Record<string, string[]> = {
  date: ['data', 'date', 'data lançamento', 'data lancamento', 'dt. lançamento', 'dt lancamento', 'data movimento', 'data transação', 'data transacao'],
  description: ['descrição', 'descricao', 'description', 'histórico', 'historico', 'memo', 'lançamento', 'lancamento', 'detalhe', 'estabelecimento', 'nome'],
  amount: ['valor', 'amount', 'value', 'quantia', 'montante', 'total'],
  type: ['tipo', 'type', 'natureza', 'débito/crédito', 'debito/credito', 'd/c'],
  balance: ['saldo', 'balance', 'saldo final'],
};

// Keyword-based category suggestions
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
}

interface ImportResult {
  transactions: ParsedTransaction[];
  totalCount: number;
  duplicatesCount: number;
  columns?: string[];
  previewRows?: string[][];
  needsMapping: boolean;
}

// Parse CSV content
function parseCSV(content: string): { headers: string[]; rows: string[][] } {
  const lines = content.trim().split(/\r?\n/);
  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header and one data row');
  }

  // Detect delimiter (comma, semicolon, or tab)
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

// Auto-detect column mapping
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

// Parse Brazilian date formats
function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;

  // Try DD/MM/YYYY or DD-MM-YYYY
  let match = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Try YYYY-MM-DD or YYYY/MM/DD
  match = dateStr.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (match) {
    const [, year, month, day] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Try DD/MM/YY
  match = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})/);
  if (match) {
    const [, day, month, yearShort] = match;
    const year = parseInt(yearShort) > 50 ? `19${yearShort}` : `20${yearShort}`;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return null;
}

// Parse Brazilian amount formats
function parseAmount(amountStr: string): number | null {
  if (!amountStr) return null;

  // Remove currency symbols and whitespace
  let cleaned = amountStr.replace(/[R$\s]/gi, '').trim();
  
  // Handle parentheses for negative (common in accounting)
  const isNegative = cleaned.startsWith('(') && cleaned.endsWith(')') || cleaned.startsWith('-');
  cleaned = cleaned.replace(/[()]/g, '').replace(/^-/, '');

  // Brazilian format: 1.234,56 -> convert to 1234.56
  if (cleaned.includes(',') && cleaned.includes('.')) {
    // Has both, assume Brazilian format
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',') && !cleaned.includes('.')) {
    // Only comma, check if it's decimal separator
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

// Parse OFX content
function parseOFX(content: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  
  // Find all STMTTRN blocks
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

    // Parse OFX date format YYYYMMDD
    let formattedDate = '';
    if (dateStr.length >= 8) {
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      formattedDate = `${year}-${month}-${day}`;
    }

    if (formattedDate && amount !== 0) {
      transactions.push({
        date: formattedDate,
        description,
        merchant: name || extractMerchant(description),
        amount: Math.abs(amount),
        type: amount < 0 ? 'debit' : 'credit',
        isDuplicate: false,
        originalRow: rowNum,
      });
    }
  }

  return transactions;
}

// Parse PDF using Lovable AI (Gemini 2.5 Flash)
async function parsePDFWithAI(
  pdfBase64: string,
  userCategories: any[],
  historicalMerchants: Record<string, string>
): Promise<{ transactions: ParsedTransaction[]; error?: string }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    console.error("LOVABLE_API_KEY not configured");
    return { transactions: [], error: "Configuração de IA não encontrada. Contate o suporte." };
  }

  console.log("Calling Lovable AI for PDF extraction...");
  console.log("PDF base64 length:", pdfBase64.length);

  const systemPrompt = `Você é um especialista em extrair transações de extratos bancários e faturas de cartão de crédito brasileiros.

Analise o documento PDF e extraia TODAS as transações financeiras em formato JSON.

IMPORTANTE:
- Extraia APENAS transações individuais (compras, pagamentos, débitos, depósitos)
- IGNORE saldos, totais, subtotais, IOF, encargos mensais isolados e informações de cabeçalho
- Datas devem estar no formato YYYY-MM-DD
- Valores devem ser números positivos (sem R$, sem vírgula decimal - use ponto)
- Para faturas de cartão: todas as compras são "debit"
- Para extratos bancários: saídas são "debit", entradas são "credit"
- Se houver parcelas (ex: "2/12"), inclua na descrição

Retorne APENAS um JSON válido no formato:
{
  "transactions": [
    {
      "date": "2024-01-15",
      "description": "SUPERMERCADO CARREFOUR 2/3",
      "amount": 150.50,
      "type": "debit"
    }
  ]
}

Se não conseguir identificar transações, retorne: {"transactions": []}`;

  try {
    // Create AbortController for timeout (90 seconds for large PDFs)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log("Timeout triggered - aborting request");
      controller.abort();
    }, 90000);
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extraia todas as transações deste extrato/fatura bancária:"
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${pdfBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 8000,
        temperature: 0.1
      }),
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      
      if (response.status === 429) {
        return { transactions: [], error: "Limite de requisições atingido. Tente novamente em alguns minutos." };
      }
      if (response.status === 402) {
        return { transactions: [], error: "Créditos de IA esgotados. Entre em contato com o suporte." };
      }
      return { transactions: [], error: "Erro ao processar PDF com IA. Tente exportar em formato CSV." };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    console.log("AI response received, parsing...");
    console.log("AI content preview:", content.substring(0, 500));

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    } else {
      // Try to find raw JSON object
      const rawJsonMatch = content.match(/\{[\s\S]*"transactions"[\s\S]*\}/);
      if (rawJsonMatch) {
        jsonStr = rawJsonMatch[0];
      }
    }

    // Try to parse JSON
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", jsonStr.substring(0, 500));
      return { transactions: [], error: "Não foi possível extrair dados do PDF. Tente um arquivo CSV." };
    }

    if (!parsed.transactions || !Array.isArray(parsed.transactions)) {
      console.error("Invalid response structure:", parsed);
      return { transactions: [] };
    }

    console.log(`AI extracted ${parsed.transactions.length} transactions`);

    // Convert AI response to ParsedTransaction format
    const transactions: ParsedTransaction[] = [];
    let rowNum = 0;

    for (const tx of parsed.transactions) {
      rowNum++;
      
      // Validate required fields
      if (!tx.date || !tx.description || tx.amount === undefined) {
        console.warn(`Skipping invalid transaction at row ${rowNum}:`, tx);
        continue;
      }

      // Parse and validate date
      const dateMatch = String(tx.date).match(/(\d{4})-(\d{2})-(\d{2})/);
      if (!dateMatch) {
        console.warn(`Invalid date format at row ${rowNum}:`, tx.date);
        continue;
      }
      const date = tx.date;

      // Parse amount
      const amount = typeof tx.amount === 'number' ? tx.amount : parseFloat(String(tx.amount).replace(',', '.'));
      if (isNaN(amount) || amount <= 0) {
        console.warn(`Invalid amount at row ${rowNum}:`, tx.amount);
        continue;
      }

      const merchant = extractMerchant(tx.description);
      const suggestedCategory = suggestCategory(tx.description, merchant, userCategories, historicalMerchants);
      const isCredit = tx.type === 'credit';

      transactions.push({
        date,
        description: tx.description,
        merchant,
        amount: Math.abs(amount),
        type: isCredit ? 'credit' : 'debit',
        suggestedCategory,
        isDuplicate: false,
        originalRow: rowNum
      });
    }

    console.log(`Returning ${transactions.length} valid transactions`);
    return { transactions };

  } catch (error) {
    console.error("Error in parsePDFWithAI:", error);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return { transactions: [], error: "Timeout ao processar PDF. O arquivo pode ser muito grande ou complexo." };
      }
      return { transactions: [], error: `Erro ao processar PDF: ${error.message}` };
    }
    
    return { transactions: [], error: "Não foi possível processar o PDF. Tente exportar em formato CSV." };
  }
}

// Extract merchant name from description
function extractMerchant(description: string): string {
  if (!description) return '';
  
  // Common patterns to clean up
  let merchant = description
    .replace(/\*+/g, ' ')
    .replace(/\d{2}\/\d{2}/g, '') // Remove dates like 15/01
    .replace(/\s+/g, ' ')
    .trim();

  // Take first meaningful part (before common separators)
  const separators = [' - ', ' / ', ' | ', '  '];
  for (const sep of separators) {
    if (merchant.includes(sep)) {
      merchant = merchant.split(sep)[0].trim();
    }
  }

  // Limit length
  if (merchant.length > 50) {
    merchant = merchant.substring(0, 50).trim();
  }

  return merchant;
}

// Suggest category based on merchant/description
function suggestCategory(
  description: string,
  merchant: string,
  userCategories: any[],
  historicalMerchants: Record<string, string>
): { id: string | null; name: string; confidence: 'high' | 'medium' | 'low' } {
  const searchText = `${description} ${merchant}`.toLowerCase();

  // First, check historical data (highest confidence)
  const merchantLower = merchant.toLowerCase();
  if (historicalMerchants[merchantLower]) {
    const catId = historicalMerchants[merchantLower];
    const cat = userCategories.find(c => c.id === catId);
    if (cat) {
      return { id: catId, name: cat.name, confidence: 'high' };
    }
  }

  // Then, check keyword patterns (medium confidence)
  for (const [categoryName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => searchText.includes(kw.toLowerCase()))) {
      const cat = userCategories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
      if (cat) {
        return { id: cat.id, name: cat.name, confidence: 'medium' };
      }
      return { id: null, name: categoryName, confidence: 'medium' };
    }
  }

  // Default to uncategorized (low confidence)
  return { id: null, name: 'Sem categoria', confidence: 'low' };
}

// Check for duplicate transactions
async function checkDuplicates(
  transactions: ParsedTransaction[],
  existingExpenses: any[]
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
        duplicateReason: `Despesa similar encontrada: ${duplicate.date} - ${duplicate.merchant} - R$ ${duplicate.amount.toFixed(2)}`
      };
    }

    return tx;
  });
}

// Generate file hash for deduplication
async function generateFileHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

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

    // Decode base64 content
    const content = atob(fileContent);
    const fileHash = await generateFileHash(content);

    // Check if this exact file was already imported
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

    // Fetch user's existing expenses for duplicate detection
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    const { data: existingExpenses } = await supabase
      .from('expenses')
      .select('id, date, amount, merchant')
      .eq('user_id', user.id)
      .gte('date', threeMonthsAgo.toISOString().slice(0, 10));

    // Build historical merchant -> category mapping
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
      
      // Check if mapping is needed
      const autoMapping = autoDetectMapping(headers);
      const needsMapping = !autoMapping.date || !autoMapping.amount || (!autoMapping.description && !customMapping);
      
      if (needsMapping && !customMapping) {
        // Return preview for manual mapping
        return new Response(
          JSON.stringify({
            success: true,
            needsMapping: true,
            columns: headers,
            previewRows: rows.slice(0, 5),
            autoMapping,
            transactions: [],
            totalCount: 0,
            duplicatesCount: 0
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const mapping = customMapping || autoMapping;
      
      // Parse transactions
      const transactions: ParsedTransaction[] = [];
      
      rows.forEach((row, index) => {
        const dateStr = row[mapping.date];
        const amountStr = row[mapping.amount];
        const descriptionStr = row[mapping.description] || '';
        const typeStr = mapping.type !== undefined ? row[mapping.type] : '';

        const date = parseDate(dateStr);
        let amount = parseAmount(amountStr);
        
        if (!date || amount === null) return;

        // Handle debit/credit type
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

        // Skip credits (income) - we only import expenses
        if (txType === 'credit') return;

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
          originalRow: index + 2 // +2 for header row and 1-based index
        });
      });

      const checkedTransactions = await checkDuplicates(transactions, existingExpenses || []);
      const duplicatesCount = checkedTransactions.filter(t => t.isDuplicate).length;

      result = {
        transactions: checkedTransactions,
        totalCount: checkedTransactions.length,
        duplicatesCount,
        columns: headers,
        needsMapping: false
      };

    } else if (fileType === 'ofx') {
      const transactions = parseOFX(content);
      
      // Filter out credits and add category suggestions
      const expenseTransactions = transactions
        .filter(tx => tx.type === 'debit')
        .map(tx => ({
          ...tx,
          suggestedCategory: suggestCategory(tx.description, tx.merchant, categories || [], historicalMerchants)
        }));

      const checkedTransactions = await checkDuplicates(expenseTransactions, existingExpenses || []);
      const duplicatesCount = checkedTransactions.filter(t => t.isDuplicate).length;

      result = {
        transactions: checkedTransactions,
        totalCount: checkedTransactions.length,
        duplicatesCount,
        needsMapping: false
      };

    } else if (fileType === 'pdf') {
      console.log('Processing PDF file with AI extraction...');
      
      const pdfResult = await parsePDFWithAI(fileContent, categories || [], historicalMerchants);
      
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
            error: 'Não foi possível identificar transações neste PDF. Verifique se é um extrato bancário ou fatura válida.',
            pdfNoTransactions: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Filter to only debits (expenses)
      const expenseTransactions = pdfResult.transactions.filter(tx => tx.type === 'debit');
      
      const checkedTransactions = await checkDuplicates(expenseTransactions, existingExpenses || []);
      const duplicatesCount = checkedTransactions.filter(t => t.isDuplicate).length;

      result = {
        transactions: checkedTransactions,
        totalCount: checkedTransactions.length,
        duplicatesCount,
        needsMapping: false
      };

    } else {
      throw new Error(`Formato não suportado: ${fileType}`);
    }

    console.log(`Parsed ${result.totalCount} transactions, ${result.duplicatesCount} duplicates`);

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
